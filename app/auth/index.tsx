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
            'Success!',
            'Account created successfully!',
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
      <SafeAreaView className="flex-1">
        <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            className="flex-1"
        >
          <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
          >
            <ScrollView className="flex-grow justify-center p-5">
              <View className="items-center mb-12">
                <View className="w-20 h-20 rounded-full justify-center items-center mb-4 bg-white/20">
                  <Zap size={48} color="#FFFFFF" />
                </View>
                <Text className="text-3xl font-bold text-white mb-2">LevelUpR</Text>
                <Text className="text-base text-gray-200 text-center">
                  Gamify your tasks, challenge your friends
                </Text>
              </View>

              <View className="flex-1 justify-center">
                <View className="bg-white rounded-3xl p-6 shadow-lg"
                      style={{ 
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8
                      }}>
                  {isSignUp && (
                      <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-200">
                        <User size={20} color="#8B5CF6" className="mr-3" />
                        <TextInput
                            className="flex-1 text-base text-gray-900"
                            placeholder="Username"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            placeholderTextColor="#9CA3AF"
                        />
                      </View>
                  )}

                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-200">
                    <Mail size={20} color="#8B5CF6" className="mr-3" />
                    <TextInput
                        className="flex-1 text-base text-gray-900"
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-200">
                    <Lock size={20} color="#8B5CF6" className="mr-3" />
                    <TextInput
                        className="flex-1 text-base text-gray-900"
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View className="mt-2 mb-4">
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
                    <Text className="text-sm text-purple-600 font-medium">
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
        </LinearGradient>
      </SafeAreaView>
  );
}
