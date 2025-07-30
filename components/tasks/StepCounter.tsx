import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Activity, AlertCircle } from 'lucide-react-native';
import { StepData } from '@/types';

interface StepCounterProps {
    stepData: StepData;
    onUpdateGoal: (goal: number) => void;
    pedometerError?: string | null;
}

export default function StepCounter({ stepData, onUpdateGoal, pedometerError }: StepCounterProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [tempGoal, setTempGoal] = useState(stepData.goal.toString());

    const progressPercentage = Math.min(100, (stepData.steps / stepData.goal) * 100);

    const handleGoalSave = () => {
        const newGoal = parseInt(tempGoal);
        if (isNaN(newGoal) || newGoal < 6000) {
            Alert.alert('Invalid Goal', 'Goal must be at least 6000 steps');
            return;
        }
        onUpdateGoal(newGoal);
        setShowSettings(false);
    };

    return (
        <>
            <View style={styles.container}>
                {pedometerError && (
                    <View style={styles.errorContainer}>
                        <AlertCircle size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{pedometerError}</Text>
                    </View>
                )}

                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Activity size={20} color="#8B5CF6" />
                        <Text style={styles.stepCount}>
                            {stepData.steps.toLocaleString()}/{stepData.goal.toLocaleString()} steps
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={styles.settingsButton}
                    >
                        <Settings size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={['#8B5CF6', '#3B82F6']}
                            style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {Math.round(progressPercentage)}%
                    </Text>
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Automatic Tracking</Text>
                        <Text style={styles.infoValue}>
                            {pedometerError ? 'Unavailable' : 'Active'}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Last Updated</Text>
                        <Text style={styles.infoValue}>
                            {new Date(stepData.lastUpdated).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>
            </View>

            <Modal
                visible={showSettings}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Step Goal Settings</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Daily Step Goal</Text>
                            <Text style={styles.inputHint}>Minimum: 6,000 steps</Text>
                            <TextInput
                                style={styles.input}
                                value={tempGoal}
                                onChangeText={setTempGoal}
                                keyboardType="numeric"
                                placeholder="Enter step goal"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowSettings(false)}
                                style={[styles.modalButton, styles.cancelButton]}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleGoalSave}
                                style={[styles.modalButton, styles.saveButton]}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginLeft: 6,
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stepCount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 8,
    },
    settingsButton: {
        padding: 4,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: 12,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        minWidth: 40,
        textAlign: 'right',
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    infoItem: {
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 12,
        fontWeight: '500',
        color: '#111827',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputHint: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
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
