import React, { useState, useEffect } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileService } from "@/services/profileService";
import { User } from '@/types';
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import ChallengeHistory from "@/components/profile/ChallengeHistory";
import PasswordUpdateModal from '@/components/profile/PasswordUpdateModal';
import ProfileEditModal from '@/components/profile/ProfileEditModal';
import ProfileHeader from "@/components/profile/ProfileHeader";
import { Lock, CreditCard as Edit3, History, LogOut } from 'lucide-react-native';

export default function ProfileScreen() {
    const [userData, setUserData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showChallengeHistory, setShowChallengeHistory] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/auth');
                return;
            }

            const [userData] = await Promise.all([
                profileService.getUserProfile(user.id),
            ]);

            if (userData) {
                setUserData(userData);
            }
        } catch (e) {
            console.log("Unable to load user data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        // const success = await profileService.logout();
        // if (success) {
        //     router.replace('/auth');
        // } else {
        //     console.log("Unable to LogOut", success);
        //     Alert.alert('Error', 'Failed to logout. Please try again.');
        // }
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {text: 'Cancel', style: 'cancel'},
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await profileService.logout();
                        if (success) {
                            router.replace('/auth');
                        } else {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    },
                },
            ]
        );
    };
    const handleProfileUpdate = (updatedUserProfile: User) => {
        setUserData(updatedUserProfile);
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#1A1A1A]">
                <View className="flex-1 justify-center items-center">
                    <Text className="text-base text-gray-400">Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (!userData) {
        return (
            <SafeAreaView className="flex-1 bg-[#1A1A1A]">
                <View className="flex-1 justify-center items-center p-5">
                    <Text className="text-base text-red-400 mb-4">Failed to load profile</Text>
                    <TouchableOpacity onPress={loadUserData} className="bg-primary-300 px-5 py-2.5 rounded-lg">
                        <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    if (showChallengeHistory) {
        return (
            <SafeAreaView className="flex-1 bg-[#1A1A1A]">
                <View className="px-5 py-4 border-b border-gray-600 bg-[#2A2A2A]">
                    <TouchableOpacity
                        onPress={() => setShowChallengeHistory(false)}
                        className="self-start"
                    >
                        <Text className="text-base text-primary-300 font-semibold">← Back</Text>
                    </TouchableOpacity>
                </View>
                <ChallengeHistory userId={userData?.id || ''} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#1A1A1A]">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Use ProfileHeader but with our styling */}
                {userData && <ProfileHeader profile={userData} onProfileUpdate={handleProfileUpdate} />}

                {/* Stats Container */}
                <View className="px-5 mb-4">
                    <View className="bg-[#2A2A2A] rounded-2xl p-4 border border-gray-700">
                        <Text className="text-white font-semibold text-lg mb-3">Your Progress</Text>
                        <View className="flex-row gap-4">
                            <View className="flex-1 items-center">
                                <Text className="text-2xl font-bold text-white">{userData?.totalTasksCompleted || 0}</Text>
                                <Text className="text-gray-400 text-xs">Quest Completed</Text>
                            </View>
                            <View className="flex-1 items-center">
                                <Text className="text-2xl font-bold text-white">{userData?.level || 1}</Text>
                                <Text className="text-gray-400 text-xs">Experience Level</Text>
                            </View>
                            <View className="flex-1 items-center">
                                <Text className="text-2xl font-bold text-white">{userData?.xp || 0}</Text>
                                <Text className="text-gray-400 text-xs">XP</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View className="mt-4">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-gray-400 text-sm">Level {(userData?.level || 1) + 1}</Text>
                                <Text className="text-white text-sm font-medium">{(userData?.xp || 0) % 100}/100 XP</Text>
                            </View>
                            <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-[#8A83DA] rounded-full"
                                    style={{ width: `${((userData?.xp || 0) % 100)}%` }}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Account Settings Container */}
                <View className="px-5 mb-4">
                    <LinearGradient
                        colors={['#8A83DA', '#463699']}
                        className="rounded-2xl p-4"
                    >
                        <Text className="text-white font-bold text-lg mb-3">Account Settings</Text>

                        <TouchableOpacity
                            onPress={() => setShowEditModal(true)}
                            className="flex-row items-center justify-between bg-white/10 px-4 py-3 rounded-xl mb-2"
                        >
                            <View className="flex-row items-center">
                                <Edit3 size={20} color="#FFFFFF" />
                                <Text className="text-white font-medium ml-3">Edit Profile</Text>
                            </View>
                            <Text className="text-white/70 text-lg">›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowPasswordModal(true)}
                            className="flex-row items-center justify-between bg-white/10 px-4 py-3 rounded-xl"
                        >
                            <View className="flex-row items-center">
                                <Lock size={20} color="#FFFFFF" />
                                <Text className="text-white font-medium ml-3">Change Password</Text>
                            </View>
                            <Text className="text-white/70 text-lg">›</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Activity Container */}
                <View className="px-5 mb-4">
                    <View className="bg-[#2A2A2A] rounded-2xl p-4 border border-gray-700">
                        <Text className="text-white font-semibold text-lg mb-3">Activity</Text>

                        <TouchableOpacity
                            onPress={() => setShowChallengeHistory(true)}
                            className="flex-row items-center justify-between bg-[#333333] px-4 py-3 rounded-xl"
                        >
                            <View className="flex-row items-center">
                                <History size={20} color="#8A83DA" />
                                <Text className="text-white font-medium ml-3">Challenge History</Text>
                            </View>
                            <Text className="text-gray-400 text-lg">›</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout Container */}
                <View className="px-5 mb-6">
                    <TouchableOpacity
                        onPress={handleLogout}
                        className="bg-red-900/20 rounded-2xl p-4 border border-red-800/30"
                    >
                        <View className="flex-row items-center justify-center">
                            <LogOut size={20} color="#EF4444" />
                            <Text className="text-red-400 font-semibold ml-3">Logout</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View className="h-20" />
            </ScrollView>

            <PasswordUpdateModal
                visible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            <ProfileEditModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                profile={userData}
                onProfileUpdate={handleProfileUpdate}
            />
        </SafeAreaView>
    );
}


