import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
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
          'Account created successfully! You can now sign in.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      } else {
        await signInWithEmail(email, password);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.background}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Zap size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>LevelUpR</Text>
              <Text style={styles.subtitle}>
                Gamify your tasks, challenge your friends
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.form}>
                {isSignUp && (
                  <View style={styles.inputContainer}>
                    <User size={20} color="#8B5CF6" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Mail size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#8B5CF6" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <GradientButton
                  title={loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                  onPress={handleAuth}
                  disabled={loading}
                  size="large"
                  style={styles.authButton}
                />

                <TouchableOpacity
                  onPress={() => setIsSignUp(!isSignUp)}
                  style={styles.switchButton}
                >
                  <Text style={styles.switchText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  authButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
});