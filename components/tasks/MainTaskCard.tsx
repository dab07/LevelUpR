import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
        <View style={styles.container}>
            <LinearGradient
                colors={isCompleted ? ['#10B981', '#059669'] : ['#FFFFFF', '#F9FAFB']}
                style={styles.gradient}
            >
                <View style={styles.header}>
                    <View style={styles.titleSection}>
                        <Text style={[
                            styles.title,
                            { color: isCompleted ? '#FFFFFF' : '#111827' }
                        ]}>
                            {title}
                        </Text>
                        <Text style={[
                            styles.description,
                            { color: isCompleted ? '#E5E7EB' : '#6B7280' }
                        ]}>
                            {description}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={onClaim}
                        disabled={disabled || isCompleted}
                        style={[
                            styles.claimButton,
                            isCompleted && styles.completedButton,
                            disabled && styles.disabledButton,
                        ]}
                    >
                        {isCompleted ? (
                            <CheckCircle size={20} color="#FFFFFF" />
                        ) : (
                            <Circle size={20} color="#8B5CF6" />
                        )}
                        <Text style={[
                            styles.claimText,
                            { color: isCompleted ? '#FFFFFF' : '#8B5CF6' }
                        ]}>
                            {isCompleted ? 'Claimed' : 'Claim'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {children && (
                    <View style={styles.content}>
                        {children}
                    </View>
                )}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    gradient: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleSection: {
        flex: 1,
        marginRight: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    claimButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#8B5CF6',
    },
    completedButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: '#FFFFFF',
    },
    disabledButton: {
        opacity: 0.5,
    },
    claimText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    content: {
        marginTop: 16,
    },
});
