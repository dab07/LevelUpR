import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
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

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { height: 36, paddingHorizontal: 16 };
      case 'medium':
        return { height: 44, paddingHorizontal: 24 };
      case 'large':
        return { height: 52, paddingHorizontal: 32 };
      default:
        return { height: 44, paddingHorizontal: 24 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 16;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? ['#9CA3AF', '#6B7280'] : getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, getButtonSize()]}
      >
        <Text style={[styles.text, { fontSize: getTextSize() }, textStyle]}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});