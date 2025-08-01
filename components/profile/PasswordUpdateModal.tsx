import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
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
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Update Password</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.label}>Current Password</Text>
                        <View style={styles.inputContainer}>
                            <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.currentPassword}
                                onChangeText={(value) => handlePasswordChange('currentPassword', value)}
                                placeholder="Enter current password"
                                secureTextEntry={!showPasswords.current}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => togglePasswordVisibility('current')}
                                style={styles.eyeButton}
                            >
                                {showPasswords.current ? (
                                    <EyeOff size={20} color="#6B7280" />
                                ) : (
                                    <Eye size={20} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputContainer}>
                            <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.newPassword}
                                onChangeText={(value) => handlePasswordChange('newPassword', value)}
                                placeholder="Enter new password"
                                secureTextEntry={!showPasswords.new}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => togglePasswordVisibility('new')}
                                style={styles.eyeButton}
                            >
                                {showPasswords.new ? (
                                    <EyeOff size={20} color="#6B7280" />
                                ) : (
                                    <Eye size={20} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {formData.newPassword && (
                            <View style={styles.passwordStrength}>
                                <View style={styles.strengthHeader}>
                                    <Text style={styles.strengthLabel}>Password Strength</Text>
                                    <View
                                        style={[
                                            styles.strengthIndicator,
                                            { backgroundColor: getPasswordStrengthColor() }
                                        ]}
                                    />
                                </View>

                                <View style={styles.requirementsList}>
                                    {[
                                        { text: 'At least 8 characters', check: formData.newPassword.length >= 8 },
                                        { text: 'One lowercase letter', check: /[a-z]/.test(formData.newPassword) },
                                        { text: 'One uppercase letter', check: /[A-Z]/.test(formData.newPassword) },
                                        { text: 'One number', check: /\d/.test(formData.newPassword) },
                                        { text: 'One special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) },
                                    ].map((req, index) => (
                                        <View key={index} style={styles.requirement}>
                                            {req.check ? (
                                                <CheckCircle size={16} color="#10B981" />
                                            ) : (
                                                <AlertCircle size={16} color="#EF4444" />
                                            )}
                                            <Text style={[
                                                styles.requirementText,
                                                { color: req.check ? '#10B981' : '#EF4444' }
                                            ]}>
                                                {req.text}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <View style={styles.inputContainer}>
                            <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.confirmPassword}
                                onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                                placeholder="Confirm new password"
                                secureTextEntry={!showPasswords.confirm}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => togglePasswordVisibility('confirm')}
                                style={styles.eyeButton}
                            >
                                {showPasswords.confirm ? (
                                    <EyeOff size={20} color="#6B7280" />
                                ) : (
                                    <Eye size={20} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                        </View>

                        {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                            <Text style={styles.errorText}>Passwords do not match</Text>
                        )}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={[styles.button, styles.cancelButton]}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.button, styles.updateButton]}
                        disabled={loading || !passwordValidation.isValid}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.updateButtonText}>Update Password</Text>
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
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    eyeButton: {
        padding: 4,
    },
    passwordStrength: {
        marginTop: 12,
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    strengthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    strengthLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    strengthIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    requirementsList: {
        gap: 8,
    },
    requirement: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requirementText: {
        fontSize: 14,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        marginTop: 8,
        fontWeight: '500',
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
    updateButton: {
        backgroundColor: '#8B5CF6',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
