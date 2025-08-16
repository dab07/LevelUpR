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
import { X, Trophy, Calendar, Coins, Clock } from 'lucide-react-native';
import { challengeService } from '@/services/challengeService';
import { Group } from '@/types';

interface CreateChallengeModalProps {
    visible: boolean;
    onClose: () => void;
    group: Group;
    onChallengeCreated: () => void;
}

export default function CreateChallengeModal({
                                                 visible,
                                                 onClose,
                                                 group,
                                                 onChallengeCreated
                                             }: CreateChallengeModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        minimumBet: '0',
        deadline: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.description.trim() || !formData.deadline) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const minimumBet = parseInt(formData.minimumBet);
        if (isNaN(minimumBet) || minimumBet < 1) {
            Alert.alert('Error', 'Minimum bet must be at least 1 credit');
            return;
        }

        const deadlineDate = new Date(formData.deadline);
        if (deadlineDate <= new Date()) {
            Alert.alert('Error', 'Deadline must be in the future');
            return;
        }

        setLoading(true);
        try {
            await challengeService.createChallenge({
                title: formData.title.trim(),
                description: formData.description.trim(),
                minimumBet,
                deadline: deadlineDate.toISOString(),
                isGlobal: false,
                groupId: group.id,
            });

            Alert.alert('Success', 'Challenge created successfully!');
            handleClose();
            onChallengeCreated();
        } catch (error) {
            console.error('Create challenge error:', error);
            Alert.alert('Error', 'Failed to create challenge. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            description: '',
            minimumBet: '1',
            deadline: '',
        });
        onClose();
    };

    const formatDateForInput = (date: Date): string => {
        return date.toISOString().slice(0, 16);
    };

    const getMinDeadline = (): string => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDateForInput(tomorrow);
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
                    <Text style={styles.title}>Create Challenge</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.groupInfo}>
                        <Trophy size={20} color="#8B5CF6" />
                        <Text style={styles.groupName}>For: {group.name}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Challenge Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.title}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                            placeholder="e.g., Complete 10,000 steps today"
                            maxLength={200}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                            placeholder="Describe what needs to be accomplished..."
                            multiline
                            numberOfLines={3}
                            maxLength={1000}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Minimum Bet (Credits) *</Text>
                        <View style={styles.inputContainer}>
                            <Coins size={20} color="#F59E0B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.minimumBet}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, minimumBet: value }))}
                                placeholder="1"
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                        <Text style={styles.helperText}>
                            Minimum 1 credit for group challenges
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Deadline *</Text>
                        <View style={styles.inputContainer}>
                            <Calendar size={20} color="#8B5CF6" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.deadline}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, deadline: value }))}
                                placeholder="YYYY-MM-DD HH:MM"
                                maxLength={16}
                            />
                        </View>
                        <Text style={styles.helperText}>
                            Format: YYYY-MM-DD HH:MM (e.g., 2024-12-31 23:59)
                        </Text>
                    </View>

                    <View style={styles.infoCard}>
                        <Clock size={20} color="#3B82F6" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>How Betting Works</Text>
                            <Text style={styles.infoText}>
                                • Members bet "Yes" or "No" on challenge completion{'\n'}
                                • You submit proof before deadline{'\n'}
                                • 6-hour voting period for verification{'\n'}
                                • Winners split the losing side's credits
                            </Text>
                        </View>
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
                        style={[styles.button, styles.createButton]}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Trophy size={20} color="#FFFFFF" />
                                <Text style={styles.createButtonText}>Create Challenge</Text>
                            </>
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
    groupInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8B5CF6',
        marginLeft: 8,
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
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
        paddingLeft: 44,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingLeft: 12,
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#F0F9FF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginTop: 8,
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E40AF',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#1E40AF',
        lineHeight: 16,
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
        flexDirection: 'row',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    createButton: {
        backgroundColor: '#8B5CF6',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
});
