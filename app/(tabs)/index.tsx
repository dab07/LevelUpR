import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Zap, Bell, User, TrendingUp, Target, CheckCircle2 } from 'lucide-react-native';
import { CHALLENGE_CONFIG } from '@/lib/config';

import CreditDisplay from '@/components/ui/CreditDisplay';
import GradientButton from '@/components/ui/GradientButton';
import MainTaskCard from '@/components/tasks/MainTaskCard';
import TaskCard from '@/components/tasks/TaskCard';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
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
  const [showCreateTask, setShowCreateTask] = useState(false);
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
      await checkDailyLoginStatus(user.id);
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
      const [userCredits, userCreatedTasks, userProfile] = await Promise.all([
        creditService.getUserCredits(userId),
        taskService.getUserCreatedTasks(userId),
        getUserProfile(userId)
      ]);

      setCredits(userCredits);
      setTasks(userCreatedTasks);
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

  const checkDailyLoginStatus = async (userId: string) => {
    try {
      // Check if user has already claimed daily login today
      const { data: user, error } = await supabase
        .from('users')
        .select('last_login_date')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const lastLogin = user.last_login_date?.split('T')[0];

      // If last login was today, daily login is already completed
      setDailyLoginCompleted(lastLogin === today);
    } catch (error) {
      console.error('Error checking daily login status:', error);
    }
  };

  const handleDailyLoginClaim = async () => {
    if (!user || dailyLoginCompleted) return;

    console.log('Claiming daily login for user:', user.id);

    try {
      // Implement daily login logic directly to avoid import issues
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('last_login_date, daily_login_streak')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const lastLogin = userProfile.last_login_date?.split('T')[0];

      if (lastLogin === today) {
        Alert.alert('Already Claimed', 'You have already claimed your daily login reward today.');
        setDailyLoginCompleted(true);
        return;
      }

      // Calculate new streak
      const isConsecutive = lastLogin === new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = isConsecutive ? userProfile.daily_login_streak + 1 : 1;

      // Update user's last login date and streak
      await supabase
        .from('users')
        .update({
          last_login_date: new Date().toISOString(),
          daily_login_streak: newStreak,
        })
        .eq('id', user.id);

      // Add credits
      await creditService.addCredits(user.id, 1, 'reward', 'Daily login reward');

      // Update local state
      setDailyLoginCompleted(true);
      setStreak(newStreak);

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

    // Only allow claiming if goal is actually reached
    const goalReached = stepService.isGoalReached(stepData);
    if (!goalReached) {
      Alert.alert('Goal Not Reached', 'You need to complete your step goal before claiming the reward.');
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
    setShowCreateTask(true);
  };

  const handleTaskCreated = async () => {
    if (!user) return;

    // Reload tasks after creation
    try {
      const userCreatedTasks = await taskService.getUserCreatedTasks(user.id);
      setTasks(userCreatedTasks);
    } catch (error) {
      console.error('Error reloading tasks:', error);
    }
  };

  const onRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    await Promise.all([
      loadUserData(user.id),
      checkDailyLoginStatus(user.id),
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
              <View className="w-12 h-12 rounded-full bg-[#8A83DA] items-center justify-center mr-3">
                <User size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">Derek Doyle</Text>
                <Text className="text-gray-400 text-sm">Product Manager</Text>
              </View>
            </View>
            <TouchableOpacity className="relative">
              <Bell size={24} color="#8A83DA" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Credits Container */}
        <View className="px-5 mb-4">
          <View className="bg-[#2A2A2A] rounded-2xl p-4 border border-gray-700">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-semibold text-lg">Your Aura Points</Text>
              <CreditDisplay credits={credits} size="large" />
            </View>
          </View>
        </View>

        {/* Main Tasks Container */}
        <View className="px-5 mb-4">
          <LinearGradient
            colors={['#000000', '#262335']}
            className="rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-bold text-lg">Today's Tasks</Text>
            </View>

            {/* Daily Login Task */}
            <MainTaskCard
              title="Daily Login"
              description="Check in to earn your daily credit"
              isCompleted={dailyLoginCompleted}
              onClaim={handleDailyLoginClaim}
            />

            {/* Step Counter Task */}
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

            {/* Meditation Task */}
            <MainTaskCard
              title="Meditation Timer"
              description="Take time to meditate and relax"
              isCompleted={meditationCompleted}
              onClaim={() => { }} // Handled by timer component
            >
              <MeditationTimer onComplete={handleMeditationComplete} />
            </MainTaskCard>
          </LinearGradient>
        </View>

        {/* Extra Tasks Container */}
        <View className="px-5 mb-6">
          <View className="bg-[#2A2A2A] rounded-2xl p-4 border border-gray-700">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-bold text-lg">Extra Tasks</Text>
              <GradientButton
                title="Add Task"
                onPress={handleCreateTask}
                size="small"
                disabled={totalExtraTasks >= CHALLENGE_CONFIG.MAX_EXTRA_TASKS}
              />
            </View>

            {totalExtraTasks === 0 ? (
              <View className="items-center py-6">
                <Plus size={32} color="#6B7280" />
                <Text className="text-gray-400 mt-2 text-center">No extra tasks yet</Text>
                <Text className="text-gray-500 text-sm mt-1">Create your first task!</Text>
              </View>
            ) : (
              <View className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {completedMainTasks === 3 && (
          <View className="mx-5 mb-6 rounded-2xl overflow-hidden">
            <LinearGradient
              colors={['#10B981', '#059669']}
              className="p-4 items-center"
            >
              <Text className="text-xl font-bold text-white mb-2">🎉 All Tasks Complete!</Text>
              <Text className="text-sm text-green-100 text-center">
                Great job! You've completed all your tasks for today.
              </Text>
            </LinearGradient>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>

      <CreateTaskModal
        visible={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={handleTaskCreated}
        userId={user?.id || ''}
      />
    </SafeAreaView>
  );
}


