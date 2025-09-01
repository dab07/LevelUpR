import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function RootIndex() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className='flex-1'>
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          className='flex-1 justify-center items-center'
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text className="text-white text-lg font-semibold mt-4">Loading LevelUpR...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // If user is authenticated, redirect to tabs
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  // If not authenticated, redirect to auth
  return <Redirect href="/auth" />;
}

