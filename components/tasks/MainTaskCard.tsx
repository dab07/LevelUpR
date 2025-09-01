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
        <View className="my-2 rounded-2xl overflow-hidden shadow-sm shadow-black/10">
            <LinearGradient
                colors={isCompleted ? ['#10B981', '#059669'] : ['#FFFFFF', '#F9FAFB']}
                className="p-4"
            >
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                        <Text className={`text-lg font-semibold mb-1 ${
                            isCompleted ? 'text-white' : 'text-gray-900'
                        }`}>
                            {title}
                        </Text>
                        <Text className={`text-sm leading-5 ${
                            isCompleted ? 'text-gray-200' : 'text-gray-500'
                        }`}>
                            {description}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onClaim}
                        disabled={disabled || isCompleted}
                        className={`flex-row items-center px-4 py-2 rounded-[20px] border ${
                            isCompleted 
                                ? 'bg-white/20 border-white' 
                                : 'bg-violet-500/10 border-violet-500'
                        } ${disabled ? 'opacity-50' : ''}`}
                    >
                        {isCompleted ? (
                            <CheckCircle size={20} color="#FFFFFF" />
                        ) : (
                            <Circle size={20} color="#8B5CF6" />
                        )}
                        <Text className={`text-sm font-semibold ml-1.5 ${
                            isCompleted ? 'text-white' : 'text-violet-500'
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


