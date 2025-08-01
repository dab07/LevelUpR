import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import {User, Challenge} from '@/types';

export interface ChallengeHistoryItem {
    id: string;
    title: string;
    description: string;
    completedAt: string;
    isCompleted: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    creditsEarned: number;
    totalParticipants: number;
}

export interface PasswordUpdateData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

class ProfileService {
    // Get user profile data
    async getUserProfile(userId: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    // Update user profile information
    async updateProfile(userId: string, updates: Partial<User>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    username: updates.username,
                    display_name: updates.displayName,
                    avatar_url: updates.avatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    }

    // Check username availability
    async checkUsernameAvailability(username: string, currentUserId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .neq('id', currentUserId)
                .single();

            if (error && error.code === 'PGRST116') {
                // No rows returned, username is available
                return true;
            }

            return !data; // If data exists, username is taken
        } catch (error) {
            console.error('Error checking username availability:', error);
            return false;
        }
    }

    // Validate password strength
    validatePassword(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Update user password
    async updatePassword(passwordData: PasswordUpdateData): Promise<{ success: boolean; error?: string }> {
        try {
            // Validate new password
            const validation = this.validatePassword(passwordData.newPassword);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join('\n') };
            }

            // Check if new password matches confirmation
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                return { success: false, error: 'New passwords do not match' };
            }

            // Verify current password by attempting to sign in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                return { success: false, error: 'User not found' };
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordData.currentPassword,
            });

            if (signInError) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.newPassword,
            });

            if (updateError) {
                return { success: false, error: updateError.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating password:', error);
            return { success: false, error: 'Failed to update password' };
        }
    }

    // Handle image upload
    async uploadProfileImage(userId: string): Promise<string | null> {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
                return null;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (result.canceled) return null;

            const asset = result.assets[0];

            // Check file size (5MB limit)
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
                return null;
            }

            // Resize image to optimize storage
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 400, height: 400 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            // Convert to blob for upload
            const response = await fetch(manipulatedImage.uri);
            const blob = await response.blob();

            // Generate unique filename
            const fileExt = 'jpg';
            const fileName = `${userId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
            return null;
        }
    }

    // Get challenge history
    async getChallengeHistory(userId: string): Promise<ChallengeHistoryItem[]> {
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select(`
          id,
          title,
          description,
          created_at,
          is_completed,
          minimum_bet,
          total_credits_pool,
          bets!inner(user_id, amount, payout)
        `)
                .eq('bets.user_id', userId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(challenge => ({
                id: challenge.id,
                title: challenge.title,
                description: challenge.description,
                completedAt: challenge.created_at,
                isCompleted: challenge.is_completed || false,
                difficulty: this.getDifficultyLevel(challenge.minimum_bet),
                creditsEarned: challenge.bets[0]?.payout || 0,
                totalParticipants: challenge.total_credits_pool / challenge.minimum_bet,
            }));
        } catch (error) {
            console.error('Error fetching challenge history:', error);
            return [];
        }
    }

    // Determine difficulty level based on minimum bet
    private getDifficultyLevel(minimumBet: number): 'easy' | 'medium' | 'hard' {
        if (minimumBet <= 5) return 'easy';
        if (minimumBet <= 15) return 'medium';
        return 'hard';
    }

    // Logout user
    async logout(): Promise<boolean> {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error logging out:', error);
            return false;
        }
    }

    // Get user statistics
    async getUserStats(userId: string): Promise<any> {
        try {
            const { data, error } = await supabase.rpc('get_user_stats', {
                user_id: userId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return null;
        }
    }
}

export const profileService = new ProfileService();
