import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, MessageCircle, Trophy, Target, TrendingUp } from 'lucide-react-native';

import GradientButton from '@/components/ui/GradientButton';
import CreateGroupModal from '@/components/groups/CreateGroupModal';
import GroupChatModal from '@/components/groups/GroupChatModal';
import CreateChallengeModal from '@/components/challenges/CreateChallengeModal';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import { groupService } from '@/services/groupService';
import { challengeService } from '@/services/challengeService';
import { supabase } from '@/lib/supabase';
import { Group, Challenge, Bet } from '@/types';

export default function SocialScreen() {
  // Group management state
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Challenge management state
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [groupChallenges, setGroupChallenges] = useState<{ [groupId: string]: Challenge[] }>({});
  const [userBets, setUserBets] = useState<{ [challengeId: string]: Bet }>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Subscription refs
  const challengeSubscriptionRef = useRef<any>(null);
  const betSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    initialize();
  }, []);

  // Only refresh when user changes, not continuously
  useEffect(() => {
    if (user) {
      loadUserGroups(user.id);
      setupRealtimeSubscriptions();
    }

    return () => {
      // Cleanup subscriptions
      if (challengeSubscriptionRef.current) {
        challengeSubscriptionRef.current.unsubscribe();
      }
      if (betSubscriptionRef.current) {
        betSubscriptionRef.current.unsubscribe();
      }
    };
  }, [user]);

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to challenge updates for user's groups
    challengeSubscriptionRef.current = supabase
      .channel('challenges')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'challenges',
          filter: `group_id=in.(${userGroups.map(g => g.id).join(',')})`
        }, 
        (payload) => {
          console.log('Challenge update received:', payload);
          // Only refresh if there's an actual change
          if (user) {
            loadUserGroups(user.id, true);
          }
        }
      )
      .subscribe();

    // Subscribe to bet updates
    betSubscriptionRef.current = supabase
      .channel('bets')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bets',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Bet update received:', payload);
          // Only refresh if there's an actual change
          if (user) {
            loadUserGroups(user.id, true);
          }
        }
      )
      .subscribe();
  };

  const initialize = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);
      await loadUserGroups(user.id);
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserGroups = async (userId: string, forceRefresh = false) => {
    try {
      const groups = await groupService.getUserGroups(userId);
      
      // Only update if groups have actually changed or force refresh
      if (forceRefresh || JSON.stringify(groups) !== JSON.stringify(userGroups)) {
        setUserGroups(groups);
        // Load challenges for each group
        await loadGroupChallenges(groups);
      }
    } catch (error) {
      console.error('Error loading user groups:', error);
    }
  };

  const loadGroupChallenges = async (groups: Group[]) => {
    try {
      const challengesData: { [groupId: string]: Challenge[] } = {};
      const betsData: { [challengeId: string]: Bet } = {};

      // Use Promise.all to load challenges in parallel instead of sequentially
      const challengePromises = groups.map(async (group) => {
        const challenges = await challengeService.getGroupChallenges(group.id);
        challengesData[group.id] = challenges;

        // Load user bets for each challenge in parallel
        const betPromises = challenges.map(async (challenge) => {
          const userBet = await challengeService.getUserBet(challenge.id);
          if (userBet) {
            betsData[challenge.id] = userBet;
          }
        });

        await Promise.all(betPromises);
      });

      await Promise.all(challengePromises);

      setGroupChallenges(challengesData);
      setUserBets(betsData);
    } catch (error) {
      console.error('Error loading group challenges:', error);
    }
  };

  const handleGroupCreated = async () => {
    if (!user) return;
    await loadUserGroups(user.id, true); 
  };

  const handleOpenGroupChat = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupChat(true);
  };

  const handleCreateChallenge = (group: Group) => {
    setSelectedGroup(group);
    setShowCreateChallenge(true);
  };

  const handleChallengeCreated = async () => {
    if (!user) return;
    await loadUserGroups(user.id); 
  };

  const handleBetPlaced = async () => {
    if (!user) return;
    await loadUserGroups(user.id); 
  };

  const handleVoteSubmitted = async () => {
    if (!user) return;
    await loadUserGroups(user.id); 
  };

  const handleChallengeInteraction = async (challengeId: string) => {
    // Refresh specific challenge status when user interacts with it
    await challengeService.refreshChallengeStatus(challengeId);
    if (user) {
      await loadUserGroups(user.id); // Force refresh after interaction
    }
  };

  const onRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    await loadUserGroups(user.id, true); // Force refresh on manual pull-to-refresh
    setRefreshing(false);
  };

  const getTotalMembers = () => {
    return userGroups.reduce((total, group) => total + group.memberCount, 0);
  };

  const getTotalActiveChallenges = () => {
    return Object.values(groupChallenges).flat().filter(c => c.status === 'active').length;
  };

  const isUserCreator = (challenge: Challenge) => {
    return user && challenge.creatorId === user.id;
  };

  if (loading) {
    return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading social features...</Text>
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
              <Text style={styles.greeting}>Social Hub 👥</Text>
              <Text style={styles.subtitle}>Connect, challenge, and compete!</Text>
            </View>
            <TouchableOpacity
                onPress={() => setShowCreateGroup(true)}
                style={styles.createButton}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Users size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{userGroups.length}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>

            <View style={styles.statCard}>
              <MessageCircle size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{getTotalMembers()}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>

            <View style={styles.statCard}>
              <Trophy size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{getTotalActiveChallenges()}</Text>
              <Text style={styles.statLabel}>Challenges</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          {userGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Groups Yet</Text>
                <Text style={styles.emptyText}>
                  Create your first group to start challenging friends and earning credits together!
                </Text>

                <GradientButton
                    title="Create Your First Group"
                    onPress={() => setShowCreateGroup(true)}
                    size="large"
                    style={styles.createFirstGroupButton}
                />

                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>What you can do:</Text>
                  <View style={styles.featureItem}>
                    <Target size={16} color="#8B5CF6" />
                    <Text style={styles.featureText}>Create betting challenges</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <MessageCircle size={16} color="#8B5CF6" />
                    <Text style={styles.featureText}>Chat with group members</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <TrendingUp size={16} color="#8B5CF6" />
                    <Text style={styles.featureText}>Earn credits from winning bets</Text>
                  </View>
                </View>
              </View>
          ) : (
              <View style={styles.groupsList}>
                <Text style={styles.sectionTitle}>Your Groups</Text>

                {userGroups.map((group) => (
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
                          <Text style={styles.actionButtonText}>Add Challenge</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Display group challenges */}
                      {groupChallenges[group.id] && groupChallenges[group.id].length > 0 && (
                          <View style={styles.challengesSection}>
                            <Text style={styles.challengesTitle}>Active Challenges</Text>
                            {groupChallenges[group.id]
                                .filter(challenge => challenge.status !== 'completed')
                                .slice(0, 2) // Show only first 2 challenges
                                .map((challenge) => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        challenge={challenge}
                                        userBet={userBets[challenge.id]}
                                        onBetPlaced={() => handleChallengeInteraction(challenge.id)}
                                        onVoteSubmitted={() => handleChallengeInteraction(challenge.id)}
                                        isCreator={isUserCreator(challenge)}
                                    />
                                ))}

                            {groupChallenges[group.id].filter(c => c.status !== 'completed').length > 2 && (
                                <Text style={styles.moreChallenges}>
                                  +{groupChallenges[group.id].filter(c => c.status !== 'completed').length - 2} more challenges
                                </Text>
                            )}
                          </View>
                      )}
                    </View>
                ))}
              </View>
          )}
        </ScrollView>

        {/* Modals */}
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

        {selectedGroup && (
            <CreateChallengeModal
                visible={showCreateChallenge}
                onClose={() => setShowCreateChallenge(false)}
                group={selectedGroup}
                onChallengeCreated={handleChallengeCreated}
            />
        )}
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
    marginTop: 12,
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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  createButton: {
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
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createFirstGroupButton: {
    marginBottom: 32,
  },
  featuresContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  groupsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    marginBottom: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  groupActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  challengesSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  challengesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  moreChallenges: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
