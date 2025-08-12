import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, AppState } from 'react-native';
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
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.durationText}>
                        Meditate for {duration}min
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={styles.settingsButton}
                        disabled={isRunning}
                    >
                        <Settings size={20} color={isRunning ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                </View>

                <View style={styles.timerContainer}>
                    <View style={styles.circularProgress}>
                        <LinearGradient
                            colors={['#8B5CF6', '#3B82F6']}
                            style={[
                                styles.progressRing,
                                {
                                    transform: [{ rotate: `${(getProgressPercentage() * 3.6) - 90}deg` }]
                                }
                            ]}
                        />
                        <View style={styles.timerInner}>
                            <Text style={styles.timeDisplay}>{formatTime(timeLeft)}</Text>
                            <Text style={styles.statusText}>
                                {isRunning ? 'Meditating...' : timeLeft === duration * 60 ? 'Ready' : 'Paused'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.controls}>
                    {!isRunning ? (
                        <TouchableOpacity
                            onPress={handleStart}
                            style={[styles.controlButton, styles.playButton]}
                        >
                            <Play size={24} color="#FFFFFF" />
                            <Text style={styles.playButtonText}>
                                {timeLeft === duration * 60 ? 'Start' : 'Resume'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handlePause}
                            style={[styles.controlButton, styles.pauseButton]}
                        >
                            <Pause size={24} color="#FFFFFF" />
                            <Text style={styles.pauseButtonText}>Pause</Text>
                        </TouchableOpacity>
                    )}

                    {timeLeft !== duration * 60 && (
                        <TouchableOpacity
                            onPress={handleStop}
                            style={[styles.controlButton, styles.stopButton]}
                        >
                            <Square size={20} color="#EF4444" />
                            <Text style={styles.stopButtonText}>Stop</Text>
                        </TouchableOpacity>
                    )}
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
                        <Text style={styles.modalTitle}>Meditation Duration</Text>

                        <View style={styles.durationGrid}>
                            {DURATION_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => handleDurationChange(option)}
                                    style={[
                                        styles.durationOption,
                                        duration === option && styles.selectedDuration
                                    ]}
                                >
                                    <Text style={[
                                        styles.durationOptionText,
                                        duration === option && styles.selectedDurationText
                                    ]}>
                                        {option}min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => setShowSettings(false)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    durationText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    settingsButton: {
        padding: 4,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    circularProgress: {
        width: 120,
        height: 120,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: 'transparent',
        borderTopColor: '#8B5CF6',
    },
    timerInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    timeDisplay: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    statusText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    playButton: {
        backgroundColor: '#10B981',
    },
    pauseButton: {
        backgroundColor: '#F59E0B',
    },
    stopButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    playButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 8,
    },
    pauseButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 8,
    },
    stopButtonText: {
        color: '#EF4444',
        fontWeight: '600',
        marginLeft: 6,
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
    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    durationOption: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedDuration: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    durationOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    selectedDurationText: {
        color: '#FFFFFF',
    },
    closeButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
