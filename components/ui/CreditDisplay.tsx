import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 18;
      case 'large':
        return 24;
      default:
        return 18;
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
      style={styles.container}
    >
      <View style={styles.content}>
        {showIcon && (
          <Coins 
            size={getIconSize()} 
            color="#FFFFFF" 
            style={styles.icon}
          />
        )}
        <Text style={[styles.text, { fontSize: getTextSize() }]}>
          {credits.toLocaleString()}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});