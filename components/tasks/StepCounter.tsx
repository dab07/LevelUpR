import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
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
            <View className="mt-3">
                {pedometerError && (
                    <View className="flex-row items-center bg-red-500/10 px-3 py-2 rounded-lg mb-3">
                        <AlertCircle size={16} color="#EF4444" />
                        <Text className="text-xs text-red-500 ml-1.5 flex-1">{pedometerError}</Text>
                    </View>
                )}

                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center flex-1">
                        <Activity size={20} color="#8B5CF6" />
                        <Text className="text-base font-semibold text-gray-900 ml-2">
                            {stepData.steps.toLocaleString()}/{stepData.goal.toLocaleString()} steps
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        className="p-1"
                    >
                        <Settings size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center mb-4">
                    <View className="flex-1 h-2 bg-gray-200 rounded-sm overflow-hidden mr-3">
                        <LinearGradient
                            colors={['#8B5CF6', '#3B82F6']}
                            className="h-full rounded-sm"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </View>
                    <Text className="text-sm font-semibold text-gray-500 min-w-[40px] text-right">
                        {Math.round(progressPercentage)}%
                    </Text>
                </View>

                <View className="flex-row justify-between mt-2">
                    <View className="items-center">
                        <Text className="text-xs text-gray-500 mb-0.5">Automatic Tracking</Text>
                        <Text className="text-xs font-medium text-gray-900">
                            {pedometerError ? 'Unavailable' : 'Active'}
                        </Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-xs text-gray-500 mb-0.5">Last Updated</Text>
                        <Text className="text-xs font-medium text-gray-900">
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
                <View className="flex-1 bg-black/50 justify-center items-center p-5">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-[400px]">
                        <Text className="text-xl font-bold text-gray-900 mb-5 text-center">Step Goal Settings</Text>

                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">Daily Step Goal</Text>
                            <Text className="text-xs text-gray-500 mb-2">Minimum: 6,000 steps</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900"
                                value={tempGoal}
                                onChangeText={setTempGoal}
                                keyboardType="numeric"
                                placeholder="Enter step goal"
                            />
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setShowSettings(false)}
                                className="flex-1 py-3 rounded-lg items-center bg-gray-100"
                            >
                                <Text className="text-base font-semibold text-gray-500">Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleGoalSave}
                                className="flex-1 py-3 rounded-lg items-center bg-violet-500"
                            >
                                <Text className="text-base font-semibold text-white">Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}


