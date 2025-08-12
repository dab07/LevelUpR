import { supabase } from '@/lib/supabase';
import { CreditTransaction } from '@/types';

class CreditService {
  async getUserCredits(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data.credits;
  }

  async addCredits(userId: string, amount: number, type: CreditTransaction['type'], description: string, relatedId?: string): Promise<void> {
    const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount,
          type,
          description,
          related_id: relatedId,
        });

    if (transactionError) throw transactionError;

    const { error: updateError } = await supabase.rpc('increment_user_credits', {
      user_id: userId,
      amount_to_add: amount,
    });

    if (updateError) throw updateError;
  }

  async deductCredits(userId: string, amount: number, type: CreditTransaction['type'], description: string, relatedId?: string): Promise<boolean> {
    const currentCredits = await this.getUserCredits(userId);

    if (currentCredits < amount) {
      return false; // Insufficient credits
    }

    await this.addCredits(userId, -amount, type, description, relatedId);
    return true;
  }

  async processDailyLogin(userId: string): Promise<boolean> {
    const { data: user, error } = await supabase
        .from('users')
        .select('last_login_date, daily_login_streak')
        .eq('id', userId)
        .single();

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const lastLogin = user.last_login_date?.split('T')[0];

    if (lastLogin === today) {
      return false; // Already logged in today
    }

    const isConsecutive = lastLogin === new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = isConsecutive ? user.daily_login_streak + 1 : 0;

    await supabase
        .from('users')
        .update({
          last_login_date: new Date().toISOString(),
          daily_login_streak: newStreak,
        })
        .eq('id', userId);

    await this.addCredits(userId, 1, 'reward', 'Daily login reward');
    return true;
  }

  async getTransactionHistory(userId: string, limit = 50): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
  }
}

export const creditService = new CreditService();
