import { supabase } from '@/lib/supabase';
import { Task } from '@/types';
import { creditService } from './creditService';
import { CHALLENGE_CONFIG } from '@/lib/config';

class TaskService {
    async createTask(userId: string, taskData: Omit<Task, 'id' | 'userId' | 'isCompleted' | 'completedAt' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        // Check if user already has maximum extra tasks
        // Note: This only counts user-created custom tasks, not the 3 main tasks (login, steps, meditation)
        const { data: existingTasks, error: countError } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', userId)
            .eq('is_daily', false) // Only count custom tasks
            .gte('due_date', new Date().toISOString()); // Only count active/future tasks

        if (countError) throw countError;

        if (existingTasks && existingTasks.length >= CHALLENGE_CONFIG.MAX_EXTRA_TASKS) {
            throw new Error(`Maximum of ${CHALLENGE_CONFIG.MAX_EXTRA_TASKS} extra tasks allowed`);
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: userId,
                title: taskData.title,
                description: taskData.description,
                is_daily: taskData.isDaily,
                credit_reward: taskData.creditReward,
                due_date: taskData.dueDate,
                category: taskData.category,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async completeTask(taskId: string, userId: string): Promise<void> {
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single();

        if (fetchError) throw fetchError;

        if (task.is_completed) {
            throw new Error('Task already completed');
        }

        const { error: updateError } = await supabase
            .from('tasks')
            .update({
                is_completed: true,
                completed_at: new Date().toISOString(),
            })
            .eq('id', taskId);

        if (updateError) throw updateError;

        // Award credits
        await creditService.addCredits(
            userId,
            task.credit_reward,
            'reward',
            `Task completion: ${task.title}`,
            taskId
        );

        // Update user XP and stats
        await this.updateUserProgress(userId);
    }

    async getTodaysTasks(userId: string): Promise<Task[]> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('is_daily', true)
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async getUserCreatedTasks(userId: string): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('is_daily', false) // Custom tasks with deadlines
            .gte('due_date', new Date().toISOString()) // Only future/current tasks
            .order('due_date', { ascending: true });

        if (error) throw error;
        
        // Map database fields to TypeScript interface
        return (data || []).map(task => ({
            id: task.id,
            userId: task.user_id,
            title: task.title,
            description: task.description,
            isDaily: task.is_daily,
            isCompleted: task.is_completed,
            completedAt: task.completed_at,
            creditReward: task.credit_reward,
            dueDate: task.due_date,
            category: task.category,
            createdAt: task.created_at,
            updatedAt: task.updated_at
        }));
    }

    private async updateUserProgress(userId: string): Promise<void> {
        const { error } = await supabase.rpc('update_user_progress', {
            user_id: userId,
            xp_gained: 10, // Base XP per task
        });

        if (error) throw error;
    }
}

export const taskService = new TaskService();
