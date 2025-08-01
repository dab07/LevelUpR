import React , {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView} from 'react-native';
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
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (!userData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Failed to load profile</Text>
                    <TouchableOpacity onPress={loadUserData} style={styles.retryButton}>

                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    if (showChallengeHistory) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.backHeader}>
                    <TouchableOpacity
                        onPress={() => setShowChallengeHistory(false)}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                </View>
                <ChallengeHistory userId={userData.id} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <ProfileHeader profile={userData} onProfileUpdate={handleProfileUpdate} />

                <View style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Settings</Text>

                        <TouchableOpacity
                            onPress={() => setShowEditModal(true)}
                            style={styles.menuItem}
                        >
                            <View style={styles.menuItemLeft}>
                                <Edit3 size={20} color="#8B5CF6" />
                                <Text style={styles.menuItemText}>Edit Profile</Text>
                            </View>
                            <Text style={styles.menuItemArrow}>›</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowPasswordModal(true)}
                            style={styles.menuItem}
                        >
                            <View style={styles.menuItemLeft}>
                                <Lock size={20} color="#8B5CF6" />
                                <Text style={styles.menuItemText}>Change Password</Text>
                            </View>
                            <Text style={styles.menuItemArrow}>›</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Activity</Text>

                        <TouchableOpacity
                            onPress={() => setShowChallengeHistory(true)}
                            style={styles.menuItem}
                        >
                            <View style={styles.menuItemLeft}>
                                <History size={20} color="#8B5CF6" />
                                <Text style={styles.menuItemText}>Challenge History</Text>
                            </View>
                            <Text style={styles.menuItemArrow}>›</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <TouchableOpacity
                            onPress={handleLogout}
                            style={[styles.menuItem, styles.logoutItem]}
                        >
                            <View style={styles.menuItemLeft}>
                                <LogOut size={20} color="#EF4444" />
                                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#8B5CF6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    backHeader: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        alignSelf: 'flex-start',
    },
    backButtonText: {
        fontSize: 16,
        color: '#8B5CF6',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginLeft: 12,
    },
    menuItemArrow: {
        fontSize: 20,
        color: '#9CA3AF',
        fontWeight: '300',
    },
    logoutItem: {
        borderWidth: 1,
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
    },
    logoutText: {
        color: '#EF4444',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#8B5CF6',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
    },
});
