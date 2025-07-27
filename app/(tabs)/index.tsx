import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Zap } from 'lucide-react-native';

import CreditDisplay from '@/components/ui/CreditDisplay';
import GradientButton from '@/components/ui/GradientButton';
import TaskCard from '@/components/tasks/TaskCard';
import { taskService } from '@/services/taskService';
import { creditService } from '@/services/creditService';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [credits, setCredits] = useState(0);
  const [streak, setStreak] = useState(0);
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
      await loadUserData(user.id);
      await processDailyLogin(user.id);
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const [userCredits, todaysTasks, userProfile] = await Promise.all([
        creditService.getUserCredits(userId),
        taskService.getTodaysTasks(userId),
        getUserProfile(userId)
      ]);

      setCredits(userCredits);
      setTasks(todaysTasks);
      setStreak(userProfile?.daily_login_streak || 0);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('daily_login_streak')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  };

  const processDailyLogin = async (userId: string) => {
    try {
      const rewardGiven = await creditService.processDailyLogin(userId);
      if (rewardGiven) {
        Alert.alert(
          '🎉 Daily Reward!',
          'You received 1 credit for logging in today!',
          [{ text: 'Awesome!', style: 'default' }]
        );
        // Refresh credits after reward
        const newCredits = await creditService.getUserCredits(userId);
        setCredits(newCredits);
      }
    } catch (error) {
      console.error('Error processing daily login:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      await taskService.completeTask(taskId, user.id);
      
      // Update local state
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, isCompleted: true, completedAt: new Date().toISOString() }
            : task
        )
      );

      // Refresh credits
      const newCredits = await creditService.getUserCredits(user.id);
      setCredits(newCredits);

      Alert.alert('🎉 Task Completed!', 'You earned 1 credit!');
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  const handleCreateTask = () => {
    // Navigate to task creation screen
    console.log('Navigate to create task');
  };

  const onRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    await loadUserData(user.id);
    setRefreshing(false);
  };

  const completedTasks = tasks.filter(task => task.isCompleted).length;
  const totalTasks = tasks.length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Good morning! 👋</Text>
            <Text style={styles.subtitle}>Ready to level up today?</Text>
          </View>
          <CreditDisplay credits={credits} size="large" />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Calendar size={20} color="#8B5CF6" />
            <Text style={styles.statNumber}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Zap size={20} color="#10B981" />
            <Text style={styles.statNumber}>{completedTasks}/{totalTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            <GradientButton
              title="Add Task"
              onPress={handleCreateTask}
              size="small"
              style={styles.addButton}
            />
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Plus size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>Create your first task to get started!</Text>
            </View>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
              />
            ))
          )}
        </View>

        {completedTasks === totalTasks && totalTasks > 0 && (
          <View style={styles.congratsCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.congratsGradient}
            >
              <Text style={styles.congratsTitle}>🎉 All Done!</Text>
              <Text style={styles.congratsText}>
                You've completed all your tasks for today. Great job!
              </Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
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
  section: {
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
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  congratsCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  congratsGradient: {
    padding: 20,
    alignItems: 'center',
  },
  congratsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  congratsText: {
    fontSize: 14,
    color: '#E5F7F0',
    textAlign: 'center',
    lineHeight: 20,
  },
});