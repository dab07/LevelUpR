import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins } from 'lucide-react-native';

interface CreditDisplayProps {
  credits: number;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export default function CreditDisplay({ 
  credits, 
  size = 'medium', 
  showIcon = true 
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

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 28;
      default:
        return 20;
    }
  };

  return (
    <LinearGradient
      colors={['#8B5CF6', '#3B82F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="rounded-[20px] px-3 py-1.5"
    >
      <View className="flex-row items-center">
        {showIcon && (
          <Coins 
            size={getIconSize()} 
            color="#FFFFFF" 
            className="mr-1.5"
          />
        )}
        <Text className={`text-white font-bold ${getTextClass()}`}>
          {credits.toLocaleString()}
        </Text>
      </View>
    </LinearGradient>
  );
}

