import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { X, Plus, Calendar, Star, Tag, ChevronRight, Rows } from 'lucide-react-native';
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
        dueDate: new Date(),
        dueHour: Math.min(23, new Date().getHours() + 1), // Default to next hour, max 23
        dueMinute: 0, // Default to top of the hour
    });
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
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
            // Create due date with selected date and time
            const dueDate = new Date(formData.dueDate);
            dueDate.setHours(formData.dueHour, formData.dueMinute, 0, 0);

            // Ensure the due date is not in the past
            if (dueDate <= new Date()) {
                Alert.alert('Invalid Date', 'Please select a future date and time for your task.');
                setLoading(false);
                return;
            }

            const taskData = {
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                isDaily: false, // Custom tasks with custom deadlines are not daily tasks
                creditReward: 1,
                dueDate: dueDate.toISOString(),
                category: formData.category,
            };

            await taskService.createTask(userId, taskData);

            Alert.alert(
                'Task Created!',
                'Your new task has been added to today\'s list.',
                [{
                    text: 'OK', onPress: () => {
                        handleClose();
                        onTaskCreated();
                    }
                }]
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
            dueDate: new Date(),
            dueHour: Math.min(23, new Date().getHours() + 1),
            dueMinute: 0,
        });
        setShowTimeDropdown(false);
        setShowDatePicker(false);
        setShowYearPicker(false);
        onClose();
    };

    const getCategoryColor = (category: string) => {
        const categoryData = CATEGORIES.find(c => c.key === category);
        return categoryData?.color || '#6B7280';
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const getCalendarData = () => {
        const year = formData.dueDate.getFullYear();
        const month = formData.dueDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        // Start from the first day of the week containing the first day of the month
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate 42 days (6 weeks) to fill the calendar grid
        const days = [];
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            days.push(date);
        }

        return {
            year,
            month,
            days,
            monthName: firstDay.toLocaleDateString('en-US', { month: 'long' })
        };
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(formData.dueDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setFormData(prev => ({ ...prev, dueDate: newDate }));
    };

    const navigateYear = (direction: 'prev' | 'next') => {
        const newDate = new Date(formData.dueDate);
        if (direction === 'prev') {
            newDate.setFullYear(newDate.getFullYear() - 1);
        } else {
            newDate.setFullYear(newDate.getFullYear() + 1);
        }
        setFormData(prev => ({ ...prev, dueDate: newDate }));
    };

    const getYearRange = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear; i <= currentYear + 10; i++) {
            years.push(i);
        }
        return years;
    };

    const selectYear = (year: number) => {
        const newDate = new Date(formData.dueDate);
        newDate.setFullYear(year);
        setFormData(prev => ({ ...prev, dueDate: newDate }));
        setShowYearPicker(false);
    };

    const getHourOptions = () => {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push(i);
        }
        return hours;
    };

    const getMinuteOptions = () => {
        const minutes = [];
        for (let i = 0; i < 60; i++) {
            minutes.push(i);
        }
        return minutes;
    };

    const formatTimeString = () => {
        return `${formData.dueHour.toString().padStart(2, '0')}:${formData.dueMinute.toString().padStart(2, '0')}`;
    };

    const getTimeOptions = () => {
        const times = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) { // 15-minute intervals
                times.push({
                    hour,
                    minute,
                    display: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                });
            }
        }
        return times;
    };

    const handleTimeSelect = (hour: number, minute: number) => {
        setFormData(prev => ({
            ...prev,
            dueHour: hour,
            dueMinute: minute
        }));
        setShowTimeDropdown(false);
    };

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isDateSelected = (date: Date) => {
        return date.toDateString() === formData.dueDate.toDateString();
    };

    const isDateInCurrentMonth = (date: Date) => {
        return date.getMonth() === formData.dueDate.getMonth();
    };

    const handleDateSelect = (date: Date) => {
        setFormData(prev => ({ ...prev, dueDate: date }));
        setShowDatePicker(false);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-[#1A1A1A]">
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-700">
                    <TouchableOpacity onPress={handleClose} className="p-1">
                        <X size={24} color="#8A83DA" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-white">Create New Task</Text>
                    <View className="w-8" />
                </View>

                <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-2">Task Title *</Text>
                        <TextInput
                            className="border border-gray-600 rounded-lg px-3 py-2.5 text-base text-white bg-[#2A2A2A]"
                            value={formData.title}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                            placeholder="e.g., Read for 30 minutes"
                            placeholderTextColor="#6B7280"
                            maxLength={200}
                            autoFocus
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-2">Description (Optional)</Text>
                        <TextInput
                            className="border border-gray-600 rounded-lg px-3 py-2.5 text-base text-white bg-[#2A2A2A] h-20"
                            style={{ textAlignVertical: 'top' }}
                            value={formData.description}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                            placeholder="Add any additional details..."
                            placeholderTextColor="#6B7280"
                            multiline
                            numberOfLines={3}
                            maxLength={1000}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-2">Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                            {CATEGORIES.map((category) => (
                                <TouchableOpacity
                                    key={category.key}
                                    onPress={() => setFormData(prev => ({ ...prev, category: category.key }))}
                                    className="flex-row items-center px-3 py-2 rounded-full border-2 mx-1"
                                    style={{
                                        borderColor: category.color,
                                        backgroundColor: formData.category === category.key ? category.color : 'transparent'
                                    }}
                                >
                                    <Tag
                                        size={16}
                                        color={formData.category === category.key ? '#FFFFFF' : category.color}
                                    />
                                    <Text 
                                        className="text-sm font-medium ml-1.5"
                                        style={{ color: formData.category === category.key ? '#FFFFFF' : category.color }}
                                    >
                                        {category.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-white mb-2">Due Date & Time</Text>

                        {/* Date and Time Row */}
                        <View className="flex-row gap-3 mb-2">
                            {/* Date Selector */}
                            <TouchableOpacity
                                className="flex-2 flex-row items-center bg-[#2A2A2A] rounded-lg px-3 py-3 border border-gray-600"
                                onPress={() => setShowDatePicker(!showDatePicker)}
                            >
                                <Calendar size={20} color="#8A83DA" />
                                <Text className="flex-1 text-base font-semibold text-white ml-2">{formatDate(formData.dueDate)}</Text>
                                <ChevronRight size={20} color="#6B7280" />
                            </TouchableOpacity>

                            {/* Time Dropdown Button */}
                            <TouchableOpacity
                                className="flex-1 flex-row items-center justify-between bg-[#8A83DA] rounded-lg px-3 py-3"
                                onPress={() => setShowTimeDropdown(!showTimeDropdown)}
                            >
                                <Text className="text-sm font-semibold text-white">
                                    {formatTimeString()}
                                </Text>
                                <ChevronRight size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Time Dropdown */}
                        {showTimeDropdown && (
                            <View className="bg-[#2A2A2A] rounded-lg border border-gray-600 mb-3">
                                <View className="p-4">
                                    <Text className="text-sm font-semibold text-white mb-2">End time:</Text>
                                    <View className="relative mb-3">
                                        <TextInput
                                            className="bg-[#333333] border border-gray-600 rounded-lg px-3 py-2.5 text-base text-white text-center font-semibold"
                                            value={formatTimeString()}
                                            onChangeText={(text) => {
                                                const [hours, minutes] = text.split(':');
                                                const hour = parseInt(hours) || 0;
                                                const minute = parseInt(minutes) || 0;
                                                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        dueHour: hour,
                                                        dueMinute: minute
                                                    }));
                                                }
                                            }}
                                            placeholder="00:00"
                                            placeholderTextColor="#6B7280"
                                            maxLength={5}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        className="self-start"
                                        onPress={() => setShowTimeDropdown(false)}
                                    >
                                        <Text className="text-sm text-[#8A83DA] font-medium underline">Save time</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Calendar */}
                        {showDatePicker && (
                            <View className="bg-[#2A2A2A] rounded-xl border border-gray-600 mb-3 p-4">
                                {/* Calendar Header */}
                                <View className="flex-row items-center justify-between mb-4">
                                    <TouchableOpacity
                                        className="w-8 h-8 rounded-2xl bg-[#333333] items-center justify-center"
                                        onPress={() => navigateMonth('prev')}
                                    >
                                        <Text className="text-lg font-semibold text-gray-400">‹</Text>
                                    </TouchableOpacity>

                                    <View className="items-center">
                                        <Text className="text-lg font-semibold text-white mb-1">
                                            {getCalendarData().monthName}
                                        </Text>
                                        <TouchableOpacity
                                            className="px-2 py-1 rounded bg-[#333333]"
                                            onPress={() => setShowYearPicker(!showYearPicker)}
                                        >
                                            <Text className="text-sm font-medium text-gray-400">
                                                {getCalendarData().year} ▼
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        className="w-8 h-8 rounded-2xl bg-[#333333] items-center justify-center"
                                        onPress={() => navigateMonth('next')}
                                    >
                                        <Text className="text-lg font-semibold text-gray-400">›</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Year Picker */}
                                {showYearPicker && (
                                    <View className="bg-gray-50 rounded-lg mb-3 max-h-[200px]">
                                        <View className="flex-row justify-between px-4 py-2 border-b border-gray-200">
                                            <TouchableOpacity
                                                className="w-6 h-6 rounded-xl bg-gray-200 items-center justify-center"
                                                onPress={() => navigateYear('prev')}
                                            >
                                                <Text className="text-lg font-semibold text-gray-500">‹</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                className="w-6 h-6 rounded-xl bg-gray-200 items-center justify-center"
                                                onPress={() => navigateYear('next')}
                                            >
                                                <Text className="text-lg font-semibold text-gray-500">›</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView
                                            className="max-h-[150px] flex-1"
                                            contentContainerStyle={{ flexGrow: 1 }}
                                            showsVerticalScrollIndicator={false}
                                            nestedScrollEnabled={true}
                                            bounces={false}
                                        >
                                            {getYearRange().map((year) => (
                                                <TouchableOpacity
                                                    key={year}
                                                    className={`px-4 py-3 border-b border-gray-100 ${year === getCalendarData().year ? 'bg-purple-500' : ''}`}
                                                    onPress={() => selectYear(year)}
                                                >
                                                    <Text className={`text-base font-medium text-center ${year === getCalendarData().year ? 'text-white' : 'text-gray-900'}`}>
                                                        {year}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Day Labels */}
                                <View className="flex-row mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                        <View key={day} className="flex-1 items-center py-2">
                                            <Text className="text-xs font-semibold text-gray-400">{day}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Calendar Grid */}
                                <View className="flex-row flex-wrap">
                                    {getCalendarData().days.map((date, index) => {
                                        const isDisabled = isDateDisabled(date);
                                        const isSelected = isDateSelected(date);
                                        const isCurrentMonth = isDateInCurrentMonth(date);

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                className={`w-[14.28%] aspect-square items-center justify-center rounded-lg mb-1 ${isSelected ? 'bg-[#8A83DA]' : ''} ${isDisabled ? 'opacity-30' : ''}`}
                                                onPress={() => !isDisabled && handleDateSelect(date)}
                                                disabled={isDisabled}
                                            >
                                                <Text className={`text-base font-medium ${
                                                    !isCurrentMonth ? 'text-gray-500' : 
                                                    isSelected ? 'text-white font-semibold' : 
                                                    isDisabled ? 'text-gray-500' : 'text-white'
                                                }`}>
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <Text className="text-xs text-gray-400 mt-1">
                            Task will be due on {formatDate(formData.dueDate)} at {formatTimeString()}
                        </Text>
                    </View>



                    <View className="flex-row bg-amber-900/20 p-4 rounded-xl border border-amber-800/30 mb-4">
                        <Star size={20} color="#F59E0B" />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-amber-400 mb-1">Task Reward</Text>
                            <Text className="text-xs text-amber-300 leading-4">
                                Complete this task to earn 1 credit and 10 XP points!
                            </Text>
                        </View>
                    </View>

                    <View className="bg-[#8A83DA]/20 p-3 rounded-lg border border-[#8A83DA]/30">
                        <Text className="text-sm text-[#8A83DA] font-medium text-center">
                            📝 You can create up to 2 extra tasks with custom deadlines
                        </Text>
                    </View>
                </ScrollView>

                <View className="flex-row gap-3 p-5 border-t border-gray-700">
                    <TouchableOpacity
                        onPress={handleClose}
                        className="flex-1 py-3 rounded-lg items-center flex-row justify-center bg-[#333333]"
                    >
                        <Text className="text-base font-semibold text-gray-400">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        className="flex-1 py-3 rounded-lg items-center flex-row justify-center bg-[#8A83DA]"
                        disabled={loading || !formData.title.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Plus size={20} color="#FFFFFF" />
                                <Text className="text-base font-semibold text-white ml-2">Create Task</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}


