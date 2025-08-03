import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, MessageCircle, Trophy, UserPlus } from 'lucide-react-native';

import CreateGroupModal from '@/components/groups/CreateGroupModal';
import GroupChatModal from '@/components/groups/GroupChatModal';
import GradientButton from '@/components/ui/GradientButton';
import { groupService } from '@/services/groupService';
import { supabase } from '@/lib/supabase';
import { Group } from '@/types';

export default function SocialScreen() {
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);
      await loadUserGroups(user.id);
    } catch (error) {
      console.error('Error initializing social screen:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async (userId: string) => {
    try {
      const groups = await groupService.getUserGroups(userId);
      setUserGroups(groups);
    } catch (error) {
      console.error('Error loading user groups:', error);
      Alert.alert('Error', 'Failed to load groups. Please try again.');
    }
  };

  const handleGroupCreated = () => {
    if (user) {
      loadUserGroups(user.id);
    }
  };

  const handleOpenGroupChat = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupChat(true);
  };

  const handleCreateChallenge = (group: Group) => {
    Alert.alert(
        'Create Challenge',
        `Create a new challenge for ${group.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create',
            onPress: () => {
              // TODO: Implement challenge creation
              Alert.alert('Coming Soon', 'Challenge creation feature will be available soon!');
            },
          },
        ]
    );
  };

  const onRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    await loadUserGroups(user.id);
    setRefreshing(false);
  };

  const renderGroupCard = (group: Group) => (
      <View key={group.id} style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupMembers}>
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            </Text>
            {group.description && (
                <Text style={styles.groupDescription} numberOfLines={2}>
                  {group.description}
                </Text>
            )}
          </View>
          <View style={styles.groupIcon}>
            <Users size={24} color="#8B5CF6" />
          </View>
        </View>

        <View style={styles.groupActions}>
          <TouchableOpacity
              onPress={() => handleOpenGroupChat(group)}
              style={styles.actionButton}
          >
            <MessageCircle size={16} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
              onPress={() => handleCreateChallenge(group)}
              style={styles.actionButton}
          >
            <Trophy size={16} color="#10B981" />
            <Text style={[styles.actionButtonText, { color: '#10B981' }]}>
              Add Challenge
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  );

  const renderEmptyState = () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Users size={64} color="#D1D5DB" />
        </View>
        <Text style={styles.emptyTitle}>No Groups Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first group to start connecting with friends and sharing challenges!
        </Text>
        <GradientButton
            title="Create Your First Group"
            onPress={() => setShowCreateGroup(true)}
            size="large"
            style={styles.emptyActionButton}
        />
      </View>
  );

  if (loading) {
    return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your groups...</Text>
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Social</Text>
              <Text style={styles.headerSubtitle}>
                Connect with friends and share challenges
              </Text>
            </View>
            <TouchableOpacity
                onPress={() => setShowCreateGroup(true)}
                style={styles.createGroupButton}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Users size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{userGroups.length}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>

            <View style={styles.statCard}>
              <UserPlus size={20} color="#10B981" />
              <Text style={styles.statNumber}>
                {userGroups.reduce((total, group) => total + group.memberCount, 0)}
              </Text>
              <Text style={styles.statLabel}>Total Members</Text>
            </View>

            <View style={styles.statCard}>
              <Trophy size={20} color="#F59E0B" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Active Challenges</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
        >
          {userGroups.length === 0 ? (
              renderEmptyState()
          ) : (
              <View style={styles.groupsList}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your Groups</Text>
                  <TouchableOpacity
                      onPress={() => setShowCreateGroup(true)}
                      style={styles.addButton}
                  >
                    <Plus size={20} color="#8B5CF6" />
                    <Text style={styles.addButtonText}>New Group</Text>
                  </TouchableOpacity>
                </View>

                {userGroups.map(renderGroupCard)}
              </View>
          )}

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Group Features</Text>

            <View style={styles.featureCard}>
              <MessageCircle size={24} color="#8B5CF6" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Real-time Chat</Text>
                <Text style={styles.featureDescription}>
                  Chat with your group members in real-time, share updates and motivate each other
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Trophy size={24} color="#10B981" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Group Challenges</Text>
                <Text style={styles.featureDescription}>
                  Any group member can create challenges for the group to participate in
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Users size={24} color="#F59E0B" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Friend Invitations</Text>
                <Text style={styles.featureDescription}>
                  Easily invite friends by searching their username and build your community
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <CreateGroupModal
            visible={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            onGroupCreated={handleGroupCreated}
        />

        <GroupChatModal
            visible={showGroupChat}
            onClose={() => setShowGroupChat(false)}
            group={selectedGroup}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  createGroupButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: -12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    paddingHorizontal: 32,
  },
  groupsList: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  featuresSection: {
    padding: 20,
    paddingTop: 0,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
