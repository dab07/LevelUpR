import React , {useState, useEffect} from 'react';
import {View, Text, Alert, TouchableOpacity, ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {profileService} from "@/services/profileService";
import {User} from '@/types';
import {supabase} from "@/lib/supabase";
import {router} from "expo-router";
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
            const {data : {user}} = await supabase.auth.getUser();
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
        const success = await profileService.logout();
            if (success) {
                router.replace('/auth');
            } else {
                console.log("Unable to LogOut", success);
                Alert.alert('Error', 'Failed to logout. Please try again.');
            }
        // Alert.alert(
        //     'Logout',
        //     'Are you sure you want to logout?',
        //     [
        //         {text: 'Cancel', style: 'cancel'},
        //         {
        //             text: 'Logout',
        //             style: 'destructive',
        //             onPress: async () => {
        //                 const success = await profileService.logout();
        //                 if (success) {
        //                     router.replace('/auth');
        //                 } else {
        //                     Alert.alert('Error', 'Failed to logout. Please try again.');
        //                 }
        //             },
        //         },
        //     ]
        // );
    };
    const handleProfileUpdate = (updatedUserProfile: User) => {
        setUserData(updatedUserProfile);
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 justify-center items-center">
                    <Text className="text-base text-gray-500">Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (!userData) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 justify-center items-center p-5">
                    <Text className="text-base text-red-500 mb-4">Failed to load profile</Text>
                    <TouchableOpacity onPress={loadUserData} className="bg-violet-500 px-5 py-2.5 rounded-lg">
                        <Text className="text-white font-semibold">Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    if (showChallengeHistory) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="px-5 py-4 border-b border-gray-200 bg-white">
                    <TouchableOpacity
                        onPress={() => setShowChallengeHistory(false)}
                        className="self-start"
                    >
                        <Text className="text-base text-violet-500 font-semibold">← Back</Text>
                    </TouchableOpacity>
                </View>
                <ChallengeHistory userId={userData.id} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <ProfileHeader profile={userData} onProfileUpdate={handleProfileUpdate} />

                <View className="p-5">
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Account Settings</Text>

                        <TouchableOpacity
                            onPress={() => setShowEditModal(true)}
                            className="flex-row items-center justify-between bg-white px-4 py-4 rounded-xl mb-2 shadow-sm"
                        >
                            <View className="flex-row items-center">
                                <Edit3 size={20} color="#8B5CF6" />
                                <Text className="text-base font-medium text-gray-900 ml-3">Edit Profile</Text>
                            </View>
                            <Text className="text-xl text-gray-400 font-light">›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowPasswordModal(true)}
                            className="flex-row items-center justify-between bg-white px-4 py-4 rounded-xl mb-2 shadow-sm"
                        >
                            <View className="flex-row items-center">
                                <Lock size={20} color="#8B5CF6" />
                                <Text className="text-base font-medium text-gray-900 ml-3">Change Password</Text>
                            </View>
                            <Text className="text-xl text-gray-400 font-light">›</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-8">
                        <Text className="text-lg font-bold text-gray-900 mb-4">Activity</Text>

                        <TouchableOpacity
                            onPress={() => setShowChallengeHistory(true)}
                            className="flex-row items-center justify-between bg-white px-4 py-4 rounded-xl mb-2 shadow-sm"
                        >
                            <View className="flex-row items-center">
                                <History size={20} color="#8B5CF6" />
                                <Text className="text-base font-medium text-gray-900 ml-3">Challenge History</Text>
                            </View>
                            <Text className="text-xl text-gray-400 font-light">›</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-8">
                        <TouchableOpacity
                            onPress={handleLogout}
                            className="flex-row items-center justify-between bg-red-50 px-4 py-4 rounded-xl mb-2 border border-red-200"
                        >
                            <View className="flex-row items-center">
                                <LogOut size={20} color="#EF4444" />
                                <Text className="text-base font-medium text-red-500 ml-3">Logout</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
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


