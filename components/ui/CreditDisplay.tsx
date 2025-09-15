import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text } from 'react-native';

interface CreditDisplayProps {
  credits: number;
  size?: 'small' | 'medium' | 'large';
}

export default function CreditDisplay({ 
  credits, 
  size = 'medium'
}: CreditDisplayProps) {
  const getTextClass = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-lg';
      case 'large':
        return 'text-2xl';
      default:
        return 'text-lg';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5';
      case 'medium':
        return 'px-4 py-2';
      case 'large':
        return 'px-6 py-3';
      default:
        return 'px-4 py-2';
    }
  };

  return (
    <LinearGradient
      colors={["#C7C2CE", "#FBD5BD"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 0 }}
      className={`rounded-[20px] border border-gray-700 ${getPadding()}`}
    >
      <Text className={`text-[#262335] font-bold ${getTextClass()} text-center`}>
        {credits.toLocaleString()}
      </Text>
    </LinearGradient>
  );
}

