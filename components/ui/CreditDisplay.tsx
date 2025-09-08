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
    <View className={`bg-[#2A2A2A] rounded-[20px] border border-gray-700 ${getPadding()}`}>
      <Text className={`text-white font-bold ${getTextClass()} text-center`}>
        {credits.toLocaleString()}
      </Text>
    </View>
  );
}

