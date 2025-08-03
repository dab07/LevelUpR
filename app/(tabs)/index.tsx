import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Zap } from 'lucide-react-native';

import CreditDisplay from '@/components/ui/CreditDisplay';
import GradientButton from '@/components/ui/GradientButton';
import MainTaskCard from '@/components/tasks/MainTaskCard';
import StepCounter from '@/components/tasks/StepCounter';
import MeditationTimer from '@/components/tasks/MeditationTimer';
import { taskService } from '@/services/taskService';
import { creditService } from '@/services/creditService';
import { stepService } from '@/services/stepService';
import { meditationService } from '@/services/meditationService';
import { supabase } from '@/lib/supabase';
import { Task, StepData } from '@/types';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stepData, setStepData] = useState<StepData>({ steps: 0, goal: 6000, lastUpdated: '' });
  const [credits, setCredits] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dailyLoginCompleted, setDailyLoginCompleted] = useState(false);
  const [meditationCompleted, setMeditationCompleted] = useState(false);
  const [pedometerError, setPedometerError] = useState<string | null>(null);
  const pedometerInitialized = useRef(false);

  useEffect(() => {
    initialize();

    // Cleanup pedometer on unmount
    return () => {
      stepService.stopPedometerTracking();
    };
  }, []);

  const initialize = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);
      await loadUserData(user.id);
      await processDailyLogin(user.id);
      await initializePedometer();
      await checkMeditationStatus();
    } catch (error) {
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePedometer = async () => {
    if (pedometerInitialized.current) return;

    try {
      // Load initial step data
      const initialStepData = await stepService.getStepData();
      setStepData(initialStepData);

      // Start pedometer tracking
      const success = await stepService.startPedometerTracking((newStepData) => {
        setStepData(newStepData);

        // Check if goal was just reached
        if (stepService.isGoalReached(newStepData) && !stepService.isGoalReached(stepData)) {
          handleStepGoalComplete();
        }
      });

      if (!success) {
        setPedometerError('Step tracking unavailable. Please enable motion permissions in settings.');
      } else {
        setPedometerError(null);
      }

      pedometerInitialized.current = true;
    } catch (error) {
      console.error('Error initializing pedometer:', error);
      setPedometerError('Failed to initialize step tracking.');
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

  const checkMeditationStatus = async () => {
    try {
      const completed = await meditationService.hasCompletedTodaysMeditation();
      setMeditationCompleted(completed);
    } catch (error) {
      console.error('Error checking meditation status:', error);
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
      setDailyLoginCompleted(!rewardGiven); // If reward was given, login wasn't completed before
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

  const handleDailyLoginClaim = async () => {
    if (!user || dailyLoginCompleted) return;

    console.log('Claiming daily login for user:', user.id);

    try {
      await creditService.addCredits(user.id, 1, 'reward', 'Daily login reward');
      setDailyLoginCompleted(true);

      // Refresh credits
      const newCredits = await creditService.getUserCredits(user.id);
      setCredits(newCredits);

      console.log('Daily login claimed successfully, new credits:', newCredits);
      Alert.alert('🎉 Daily Login!', 'You earned 1 credit for logging in today!');
    } catch (error) {
      console.error('Error claiming daily login:', error);
      Alert.alert('Error', 'Failed to claim daily login reward. Please try again.');
    }
  };

    const handleStepGoalComplete = async () => {
        if (!user) return;

        // Check if goal is already reached to prevent double claiming
        const goalAlreadyReached = stepService.isGoalReached(stepData);
        if (!goalAlreadyReached) {
            console.log("Goal is achieved yet, run to get faster result");
            return;
        }

        console.log('Claiming step goal completion for user:', user.id);
        try {
          await creditService.addCredits(user.id, 1, 'reward', 'Step goal completion');

          // Refresh credits
          const newCredits = await creditService.getUserCredits(user.id);
          setCredits(newCredits);

          console.log('Step goal claimed successfully, new credits:', newCredits);
          Alert.alert('🚶‍♀️ Step Goal Reached!', 'You earned 1 credit for reaching your step goal!');
        } catch (error) {
          console.error('Error claiming step reward:', error);
          Alert.alert('Error', 'Failed to claim step reward. Please try again.');
        }
    };

  const handleMeditationComplete = async () => {
    if (!user || meditationCompleted) return;

    console.log('Claiming meditation completion for user:', user.id);
    try {
      await creditService.addCredits(user.id, 1, 'reward', 'Meditation completion');
      setMeditationCompleted(true);

      // Refresh credits
      const newCredits = await creditService.getUserCredits(user.id);
      setCredits(newCredits);
    } catch (error) {
      console.error('Error claiming meditation reward:', error);
      Alert.alert('Error', 'Failed to claim meditation reward. Please try again.');
    }
  };

  const handleUpdateStepGoal = async (goal: number) => {
    try {
      const newStepData = await stepService.updateGoal(goal);
      setStepData(newStepData);
    } catch (error) {
      console.error('Error updating step goal:', error);
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

      console.log('Meditation claimed successfully, new credits:', newCredits);
      Alert.alert('🧘‍♀️ Meditation Complete!', 'You earned 1 credit for completing your meditation!');
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
    await Promise.all([
      loadUserData(user.id),
      checkMeditationStatus(),
    ]);
    setRefreshing(false);
  };

  const completedMainTasks = [
    dailyLoginCompleted,
    stepService.isGoalReached(stepData),
    meditationCompleted,
  ].filter(Boolean).length;

  const completedExtraTasks = tasks.filter(task => task.isCompleted).length;
  const totalExtraTasks = tasks.length;

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
              <Zap size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{completedMainTasks}/3</Text>
              <Text style={styles.statLabel}>Main Tasks</Text>
            </View>

            <View style={styles.statCard}>
              <Plus size={20} color="#10B981" />
              <Text style={styles.statNumber}>{completedExtraTasks}/{totalExtraTasks}</Text>
              <Text style={styles.statLabel}>Extra Tasks</Text>
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
            <Text style={styles.sectionTitle}>Main Tasks</Text>

            <MainTaskCard
                title="Daily Login"
                description="Check in to earn your daily credit"
                isCompleted={dailyLoginCompleted}
                onClaim={handleDailyLoginClaim}
            />

            <MainTaskCard
                title="Step Counter"
                description={`Walk ${stepData.goal.toLocaleString()} steps today`}
                isCompleted={stepService.isGoalReached(stepData)}
                onClaim={handleStepGoalComplete}
            >
              <StepCounter
                  stepData={stepData}
                  onUpdateGoal={handleUpdateStepGoal}
                  pedometerError={pedometerError}
              />
            </MainTaskCard>

            <MainTaskCard
                title="Meditation Timer"
                description="Take time to meditate and relax"
                isCompleted={meditationCompleted}
                onClaim={() => {}} // Handled by timer component
            >
              <MeditationTimer onComplete={handleMeditationComplete} />
            </MainTaskCard>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Extra Tasks</Text>
              <GradientButton
                  title="Add Task"
                  onPress={handleCreateTask}
                  size="small"
                  style={styles.addButton}
              />
            </View>

            <Text style={styles.taskLimitText}>Only 2 tasks can be created</Text>

            {totalExtraTasks === 0 ? (
                <View style={styles.emptyState}>
                  <Plus size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No tasks yet</Text>
                  <Text style={styles.emptySubtext}>Create your first extra task!</Text>
                </View>
            ) : (
                <Text style={styles.comingSoon}>Extra tasks coming soon...</Text>
            )}
          </View>

          {completedMainTasks === 3 && (
              <View style={styles.congratsCard}>
                <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.congratsGradient}
                >
                  <Text style={styles.congratsTitle}>🎉 Main Tasks Complete!</Text>
                  <Text style={styles.congratsText}>
                    You've completed all your main tasks for today. Great job!
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
  taskLimitText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
  comingSoon: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 32,
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
