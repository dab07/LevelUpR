import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('Confirming your account...');
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check if we have auth tokens in the URL params
                const { access_token, refresh_token, type } = params;

                if (access_token && refresh_token) {
                    // Set the session using the tokens from the URL
                    const { data, error } = await supabase.auth.setSession({
                        access_token: access_token as string,
                        refresh_token: refresh_token as string,
                    });

                    if (error) {
                        console.error('Error setting session:', error.message);
                        setMessage('Error confirming account. Please try again.');
                        setTimeout(() => router.replace('/auth'), 2000);
                        return;
                    }

                    if (data.session) {
                        console.log('User confirmed & signed in:', data.session.user);
                        setMessage('Account confirmed! Redirecting...');

                        // Small delay to show success message
                        setTimeout(() => {
                            router.replace('/(tabs)');
                        }, 1000);
                    } else {
                        setMessage('No session found. Redirecting to login...');
                        setTimeout(() => router.replace('/auth'), 2000);
                    }
                } else {
                    // Fallback: check if user is already authenticated
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session) {
                        console.log('User already authenticated:', session.user);
                        router.replace('/(tabs)');
                    } else {
                        setMessage('No authentication data found. Redirecting to login...');
                        setTimeout(() => router.replace('/auth'), 2000);
                    }
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                setMessage('An error occurred. Redirecting to login...');
                setTimeout(() => router.replace('/auth'), 2000);
            } finally {
                setLoading(false);
            }
        };

        handleAuthCallback();
    }, [router, params]);

    return (
        <View className="flex-1 justify-center items-center bg-black">
            <ActivityIndicator size="large" color="#8A83DA" />
            <Text className="text-white mt-4 text-lg text-center px-6">{message}</Text>
        </View>
    );
}
