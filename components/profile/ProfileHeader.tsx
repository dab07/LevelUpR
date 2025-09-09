import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Star, Trophy } from 'lucide-react-native';
import { profileService } from '@/services/profileService';
import CreditDisplay from '@/components/ui/CreditDisplay';
import {User} from '@/types'

interface ProfileHeaderProps {
    profile: User;
    onProfileUpdate: (updatedProfile: User) => void;
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
            colors={['#8A83DA', '#463699']}
            className="px-5 py-6 rounded-b-3xl"
        >
            <View className="flex-row items-center mb-5">
                <View className="relative mr-4">
                    <TouchableOpacity onPress={handleImageUpload} className="relative">
                        {profile.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} className="w-20 h-20 rounded-full border-3 border-white" />
                        ) : (
                            <View className="w-20 h-20 rounded-full bg-white/20 justify-center items-center border-3 border-white">
                                <Text className="text-[32px] font-bold text-white">
                                    {profile.displayName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                        <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#8A83DA] justify-center items-center border-2 border-white">
                            <Camera size={16} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>

                    {uploading && (
                        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/70 rounded-full justify-center items-center">
                            <Text className="text-white text-xs font-semibold">Uploading...</Text>
                        </View>
                    )}
                </View>

                <View className="flex-1">
                    <Text className="text-2xl font-bold text-white mb-1">{profile.displayName}</Text>
                    <Text className="text-base text-gray-200 mb-3">@{profile.username}</Text>

                    <View className="flex-row gap-4">
                        <View className="flex-row items-center gap-1">
                            <Star size={16} color="#FCD34D" />
                            <Text className="text-sm text-white font-medium">Level {profile.level}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Trophy size={16} color="#FCD34D" />
                            <Text className="text-sm text-white font-medium">{profile.dailyLoginStreak} day streak</Text>
                        </View>
                    </View>
                </View>

                <View className="ml-3">
                    <CreditDisplay credits={profile.credits} size="large" />
                </View>
            </View>

            <View className="mt-2">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm text-gray-200 font-medium">Progress to Level {profile.level + 1}</Text>
                    <Text className="text-sm text-white font-semibold">{profile.xp % 100}/100 XP</Text>
                </View>
                <View className="h-1.5 bg-white/20 rounded-sm overflow-hidden">
                    <View
                        className="h-full bg-yellow-300 rounded-sm"
                        style={{ width: `${(profile.xp % 100)}%` }}
                    />
                </View>
            </View>
        </LinearGradient>
    );
}


