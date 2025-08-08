import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { X, Plus, Calendar, Star, Tag } from 'lucide-react-native';
import { taskService } from '@/services/taskService';
import { Task } from '@/types';

interface CreateTaskModalProps {
    visible: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
    userId: string;
}

const CATEGORIES = [
    { key: 'personal', label: 'Personal', color: '#F59E0B' },
    { key: 'fitness', label: 'Fitness', color: '#10B981' },
    { key: 'work', label: 'Work', color: '#3B82F6' },
    { key: 'study', label: 'Study', color: '#8B5CF6' },
    { key: 'other', label: 'Other', color: '#6B7280' },
] as const;

export default function CreateTaskModal({
                                            visible,
                                            onClose,
                                            onTaskCreated,
                                            userId
                                        }: CreateTaskModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'personal' as Task['category'],
        dueTime: '23:59', // Default to end of day
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            Alert.alert('Error', 'Please enter a task title');
            return;
        }

        if (!userId) {
            Alert.alert('Error', 'User not authenticated');
            return;
        }

        setLoading(true);
        try {
            // Create due date for today with specified time
            const today = new Date();
            const [hours, minutes] = formData.dueTime.split(':');
            const dueDate = new Date(today);
            dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // If the time has already passed today, set for tomorrow
            if (dueDate <= new Date()) {
                dueDate.setDate(dueDate.getDate() + 1);
            }

            const taskData = {
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                isDaily: true,
                creditReward: 1,
                dueDate: dueDate.toISOString(),
                category: formData.category,
            };

            await taskService.createTask(userId, taskData);

            Alert.alert(
                'Task Created!',
                'Your new task has been added to today\'s list.',
                [{ text: 'OK', onPress: () => {
                        handleClose();
                        onTaskCreated();
                    }}]
            );
        } catch (error: any) {
            console.error('Create task error:', error);

            if (error.message.includes('Maximum of 5 daily tasks')) {
                Alert.alert('Limit Reached', 'You can only create 5 tasks per day. Complete some tasks first!');
            } else {
                Alert.alert('Error', error.message || 'Failed to create task. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            description: '',
            category: 'personal',
            dueTime: '23:59',
        });
        onClose();
    };

    const getCategoryColor = (category: string) => {
        const categoryData = CATEGORIES.find(c => c.key === category);
        return categoryData?.color || '#6B7280';
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create New Task</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <Text style={styles.label}>Task Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.title}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                            placeholder="e.g., Read for 30 minutes"
                            maxLength={200}
                            autoFocus
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                            placeholder="Add any additional details..."
                            multiline
                            numberOfLines={3}
                            maxLength={1000}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {CATEGORIES.map((category) => (
                                <TouchableOpacity
                                    key={category.key}
                                    onPress={() => setFormData(prev => ({ ...prev, category: category.key }))}
                                    style={[
                                        styles.categoryButton,
                                        { borderColor: category.color },
                                        formData.category === category.key && { backgroundColor: category.color }
                                    ]}
                                >
                                    <Tag
                                        size={16}
                                        color={formData.category === category.key ? '#FFFFFF' : category.color}
                                    />
                                    <Text style={[
                                        styles.categoryText,
                                        { color: formData.category === category.key ? '#FFFFFF' : category.color }
                                    ]}>
                                        {category.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Due Time</Text>
                        <View style={styles.timeContainer}>
                            <Calendar size={20} color="#8B5CF6" style={styles.timeIcon} />
                            <TextInput
                                style={styles.timeInput}
                                value={formData.dueTime}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, dueTime: value }))}
                                placeholder="HH:MM"
                                maxLength={5}
                                keyboardType="numeric"
                            />
                            <Text style={styles.timeLabel}>Today</Text>
                        </View>
                        <Text style={styles.helperText}>
                            Task will be due today at {formData.dueTime}. If time has passed, it will be due tomorrow.
                        </Text>
                    </View>

                    <View style={styles.rewardCard}>
                        <Star size={20} color="#F59E0B" />
                        <View style={styles.rewardContent}>
                            <Text style={styles.rewardTitle}>Task Reward</Text>
                            <Text style={styles.rewardText}>
                                Complete this task to earn 1 credit and 10 XP points!
                            </Text>
                        </View>
                    </View>

                    <View style={styles.limitInfo}>
                        <Text style={styles.limitText}>
                            📝 You can create up to 5 tasks per day
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={[styles.button, styles.cancelButton]}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.button, styles.createButton]}
                        disabled={loading || !formData.title.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Plus size={20} color="#FFFFFF" />
                                <Text style={styles.createButtonText}>Create Task</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
        backgroundColor: '#F9FAFB',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    categoryScroll: {
        marginHorizontal: -4,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        marginHorizontal: 4,
        backgroundColor: 'transparent',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    timeIcon: {
        marginRight: 8,
    },
    timeInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
    },
    timeLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    rewardCard: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FCD34D',
        marginBottom: 16,
    },
    rewardContent: {
        flex: 1,
        marginLeft: 12,
    },
    rewardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 4,
    },
    rewardText: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 16,
    },
    limitInfo: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    limitText: {
        fontSize: 14,
        color: '#8B5CF6',
        fontWeight: '500',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    createButton: {
        backgroundColor: '#8B5CF6',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
});
