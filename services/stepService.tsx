import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pedometer } from 'expo-sensors';
import * as Permissions from 'expo-permissions';
import { StepData } from '@/types';

class StepService {
    private readonly STORAGE_KEY = 'step_data';
    private readonly DEFAULT_GOAL = 6000;
    private readonly MIN_GOAL = 6000;
    private pedometerSubscription: any = null;
    private stepUpdateCallback: ((stepData: StepData) => void) | null = null;

    async getStepData(): Promise<StepData> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                // Reset steps if it's a new day
                const today = new Date().toDateString();
                const lastUpdated = new Date(parsedData.lastUpdated).toDateString();

                if (today !== lastUpdated) {
                    const resetData: StepData = {
                        ...parsedData,
                        steps: 0,
                        lastUpdated: new Date().toISOString(),
                    };
                    await this.saveStepData(resetData);
                    return resetData;
                }

                return parsedData;
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

    async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Permissions.askAsync(Permissions.MOTION);
            return status === 'granted';
        } catch (error) {
            console.error('Error requesting pedometer permissions:', error);
            return false;
        }
    }

    async isPedometerAvailable(): Promise<boolean> {
        try {
            return await Pedometer.isAvailableAsync();
        } catch (error) {
            console.error('Error checking pedometer availability:', error);
            return false;
        }
    }

    async startPedometerTracking(callback: (stepData: StepData) => void): Promise<boolean> {
        try {
            // Check if pedometer is available
            const isAvailable = await this.isPedometerAvailable();
            if (!isAvailable) {
                console.warn('Pedometer is not available on this device');
                return false;
            }

            // Request permissions
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                console.warn('Pedometer permission denied');
                return false;
            }

            // Get today's start time
            const start = new Date();
            start.setHours(0, 0, 0, 0);

            // Store callback for updates
            this.stepUpdateCallback = callback;

            // Start listening to pedometer updates
            this.pedometerSubscription = Pedometer.watchStepCount((result) => {
                this.handlePedometerUpdate(result.steps);
            });

            // Get steps from start of day to now
            const end = new Date();
            const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
            if (pastStepCountResult) {
                await this.handlePedometerUpdate(pastStepCountResult.steps);
            }

            return true;
        } catch (error) {
            console.error('Error starting pedometer tracking:', error);
            return false;
        }
    }

    private async handlePedometerUpdate(steps: number): Promise<void> {
        try {
            const currentData = await this.getStepData();
            const updatedData: StepData = {
                ...currentData,
                steps: Math.max(0, steps),
                lastUpdated: new Date().toISOString(),
            };

            await this.saveStepData(updatedData);

            // Notify callback if available
            if (this.stepUpdateCallback) {
                this.stepUpdateCallback(updatedData);
            }
        } catch (error) {
            console.error('Error handling pedometer update:', error);
        }
    }

    stopPedometerTracking(): void {
        if (this.pedometerSubscription) {
            this.pedometerSubscription.remove();
            this.pedometerSubscription = null;
        }
        this.stepUpdateCallback = null;
    }

    async saveStepData(data: StepData): Promise<void> {
        try {
            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving step data:', error);
        }
    }

    async updateGoal(goal: number): Promise<StepData> {
        const currentData = await this.getStepData();
        const updatedData: StepData = {
            ...currentData,
            goal: Math.max(this.MIN_GOAL, goal),
            lastUpdated: new Date().toISOString(),
        };

        await this.saveStepData(updatedData);
        return updatedData;
    }

    isGoalReached(stepData: StepData): boolean {
        return stepData.steps >= stepData.goal;
    }

    getProgressPercentage(stepData: StepData): number {
        return Math.min(100, (stepData.steps / stepData.goal) * 100);
    }

    getMinimumGoal(): number {
        return this.MIN_GOAL;
    }
}

export const stepService = new StepService();
