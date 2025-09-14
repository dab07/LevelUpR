import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, MessageCircle, Target, TrendingUp } from 'lucide-react-native';

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
        <SafeAreaView className="flex-1 bg-[#1A1A1A]">
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#8A83DA" />
            <Text className="text-base text-gray-400 mt-3">Loading social features...</Text>
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView className="flex-1 bg-[#1A1A1A]">
        <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          {/* Header with User Info */}
          <View className="px-5 pt-4 pb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View>
                  <Text className="text-white font-bold text-lg">Your Guilds</Text>
                  <Text className="text-gray-400 text-sm">Join & Compete</Text>
                </View>
              </View>
              <TouchableOpacity
                  onPress={() => setShowCreateGroup(true)}
                  className="w-10 h-10 rounded-full bg-[#8A83DA] items-center justify-center"
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Container */}
          <View className="px-5 mb-4">
            <View className="bg-[#2A2A2A] rounded-2xl p-4 border border-gray-700">
              <Text className="text-white font-semibold text-lg mb-3">Your Stats</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-white">{userGroups.length}</Text>
                  <Text className="text-gray-400 text-xs">Guilds</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-white">{getTotalMembers()}</Text>
                  <Text className="text-gray-400 text-xs">Members</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-white">{getTotalActiveChallenges()}</Text>
                  <Text className="text-gray-400 text-xs">Challenges</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Groups Container */}
          <View className="px-5 mb-6">
            {userGroups.length === 0 ? (
              <View className="bg-[#2A2A2A] rounded-2xl p-6 border border-gray-700 items-center">
                <Users size={48} color="#6B7280" />
                <Text className="text-lg font-bold text-white mt-4 mb-2">No Guild Yet</Text>
                <Text className="text-gray-400 text-center mb-4">
                  Create your first guild to start challenging friends!
                </Text>
                <GradientButton
                    title="Create Group"
                    onPress={() => setShowCreateGroup(true)}
                    size="medium"
                />
                
                <View className="mt-4 w-full">
                  <Text className="text-white font-semibold mb-3">Features:</Text>
                  <View className="flex-row items-center mb-2">
                    <Target size={16} color="#8A83DA" />
                    <Text className="text-gray-400 ml-3 text-sm">Fight with your Aura</Text>
                  </View>
                  <View className="flex-row items-center mb-2">
                    <MessageCircle size={16} color="#8A83DA" />
                    <Text className="text-gray-400 ml-3 text-sm">Chat with members</Text>
                  </View>
                  <View className="flex-row items-center">
                    <TrendingUp size={16} color="#8A83DA" />
                    <Text className="text-gray-400 ml-3 text-sm">Farm Aura from challenges</Text>
                  </View>
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={['#8A83DA', '#463699']}
                className="rounded-2xl p-4"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-bold text-lg">Your Guilds</Text>
                  <Text className="text-white/80 text-sm">See All</Text>
                </View>

                {userGroups.map((group) => (
                    <View key={group.id} className="bg-white/10 rounded-xl p-3 mb-3 last:mb-0">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-1">
                          <Text className="text-white font-semibold">{group.name}</Text>
                          <Text className="text-white/70 text-sm">
                            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                              onPress={() => handleOpenGroupChat(group)}
                              className="bg-white/20 px-3 py-1.5 rounded-lg"
                          >
                            <Text className="text-white text-xs font-medium">Chat</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                              onPress={() => handleCreateChallenge(group)}
                              className="bg-white/20 px-3 py-1.5 rounded-lg"
                          >
                            <Text className="text-white text-xs font-medium">Challenge</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Active Challenges Preview */}
                      {groupChallenges[group.id] && groupChallenges[group.id].length > 0 && (
                          <View className="border-t border-white/20 pt-2 mt-2">
                            <Text className="text-white/80 text-xs mb-2">
                              {groupChallenges[group.id].filter(c => c.status !== 'completed').length} active challenges
                            </Text>
                          </View>
                      )}
                    </View>
                ))}
              </LinearGradient>
            )}
          </View>

          {/* Active Challenges Section */}
          {userGroups.length > 0 && Object.values(groupChallenges).flat().length > 0 && (
            <View className="px-5 mb-6">
              <Text className="text-white font-bold text-lg mb-4">Active Challenges</Text>
              {Object.entries(groupChallenges).map(([groupId, challenges]) => {
                const group = userGroups.find(g => g.id === groupId);
                if (!group || challenges.length === 0) return null;
                
                return (
                  <View key={groupId} className="mb-4">
                    <Text className="text-gray-400 text-sm mb-2 font-medium">{group.name}</Text>
                    {challenges.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        userBet={userBets[challenge.id]}
                        onBetPlaced={handleBetPlaced}
                        onVoteSubmitted={handleVoteSubmitted}
                        isCreator={isUserCreator(challenge)}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          <View className="h-20" />
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


