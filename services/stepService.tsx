import AsyncStorage from '@react-native-async-storage/async-storage';
import { StepData } from '@/types';

class StepService {
    private readonly STORAGE_KEY = 'step_data';
    private readonly DEFAULT_GOAL = 6000;

    async getStepData(): Promise<StepData> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }

            // Return default data
            const defaultData: StepData = {
                steps: 0,
                goal: this.DEFAULT_GOAL,
                lastUpdated: new Date().toISOString(),
            };

            await this.saveStepData(defaultData);
            return defaultData;
        } catch (error) {
            console.error('Error getting step data:', error);
            return {
                steps: 0,
                goal: this.DEFAULT_GOAL,
                lastUpdated: new Date().toISOString(),
            };
        }
    }

    async saveStepData(data: StepData): Promise<void> {
        try {
            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving step data:', error);
        }
    }

    async updateSteps(steps: number): Promise<StepData> {
        const currentData = await this.getStepData();
        const updatedData: StepData = {
            ...currentData,
            steps: Math.max(0, steps),
            lastUpdated: new Date().toISOString(),
        };

        await this.saveStepData(updatedData);
        return updatedData;
    }

    async updateGoal(goal: number): Promise<StepData> {
        const currentData = await this.getStepData();
        const updatedData: StepData = {
            ...currentData,
            goal: Math.max(1000, goal),
            lastUpdated: new Date().toISOString(),
        };

        await this.saveStepData(updatedData);
        return updatedData;
    }

    async resetDailySteps(): Promise<StepData> {
        const currentData = await this.getStepData();
        const today = new Date().toDateString();
        const lastUpdated = new Date(currentData.lastUpdated).toDateString();

        if (today !== lastUpdated) {
            const resetData: StepData = {
                ...currentData,
                steps: 0,
                lastUpdated: new Date().toISOString(),
            };

            await this.saveStepData(resetData);
            return resetData;
        }

        return currentData;
    }

    isGoalReached(stepData: StepData): boolean {
        return stepData.steps >= stepData.goal;
    }

    getProgressPercentage(stepData: StepData): number {
        return Math.min(100, (stepData.steps / stepData.goal) * 100);
    }
}

export const stepService = new StepService();
