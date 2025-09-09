import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Settings, Activity } from 'lucide-react-native';
import { StepData } from '@/types';

interface StepCounterProps {
    stepData: StepData;
    onUpdateGoal: (goal: number) => void;
    pedometerError?: string | null;
}

export default function StepCounter({ stepData, onUpdateGoal, pedometerError }: StepCounterProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [tempGoal, setTempGoal] = useState(stepData.goal.toString());

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
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center flex-1">
                        <Activity size={16} color="#8A83DA" />
                        <Text className="text-sm font-medium text-gray-700 ml-2">
                            {stepData.steps.toLocaleString()}/{stepData.goal.toLocaleString()} steps
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        className="p-1"
                    >
                        <Settings size={16} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={showSettings}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSettings(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center p-5">
                    <View className="bg-[#2A2A2A] rounded-2xl p-6 w-full max-w-[400px] border border-gray-700">
                        <Text className="text-xl font-bold text-white mb-5 text-center">Step Goal Settings</Text>

                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-white mb-2">Daily Step Goal</Text>
                            <Text className="text-xs text-gray-400 mb-2">Minimum: 6,000 steps</Text>
                            <TextInput
                                className="border border-gray-600 rounded-lg px-3 py-2.5 text-base text-white bg-[#333333]"
                                value={tempGoal}
                                onChangeText={setTempGoal}
                                keyboardType="numeric"
                                placeholder="Enter step goal"
                                placeholderTextColor="#6B7280"
                            />
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setShowSettings(false)}
                                className="flex-1 py-3 rounded-lg items-center bg-[#333333]"
                            >
                                <Text className="text-base font-semibold text-gray-400">Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleGoalSave}
                                className="flex-1 py-3 rounded-lg items-center bg-[#8A83DA]"
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


