import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Circle } from 'lucide-react-native';

interface MainTaskCardProps {
    title: string;
    description: string;
    isCompleted: boolean;
    onClaim: () => void;
    disabled?: boolean;
    children?: React.ReactNode;
}

export default function MainTaskCard({
    title,
    description,
    isCompleted,
    onClaim,
    disabled = false,
    children,
}: MainTaskCardProps) {
    return (
        <View className="my-2 rounded-2xl overflow-hidden">
            <LinearGradient
                colors={['#FBF5F0', '#FBD5BD']}
                className="p-4"
            >
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
    );
}


