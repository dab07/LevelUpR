import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Eye, EyeOff, Lock, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { profileService, PasswordUpdateData } from '@/services/profileService';

interface PasswordUpdateModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PasswordUpdateModal({ visible, onClose }: PasswordUpdateModalProps) {
    const [formData, setFormData] = useState<PasswordUpdateData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState<{
        isValid: boolean;
        errors: string[];
    }>({ isValid: false, errors: [] });

    const handlePasswordChange = (field: keyof PasswordUpdateData, value: string) => {
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);

        // Validate new password in real-time
        if (field === 'newPassword') {
            const validation = profileService.validatePassword(value);
            setPasswordValidation(validation);
        }
    };

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async () => {
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!passwordValidation.isValid) {
            Alert.alert('Invalid Password', passwordValidation.errors.join('\n'));
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const result = await profileService.updatePassword(formData);

            if (result.success) {
                Alert.alert(
                    'Success',
                    'Password updated successfully!',
                    [{ text: 'OK', onPress: handleClose }]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to update password');
            }
        } catch (error) {
            console.error('Password update error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });
        setShowPasswords({ current: false, new: false, confirm: false });
        setPasswordValidation({ isValid: false, errors: [] });
        onClose();
    };

    const getPasswordStrengthColor = () => {
        if (!formData.newPassword) return '#E5E7EB';
        if (passwordValidation.errors.length > 3) return '#EF4444';
        if (passwordValidation.errors.length > 1) return '#F59E0B';
        return '#10B981';
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-[#1A1A1A]">
                {/* Header */}
                <LinearGradient
                    colors={['#8A83DA', '#463699']}
                    className="px-5 pt-12 pb-4"
                >
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity onPress={handleClose} className="p-1">
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-white">Update Password</Text>
                        <View className="w-8" />
                    </View>
                </LinearGradient>

                <ScrollView className="flex-1 p-5">
                    {/* Current Password */}
                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-3">Current Password</Text>
                        <View className="bg-[#2A2A2A] rounded-2xl border border-gray-700 flex-row items-center px-4 py-3">
                            <Lock size={20} color="#6B7280" className="mr-3" />
                            <TextInput
                                className="flex-1 text-white text-base"
                                value={formData.currentPassword}
                                onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                                placeholder="Enter current password"
                                placeholderTextColor="#6B7280"
                                secureTextEntry={!showPasswords.current}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => togglePasswordVisibility('current')}
                                className="p-1 ml-2"
                            >
                                {showPasswords.current ? (
                                    <EyeOff size={20} color="#6B7280" />
                                ) : (
                                    <Eye size={20} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* New Password */}
                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-3">New Password</Text>
                        <View className="bg-[#2A2A2A] rounded-2xl border border-gray-700 flex-row items-center px-4 py-3">
                            <Lock size={20} color="#6B7280" className="mr-3" />
                            <TextInput
                                className="flex-1 text-white text-base"
                                value={formData.newPassword}
                                onChangeText={(value) => handlePasswordChange('newPassword', value)}
                                placeholder="Enter new password"
                                placeholderTextColor="#6B7280"
                                secureTextEntry={!showPasswords.new}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => togglePasswordVisibility('new')}
                                className="p-1 ml-2"
                            >
                                {showPasswords.new ? (
                                    <EyeOff size={20} color="#6B7280" />
                                ) : (
                                    <Eye size={20} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {formData.newPassword && (
                            <View className="bg-[#2A2A2A] rounded-2xl border border-gray-700 p-4 mt-3">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-sm font-semibold text-white">Password Strength</Text>
                                    <View
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getPasswordStrengthColor() }}
                                    />
                                </View>

                                <View className="space-y-2">
                                    {[
                                        { text: 'At least 8 characters', check: formData.newPassword.length >= 8 },
                                        { text: 'One lowercase letter', check: /[a-z]/.test(formData.newPassword) },
                                        { text: 'One uppercase letter', check: /[A-Z]/.test(formData.newPassword) },
                                        { text: 'One number', check: /\d/.test(formData.newPassword) },
                                        { text: 'One special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) },
                                    ].map((req, index) => (
                                        <View key={index} className="flex-row items-center">
                                            {req.check ? (
                                                <CheckCircle size={16} color="#10B981" />
                                            ) : (
                                                <AlertCircle size={16} color="#EF4444" />
                                            )}
                                            <Text className={`text-sm font-medium ml-2 ${req.check ? 'text-green-400' : 'text-red-400'}`}>
                                                {req.text}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Confirm Password */}
                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-3">Confirm New Password</Text>
                        <View className="bg-[#2A2A2A] rounded-2xl border border-gray-700 flex-row items-center px-4 py-3">
                            <Lock size={20} color="#6B7280" className="mr-3" />
                            <TextInput
                                className="flex-1 text-white text-base"
                                value={formData.confirmPassword}
                                onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                                placeholder="Confirm new password"
                                placeholderTextColor="#6B7280"
                                secureTextEntry={!showPasswords.confirm}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => togglePasswordVisibility('confirm')}
                                className="p-1 ml-2"
                            >
                                {showPasswords.confirm ? (
                                    <EyeOff size={20} color="#6B7280" />
                                ) : (
                                    <Eye size={20} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                            <Text className="text-red-400 text-sm font-medium mt-2">Passwords do not match</Text>
                        )}
                    </View>
                </ScrollView>

                {/* Footer */}
                <View className="p-5 border-t border-gray-700">
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={handleClose}
                            className="flex-1 bg-[#2A2A2A] py-3 rounded-2xl items-center border border-gray-700"
                        >
                            <Text className="text-base font-semibold text-gray-400">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading || !passwordValidation.isValid}
                            className="flex-1 rounded-2xl items-center py-3"
                        >
                            <LinearGradient
                                colors={loading || !passwordValidation.isValid ? ['#374151', '#374151'] : ['#8A83DA', '#463699']}
                                className="w-full py-3 rounded-2xl items-center"
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text className="text-base font-semibold text-white">Update Password</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}


