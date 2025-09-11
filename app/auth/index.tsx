import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Zap, Mail, Lock, User } from 'lucide-react-native';

import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import GradientButton from '@/components/ui/GradientButton';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !username)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, username);
        Alert.alert(
            'Check Your Email!',
            'We sent you a confirmation link. Please check your email and click the link to activate your account.',
            [{ text: 'OK', onPress: () => {
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setUsername('');
              }}]
        );
      } else {
        const { user } = await signInWithEmail(email, password);
        if (user) {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
      <SafeAreaView className="flex-1 bg-[#1A1A1A]">
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
          <ScrollView className="flex-1 p-5">
            <View className="items-center mt-16 mb-12">
              <LinearGradient
                colors={['#8A83DA', '#463699']}
                className="w-20 h-20 rounded-full justify-center items-center mb-6"
              >
                <Zap size={48} color="#FFFFFF" />
              </LinearGradient>
              <Text className="text-3xl font-bold text-white mb-2">LevelUpR</Text>
              <Text className="text-base text-gray-400 text-center">
                Gamify your tasks, challenge your friends
              </Text>
            </View>

            <View className="flex-1 justify-center">
              <View className="bg-[#2A2A2A] rounded-3xl p-6 border border-gray-700">
                <Text className="text-2xl font-bold text-white mb-6 text-center">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </Text>

                {isSignUp && (
                    <View className="flex-row items-center bg-[#333333] rounded-xl px-4 py-4 mb-4 border border-gray-600">
                      <User size={20} color="#8A83DA" />
                      <TextInput
                          className="flex-1 text-base text-white ml-3"
                          placeholder="Username"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                          placeholderTextColor="#6B7280"
                      />
                    </View>
                )}

                <View className="flex-row items-center bg-[#333333] rounded-xl px-4 py-4 mb-4 border border-gray-600">
                  <Mail size={20} color="#8A83DA" />
                  <TextInput
                      className="flex-1 text-base text-white ml-3"
                      placeholder="Email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#6B7280"
                  />
                </View>

                <View className="flex-row items-center bg-[#333333] rounded-xl px-4 py-4 mb-6 border border-gray-600">
                  <Lock size={20} color="#8A83DA" />
                  <TextInput
                      className="flex-1 text-base text-white ml-3"
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholderTextColor="#6B7280"
                  />
                </View>

                <View className="mb-4">
                  <GradientButton
                      title={loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                      onPress={handleAuth}
                      disabled={loading}
                      size="large"
                  />
                </View>

                <TouchableOpacity
                    onPress={() => setIsSignUp(!isSignUp)}
                    className="items-center py-3"
                >
                  <Text className="text-sm text-[#8A83DA] font-medium">
                    {isSignUp
                        ? 'Already have an account? Sign In'
                        : "Don't have an account? Sign Up"
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}
