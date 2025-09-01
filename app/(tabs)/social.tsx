import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  const voteSubscriptionRef = useRef<any>(null);

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
      if (voteSubscriptionRef.current) {
        voteSubscriptionRef.current.unsubscribe();
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

    // Subscribe to completion_votes updates
    voteSubscriptionRef.current = supabase
      .channel('completion_votes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'completion_votes'
        }, 
        (payload) => {
          console.log('Vote update received:', payload);
          // Refresh data when votes are updated
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
      // Fix any stuck challenges before loading
      await challengeService.fixStuckChallenges();
      
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
    await loadUserGroups(user.id, true); // Force refresh after vote submission
  };

  const handleChallengeInteraction = async (challengeId: string) => {
    // Refresh specific challenge status when user interacts with it
    await challengeService.refreshChallengeStatus(challengeId);
    if (user) {
      await loadUserGroups(user.id, true); // Force refresh after interaction
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
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text className="text-base text-gray-500 mt-3">Loading social features...</Text>
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            className="px-5 py-6 rounded-b-3xl"
        >
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-2xl font-bold text-white mb-1">Social Hub 👥</Text>
              <Text className="text-base text-gray-200">Connect, challenge, and compete!</Text>
            </View>
            <TouchableOpacity
                onPress={() => setShowCreateGroup(true)}
                className="w-11 h-11 rounded-full bg-white/20 justify-center items-center"
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white/20 rounded-2xl p-4 items-center">
              <Users size={20} color="#8B5CF6" />
              <Text className="text-xl font-bold text-white mt-2 mb-1">{userGroups.length}</Text>
              <Text className="text-xs text-gray-200 font-medium">Groups</Text>
            </View>

            <View className="flex-1 bg-white/20 rounded-2xl p-4 items-center">
              <MessageCircle size={20} color="#8B5CF6" />
              <Text className="text-xl font-bold text-white mt-2 mb-1">{getTotalMembers()}</Text>
              <Text className="text-xs text-gray-200 font-medium">Members</Text>
            </View>

            <View className="flex-1 bg-white/20 rounded-2xl p-4 items-center">
              <Trophy size={20} color="#8B5CF6" />
              <Text className="text-xl font-bold text-white mt-2 mb-1">{getTotalActiveChallenges()}</Text>
              <Text className="text-xs text-gray-200 font-medium">Challenges</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
            className="flex-1 -mt-3"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          {userGroups.length === 0 ? (
              <View className="items-center py-15 px-5">
                <Users size={64} color="#D1D5DB" />
                <Text className="text-2xl font-bold text-gray-900 mt-4 mb-2">No Groups Yet</Text>
                <Text className="text-base text-gray-500 text-center leading-6 mb-8">
                  Create your first group to start challenging friends and earning credits together!
                </Text>

                <GradientButton
                    title="Create Your First Group"
                    onPress={() => setShowCreateGroup(true)}
                    size="large"
                    style={{ marginBottom: 32 }}
                />

                <View className="items-start w-full">
                  <Text className="text-lg font-semibold text-gray-900 mb-4">What you can do:</Text>
                  <View className="flex-row items-center mb-3">
                    <Target size={16} color="#8B5CF6" />
                    <Text className="text-base text-gray-500 ml-3">Create betting challenges</Text>
                  </View>
                  <View className="flex-row items-center mb-3">
                    <MessageCircle size={16} color="#8B5CF6" />
                    <Text className="text-base text-gray-500 ml-3">Chat with group members</Text>
                  </View>
                  <View className="flex-row items-center mb-3">
                    <TrendingUp size={16} color="#8B5CF6" />
                    <Text className="text-base text-gray-500 ml-3">Earn credits from winning bets</Text>
                  </View>
                </View>
              </View>
          ) : (
              <View className="p-5">
                <Text className="text-xl font-bold text-gray-900 mb-4">Your Groups</Text>

                {userGroups.map((group) => (
                    <View key={group.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                      <View className="mb-4">
                        <View className="flex-1">
                          <Text className="text-lg font-semibold text-gray-900 mb-1">{group.name}</Text>
                          <Text className="text-sm text-violet-500 font-medium mb-2">
                            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                          </Text>
                          {group.description && (
                              <Text className="text-sm text-gray-500 leading-5" numberOfLines={2}>
                                {group.description}
                              </Text>
                          )}
                        </View>
                      </View>

                      <View className="flex-row gap-3 mb-4">
                        <TouchableOpacity
                            onPress={() => handleOpenGroupChat(group)}
                            className="flex-1 flex-row items-center justify-center bg-violet-50 py-2.5 rounded-lg border border-violet-100"
                        >
                          <MessageCircle size={16} color="#8B5CF6" />
                          <Text className="text-sm font-medium text-violet-500 ml-1.5">Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleCreateChallenge(group)}
                            className="flex-1 flex-row items-center justify-center bg-violet-50 py-2.5 rounded-lg border border-violet-100"
                        >
                          <Trophy size={16} color="#10B981" />
                          <Text className="text-sm font-medium text-violet-500 ml-1.5">Add Challenge</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Display group challenges */}
                      {groupChallenges[group.id] && groupChallenges[group.id].length > 0 && (
                          <View className="border-t border-gray-200 pt-4">
                            <Text className="text-base font-semibold text-gray-900 mb-3">Active Challenges</Text>
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
                                <Text className="text-sm text-violet-500 font-medium text-center mt-2 italic">
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


