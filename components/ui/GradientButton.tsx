import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  className?: string;
}

export default function GradientButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  className = '',
}: GradientButtonProps) {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return ['#8A83DA', '#463699'];
      case 'secondary':
        return ['#C7C2CE', '#8A83DA'];
      case 'danger':
        return ['#EF4444', '#DC2626'];
      case 'accent':
        return ['#FBD5BD', '#8A83DA'];
      default:
        return ['#8A83DA', '#463699'];
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
      className={`rounded-xl overflow-hidden ${className}`}
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

