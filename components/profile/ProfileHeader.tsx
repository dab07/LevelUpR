import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CreditCard as Edit3, Star, Trophy } from 'lucide-react-native';
import { UserProfile, profileService } from '@/services/profileService';
import CreditDisplay from '@/components/ui/CreditDisplay';

interface ProfileHeaderProps {
    profile: UserProfile;
    onProfileUpdate: (updatedProfile: UserProfile) => void;
}

export default function ProfileHeader({ profile, onProfileUpdate }: ProfileHeaderProps) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async () => {
        if (uploading) return;

        setUploading(true);
        try {
            const imageUrl = await profileService.uploadProfileImage(profile.id);
            if (imageUrl) {
                const success = await profileService.updateProfile(profile.id, {
                    avatarUrl: imageUrl
                });

                if (success) {
                    onProfileUpdate({ ...profile, avatarUrl: imageUrl });
                    Alert.alert('Success', 'Profile picture updated successfully!');
                } else {
                    Alert.alert('Error', 'Failed to update profile picture.');
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={handleImageUpload} style={styles.avatarWrapper}>
                        {profile.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile.displayName}
                                </Text>
                            </View>
                        )}
                        <View style={styles.cameraOverlay}>
                            <Camera size={16} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    {uploading && (
                        <View style={styles.uploadingOverlay}>
                            <Text style={styles.uploadingText}>Uploading...</Text>
                        </View>
                    )}
                </View>

                <View style={styles.userInfo}>
                    <Text style={styles.displayName}>{profile.displayName}</Text>
                    <Text style={styles.username}>@{profile.username}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Star size={16} color="#FCD34D" />
                            <Text style={styles.statText}>Level {profile.level}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Trophy size={16} color="#FCD34D" />
                            <Text style={styles.statText}>{profile.dailyLoginStreak} day streak</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.creditsContainer}>
                    <CreditDisplay credits={profile.credits} size="large" />
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressInfo}>
                    <Text style={styles.progressLabel}>Progress to Level {profile.level + 1}</Text>
                    <Text style={styles.progressText}>{profile.xp % 100}/100 XP</Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[styles.progressFill, { width: `${(profile.xp % 100)}%` }]}
                    />
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    userInfo: {
        flex: 1,
    },
    displayName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: '#E5E7EB',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    creditsContainer: {
        marginLeft: 12,
    },
    progressContainer: {
        marginTop: 8,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        color: '#E5E7EB',
        fontWeight: '500',
    },
    progressText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FCD34D',
        borderRadius: 3,
    },
});
