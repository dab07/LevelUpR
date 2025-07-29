import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeditationSession } from '@/types';

class MeditationService {
    private readonly STORAGE_KEY = 'meditation_sessions';

    async getTodaysSessions(): Promise<MeditationSession[]> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            if (!data) return [];

            const sessions: MeditationSession[] = JSON.parse(data);
            const today = new Date().toDateString();

            return sessions.filter(session =>
                new Date(session.completedAt).toDateString() === today
            );
        } catch (error) {
            console.error('Error getting meditation sessions:', error);
            return [];
        }
    }

    async saveSession(session: MeditationSession): Promise<void> {
        try {
            const existingSessions = await this.getAllSessions();
            const updatedSessions = [...existingSessions, session];

            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSessions));
        } catch (error) {
            console.error('Error saving meditation session:', error);
        }
    }

    async getAllSessions(): Promise<MeditationSession[]> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting all meditation sessions:', error);
            return [];
        }
    }

    async hasCompletedTodaysMeditation(): Promise<boolean> {
        const todaysSessions = await this.getTodaysSessions();
        return todaysSessions.some(session => session.isCompleted);
    }

    generateSessionId(): string {
        return `meditation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatDuration(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }

    formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

export const meditationService = new MeditationService();
