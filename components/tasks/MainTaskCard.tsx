import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Circle, AlertCircle, X } from 'lucide-react-native';

interface MainTaskCardProps {
    title: string;
    description?: string;
    isCompleted: boolean;
    onClaim: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
    errorMessage?: string | null;
}

export default function MainTaskCard({
    title,
    description,
    isCompleted,
    onClaim,
    disabled = false,
    children,
    errorMessage,
}: MainTaskCardProps) {
    const [showErrorModal, setShowErrorModal] = useState(false);

    return (
        <>
            <View className="my-2 rounded-2xl overflow-hidden relative">
                <LinearGradient
                    colors={['#FBF5F0', '#FBD5BD']}
                    className="p-4"
                >
                    {/* Error Indicator */}
                    {errorMessage && (
                        <TouchableOpacity
                            onPress={() => setShowErrorModal(true)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center z-10"
                        >
                            <AlertCircle size={10} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}

                    <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-4">
                            <Text className={`text-lg font-semibold mb-1 ${isCompleted ? 'text-black' : 'text-black'
                                }`}>
                                {title}
                            </Text>
                            <Text className={`text-sm leading-5 ${isCompleted ? 'text-gray-700' : 'text-gray-700'
                                }`}>
                                {description}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={onClaim}
                            disabled={disabled || isCompleted}
                            className={`flex-row items-center px-4 py-2 rounded-[20px] border ${isCompleted
                                ? 'bg-[#8A83DA] border-white'
                                : 'bg-primary-300/20 border-primary-300'
                                } ${disabled ? 'opacity-50' : ''}`}
                        >
                            {isCompleted ? (
                                <CheckCircle size={20} color="#FFFFFF" />
                            ) : (
                                <Circle size={20} color="#8A83DA" />
                            )}
                            <Text className={`text-sm font-semibold ml-1.5 ${isCompleted ? 'text-white' : 'text-primary-300'
                                }`}>
                                {isCompleted ? 'Claimed' : 'Claim'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {children && (
                        <View className="mt-4">
                            {children}
                        </View>
                    )}
                </LinearGradient>
            </View>

            {/* Error Modal */}
            <Modal
                visible={showErrorModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowErrorModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center p-5">
                    <View className="bg-[#2A2A2A] rounded-2xl p-6 w-full max-w-[400px] border border-gray-700">
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center">
                                <AlertCircle size={24} color="#EF4444" />
                                <Text className="text-lg font-bold text-white ml-2">Step Tracking Issue</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowErrorModal(false)}
                                className="p-1"
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-300 text-base leading-6 mb-6">
                            {errorMessage}
                        </Text>

                        <TouchableOpacity
                            onPress={() => setShowErrorModal(false)}
                            className="bg-[#8A83DA] py-3 rounded-lg items-center"
                        >
                            <Text className="text-base font-semibold text-white">Got it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}


