import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function GradientButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}: GradientButtonProps) {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return ['#8B5CF6', '#3B82F6'];
      case 'secondary':
        return ['#6B7280', '#4B5563'];
      case 'danger':
        return ['#EF4444', '#DC2626'];
      default:
        return ['#8B5CF6', '#3B82F6'];
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-9 px-4';
      case 'medium':
        return 'h-11 px-6';
      case 'large':
        return 'h-13 px-8';
      default:
        return 'h-11 px-6';
    }
  };

  const getTextSizeClass = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-base';
      case 'large':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="rounded-xl overflow-hidden"
      style={style}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? ['#9CA3AF', '#6B7280'] : getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className={`justify-center items-center rounded-xl ${getSizeClasses()}`}
      >
        <Text
          className={`text-white font-semibold text-center ${getTextSizeClass()}`}
          style={textStyle}
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

