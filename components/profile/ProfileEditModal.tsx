import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { X, User, AtSign, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { UserProfile, profileService } from '@/services/profileService';

interface ProfileEditModalProps {
    visible: boolean;
    onClose: () => void;
    profile: UserProfile;
    onProfileUpdate: (updatedProfile: UserProfile) => void;
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
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profile</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.label}>Display Name</Text>
                        <View style={styles.inputContainer}>
                            <User size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.displayName}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, displayName: value }))}
                                placeholder="Enter display name"
                                maxLength={50}
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Username</Text>
                        <View style={[
                            styles.inputContainer,
                            usernameStatus.available === false && styles.inputError
                        ]}>
                            <AtSign size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.username}
                                onChangeText={handleUsernameChange}
                                placeholder="Enter username"
                                autoCapitalize="none"
                                maxLength={30}
                            />
                            <View style={styles.statusIcon}>
                                {getUsernameIcon()}
                            </View>
                        </View>

                        {usernameStatus.error && (
                            <Text style={styles.errorText}>{usernameStatus.error}</Text>
                        )}

                        {usernameStatus.available === true && formData.username !== profile.username && (
                            <Text style={styles.successText}>Username is available!</Text>
                        )}

                        <Text style={styles.helperText}>
                            Username can only contain letters, numbers, and underscores
                        </Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={[styles.button, styles.cancelButton]}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.button, styles.saveButton]}
                        disabled={loading || usernameStatus.available === false}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    statusIcon: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        marginTop: 8,
        fontWeight: '500',
    },
    successText: {
        fontSize: 14,
        color: '#10B981',
        marginTop: 8,
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    saveButton: {
        backgroundColor: '#8B5CF6',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
