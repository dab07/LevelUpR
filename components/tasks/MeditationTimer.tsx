import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Square, Settings } from 'lucide-react-native';
import { meditationService } from '@/services/meditationService';

interface MeditationTimerProps {
    onComplete: () => void;
}

const DURATION_OPTIONS = [1, 5, 10, 15, 20, 30, 45, 60]; // minutes

export default function MeditationTimer({ onComplete }: MeditationTimerProps) {
    const [duration, setDuration] = useState(10); // minutes
    const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
    const [isRunning, setIsRunning] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [appStateVisible, setAppStateVisible] = useState(AppState.currentState);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const backgroundTimeRef = useRef<number | null>(null);

    useEffect(() => {
        setTimeLeft(duration * 60);
    }, [duration]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [isRunning]);

    const handleAppStateChange = (nextAppState: string) => {
        if (appStateVisible.match(/inactive|background/) && nextAppState === 'active') {
            // App came to foreground
            if (isRunning && backgroundTimeRef.current) {
                const timeInBackground = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
                Alert.alert(
                    'Meditation Interrupted',
                    `You left the app for ${Math.floor(timeInBackground / 60)}m ${timeInBackground % 60}s. Meditation session has been paused.`,
                    [{ text: 'OK', onPress: () => setIsRunning(false) }]
                );
            }
        } else if (nextAppState.match(/inactive|background/) && isRunning) {
            // App went to background
            backgroundTimeRef.current = Date.now();
        }
        setAppStateVisible(nextAppState);
    };

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeLeft]);

    const handleStart = () => {
        if (!sessionId) {
            setSessionId(meditationService.generateSessionId());
        }
        setIsRunning(true);
        backgroundTimeRef.current = null;
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handleStop = () => {
        setIsRunning(false);
        setTimeLeft(duration * 60);
        setSessionId(null);
    };

    const handleComplete = async () => {
        setIsRunning(false);

        if (sessionId) {
            const session = {
                id: sessionId,
                userId: 'current_user', // This would come from auth context
                duration,
                completedAt: new Date().toISOString(),
                isCompleted: true,
            };

            await meditationService.saveSession(session);
            onComplete();

            Alert.alert(
                '🧘‍♀️ Meditation Complete!',
                `Great job! You meditated for ${duration} minutes and earned 1 credit.`,
                [{ text: 'Awesome!', onPress: () => setSessionId(null) }]
            );
        }

        setTimeLeft(duration * 60);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressPercentage = (): number => {
        const totalSeconds = duration * 60;
        const elapsed = totalSeconds - timeLeft;
        return (elapsed / totalSeconds) * 100;
    };

    const handleDurationChange = (newDuration: number) => {
        if (!isRunning) {
            setDuration(newDuration);
            setShowSettings(false);
        }
    };

    return (
        <>
            <View className="mt-3">
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center flex-1">
                        <View className="flex-row items-center">
                            {!isRunning ? (
                                <Play size={16} color="#8A83DA" />
                            ) : (
                                <Pause size={16} color="#F59E0B" />
                            )}
                            <Text className="text-sm font-medium text-gray-700 ml-2">
                                {formatTime(timeLeft)} / {duration}min
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        {!isRunning ? (
                            <TouchableOpacity
                                onPress={handleStart}
                                className="px-3 py-1 rounded-lg bg-emerald-500"
                            >
                                <Text className="text-white text-xs font-medium">
                                    {timeLeft === duration * 60 ? 'Start' : 'Resume'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handlePause}
                                className="px-3 py-1 rounded-lg bg-amber-500"
                            >
                                <Text className="text-white text-xs font-medium">Pause</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => setShowSettings(true)}
                            className="p-1"
                            disabled={isRunning}
                        >
                            <Settings size={16} color={isRunning ? '#9CA3AF' : '#6B7280'} />
                        </TouchableOpacity>
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
                    <View className="bg-[#2A2A2A] rounded-2xl p-6 w-full max-w-[400px] border border-gray-700">
                        <Text className="text-xl font-bold text-white mb-5 text-center">Meditation Duration</Text>

                        <View className="flex-row flex-wrap gap-3 mb-6">
                            {DURATION_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => handleDurationChange(option)}
                                    className={`flex-1 min-w-[30%] py-3 rounded-lg items-center border-2 ${
                                        duration === option 
                                            ? 'bg-[#8A83DA] border-[#8A83DA]' 
                                            : 'bg-[#333333] border-transparent'
                                    }`}
                                >
                                    <Text className={`text-base font-semibold ${
                                        duration === option ? 'text-white' : 'text-gray-400'
                                    }`}>
                                        {option}min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => setShowSettings(false)}
                            className="bg-[#8A83DA] py-3 rounded-lg items-center"
                        >
                            <Text className="text-base font-semibold text-white">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}


