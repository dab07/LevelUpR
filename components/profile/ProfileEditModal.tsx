import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { X, User, AtSign, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { profileService } from '@/services/profileService';
import {User as us} from "@/types";

interface ProfileEditModalProps {
    visible: boolean;
    onClose: () => void;
    profile: us;
    onProfileUpdate: (updatedProfile: us) => void;
}

export default function ProfileEditModal({
                                             visible,
                                             onClose,
                                             profile,
                                             onProfileUpdate
                                         }: ProfileEditModalProps) {
    const [formData, setFormData] = useState({
        username: profile.username,
        displayName: profile.displayName,
    });
    const [loading, setLoading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<{
        checking: boolean;
        available: boolean | null;
        error?: string;
    }>({ checking: false, available: null });

    useEffect(() => {
        if (visible) {
            setFormData({
                username: profile.username,
                displayName: profile.displayName,
            });
            setUsernameStatus({ checking: false, available: null });
        }
    }, [visible, profile]);

    const checkUsernameAvailability = async (username: string) => {
        if (username === profile.username) {
            setUsernameStatus({ checking: false, available: true });
            return;
        }

        if (username.length < 3) {
            setUsernameStatus({
                checking: false,
                available: false,
                error: 'Username must be at least 3 characters'
            });
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameStatus({
                checking: false,
                available: false,
                error: 'Username can only contain letters, numbers, and underscores'
            });
            return;
        }

        setUsernameStatus({ checking: true, available: null });

        try {
            const isAvailable = await profileService.checkUsernameAvailability(username, profile.id);
            setUsernameStatus({
                checking: false,
                available: isAvailable,
                error: isAvailable ? undefined : 'Username is already taken'
            });
        } catch (error) {
            setUsernameStatus({
                checking: false,
                available: false,
                error: 'Error checking username availability'
            });
        }
    };

    const handleUsernameChange = (username: string) => {
        setFormData(prev => ({ ...prev, username }));

        // Debounce username checking
        const timeoutId = setTimeout(() => {
            if (username.trim()) {
                checkUsernameAvailability(username.trim().toLowerCase());
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    };

    const handleSubmit = async () => {
        if (!formData.username.trim() || !formData.displayName.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (usernameStatus.available === false) {
            Alert.alert('Error', usernameStatus.error || 'Username is not available');
            return;
        }

        setLoading(true);
        try {
            const success = await profileService.updateProfile(profile.id, {
                username: formData.username.trim().toLowerCase(),
                displayName: formData.displayName.trim(),
            });

            if (success) {
                const updatedProfile = {
                    ...profile,
                    username: formData.username.trim().toLowerCase(),
                    displayName: formData.displayName.trim(),
                };
                onProfileUpdate(updatedProfile);
                Alert.alert(
                    'Success',
                    'Profile updated successfully!',
                    [{ text: 'OK', onPress: onClose }]
                );
            } else {
                Alert.alert('Error', 'Failed to update profile. Please try again.');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getUsernameIcon = () => {
        if (usernameStatus.checking) {
            return <ActivityIndicator size="small" color="#8B5CF6" />;
        }
        if (usernameStatus.available === true) {
            return <CheckCircle size={20} color="#10B981" />;
        }
        if (usernameStatus.available === false) {
            return <AlertCircle size={20} color="#EF4444" />;
        }
        return null;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-white">
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
                    <TouchableOpacity onPress={onClose} className="p-1">
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">Edit Profile</Text>
                    <View className="w-8" />
                </View>

                <View className="flex-1 p-5">
                    <View className="mb-6">
                        <Text className="text-base font-semibold text-gray-700 mb-2">Display Name</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3 border border-gray-200">
                            <User size={20} color="#6B7280" className="mr-3" />
                            <TextInput
                                className="flex-1 text-base text-gray-900"
                                value={formData.displayName}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, displayName: value }))}
                                placeholder="Enter display name"
                                maxLength={50}
                            />
                        </View>
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-gray-700 mb-2">Username</Text>
                        <View className={`flex-row items-center rounded-lg px-3 py-3 border ${
                            usernameStatus.available === false 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-gray-200 bg-gray-50'
                        }`}>
                            <AtSign size={20} color="#6B7280" className="mr-3" />
                            <TextInput
                                className="flex-1 text-base text-gray-900"
                                value={formData.username}
                                onChangeText={handleUsernameChange}
                                placeholder="Enter username"
                                autoCapitalize="none"
                                maxLength={30}
                            />
                            <View className="w-6 h-6 justify-center items-center">
                                {getUsernameIcon()}
                            </View>
                        </View>

                        {usernameStatus.error && (
                            <Text className="text-sm text-red-500 mt-2 font-medium">{usernameStatus.error}</Text>
                        )}

                        {usernameStatus.available === true && formData.username !== profile.username && (
                            <Text className="text-sm text-green-500 mt-2 font-medium">Username is available!</Text>
                        )}

                        <Text className="text-xs text-gray-500 mt-1">
                            Username can only contain letters, numbers, and underscores
                        </Text>
                    </View>
                </View>

                <View className="flex-row gap-3 p-5 border-t border-gray-200">
                    <TouchableOpacity
                        onPress={onClose}
                        className="flex-1 py-3 rounded-lg items-center bg-gray-100"
                    >
                        <Text className="text-base font-semibold text-gray-500">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        className="flex-1 py-3 rounded-lg items-center bg-purple-500"
                        disabled={loading || usernameStatus.available === false}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text className="text-base font-semibold text-white">Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}


