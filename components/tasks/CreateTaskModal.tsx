import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { X, Plus, Calendar, Star, Tag, ChevronRight } from 'lucide-react-native';
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
    const [showMonthPicker, setShowMonthPicker] = useState(false);
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
        setShowMonthPicker(false);
        setShowYearPicker(false);
        onClose();
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

    const formatTimeString = () => {
        return `${formData.dueHour.toString().padStart(2, '0')}:${formData.dueMinute.toString().padStart(2, '0')}`;
    };

    const getCalendarData = () => {
        const year = formData.dueDate.getFullYear();
        const month = formData.dueDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

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

    const getYearRange = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear; i <= currentYear + 10; i++) {
            years.push(i);
        }
        return years;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-[#0F0F0F]">
                {/* Modern Header with Gradient */}
                <View className="bg-gradient-to-r from-[#8A83DA] to-[#6366F1] px-6 pt-14 pb-6 rounded-b-3xl shadow-2xl">
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity 
                            onPress={handleClose} 
                            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-sm"
                        >
                            <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View className="items-center">
                            <Text className="text-xl font-bold text-white">Create Quest</Text>
                            <Text className="text-sm text-white/80 mt-1">Build your daily momentum</Text>
                        </View>
                        <View className="w-10" />
                    </View>
                </View>

                <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
                    {/* Task Title Section */}
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-white mb-3 flex-row items-center">
                            Quest Title
                        </Text>
                        <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-lg">
                            <TextInput
                                className="px-5 py-4 text-lg text-white bg-transparent rounded-2xl"
                                value={formData.title}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                                placeholder="What do you want to accomplish?"
                                placeholderTextColor="#6B7280"
                                maxLength={200}
                                autoFocus
                            />
                        </View>
                    </View>

                    {/* Description Section */}
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-white mb-3">
                            Description <Text className="text-sm font-normal text-gray-400">(Optional)</Text>
                        </Text>
                        <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-lg">
                            <TextInput
                                className="px-5 py-4 text-base text-white bg-transparent rounded-2xl min-h-[100px]"
                                style={{ textAlignVertical: 'top' }}
                                value={formData.description}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                                placeholder="Add context, motivation, or specific details..."
                                placeholderTextColor="#6B7280"
                                multiline
                                numberOfLines={4}
                                maxLength={1000}
                            />
                        </View>
                    </View>

                    {/* Category Section */}
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-white mb-4">
                            Category
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                            {CATEGORIES.map((category) => (
                                <TouchableOpacity
                                    key={category.key}
                                    onPress={() => setFormData(prev => ({ ...prev, category: category.key }))}
                                    className={`flex-row items-center px-5 py-3 rounded-2xl border-2 shadow-lg ${
                                        formData.category === category.key 
                                            ? 'bg-gradient-to-r from-opacity-90 to-opacity-80 border-white/30' 
                                            : 'bg-[#1A1A1A] border-gray-700/50'
                                    }`}
                                    style={{
                                        backgroundColor: formData.category === category.key ? category.color : undefined,
                                        borderColor: formData.category === category.key ? 'rgba(255,255,255,0.3)' : 'rgba(107,114,128,0.5)'
                                    }}
                                >
                                    <Tag
                                        size={18}
                                        color={formData.category === category.key ? '#FFFFFF' : category.color}
                                    />
                                    <Text 
                                        className={`text-sm font-semibold ml-2 ${
                                            formData.category === category.key ? 'text-white' : 'text-gray-300'
                                        }`}
                                        style={{ color: formData.category === category.key ? '#FFFFFF' : category.color }}
                                    >
                                        {category.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Due Date & Time Section */}
                    <View className="mb-8">
                        <Text className="text-lg font-bold text-white mb-4">
                            Due Date & Time
                        </Text>

                        {/* Quick Date Presets */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-300 mb-3">Quick Select</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                                {[
                                    { label: 'Today', hours: 0, emoji: '📅' },
                                    { label: 'Tomorrow', hours: 24, emoji: '🌅' },
                                    { label: 'This Weekend', hours: 24 * (6 - new Date().getDay()), emoji: '🎯' },
                                    { label: 'Next Week', hours: 24 * 7, emoji: '📆' },
                                ].map((preset) => {
                                    const presetDate = new Date(Date.now() + preset.hours * 60 * 60 * 1000);
                                    const isSelected = presetDate.toDateString() === formData.dueDate.toDateString();
                                    
                                    return (
                                        <TouchableOpacity
                                            key={preset.label}
                                            onPress={() => {
                                                const newDate = new Date(Date.now() + preset.hours * 60 * 60 * 1000);
                                                setFormData(prev => ({ ...prev, dueDate: newDate }));
                                            }}
                                            className={`px-4 py-3 rounded-2xl border-2 shadow-lg ${
                                                isSelected 
                                                    ? 'bg-gradient-to-r from-[#8A83DA] to-[#6366F1] border-white/30' 
                                                    : 'bg-[#1A1A1A] border-gray-700/50'
                                            }`}
                                        >
                                            <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                {preset.emoji} {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Current Selection Display */}
                        <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-lg p-5 mb-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="text-sm text-gray-400 mb-1">Selected Date & Time</Text>
                                    <Text className="text-lg font-bold text-white">
                                        {formatDate(formData.dueDate)} at {formatTimeString()}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(!showDatePicker)}
                                    className="w-12 h-12 bg-[#8A83DA]/20 rounded-full items-center justify-center"
                                >
                                    <Calendar size={20} color="#8A83DA" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Time Quick Presets */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold text-gray-300 mb-3">Time Presets</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {[
                                    { label: '9 AM', hour: 9, minute: 0 },
                                    { label: '12 PM', hour: 12, minute: 0 },
                                    { label: '3 PM', hour: 15, minute: 0 },
                                    { label: '6 PM', hour: 18, minute: 0 },
                                    { label: '9 PM', hour: 21, minute: 0 },
                                    { label: 'Custom', hour: -1, minute: -1 },
                                ].map((timePreset) => {
                                    const isSelected = timePreset.hour === formData.dueHour && timePreset.minute === formData.dueMinute;
                                    const isCustom = timePreset.hour === -1;
                                    
                                    return (
                                        <TouchableOpacity
                                            key={timePreset.label}
                                            onPress={() => {
                                                if (isCustom) {
                                                    setShowTimeDropdown(true);
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        dueHour: timePreset.hour,
                                                        dueMinute: timePreset.minute
                                                    }));
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-xl border ${
                                                isSelected && !isCustom
                                                    ? 'bg-[#8A83DA] border-[#8A83DA] shadow-lg' 
                                                    : 'bg-[#1A1A1A] border-gray-700/50'
                                            }`}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                isSelected && !isCustom ? 'text-white' : 'text-gray-300'
                                            }`}>
                                                {timePreset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Custom Time Input */}
                        {showTimeDropdown && (
                            <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 mb-4 shadow-xl">
                                <View className="p-5">
                                    <Text className="text-base font-bold text-white mb-4 text-center">🕐 Set Custom Time</Text>
                                    <View className="flex-row items-center justify-center gap-4 mb-4">
                                        {/* Hour Picker */}
                                        <View className="items-center">
                                            <Text className="text-sm text-gray-400 mb-2">Hour</Text>
                                            <View className="bg-[#0F0F0F] rounded-xl border border-gray-600/50 w-16">
                                                <TextInput
                                                    className="px-3 py-2 text-xl text-white text-center font-bold bg-transparent rounded-xl"
                                                    value={formData.dueHour.toString().padStart(2, '0')}
                                                    onChangeText={(text) => {
                                                        const hour = parseInt(text) || 0;
                                                        if (hour >= 0 && hour <= 23) {
                                                            setFormData(prev => ({ ...prev, dueHour: hour }));
                                                        }
                                                    }}
                                                    keyboardType="numeric"
                                                    maxLength={2}
                                                />
                                            </View>
                                        </View>
                                        
                                        <Text className="text-2xl text-white font-bold mt-6">:</Text>
                                        
                                        {/* Minute Picker */}
                                        <View className="items-center">
                                            <Text className="text-sm text-gray-400 mb-2">Minute</Text>
                                            <View className="bg-[#0F0F0F] rounded-xl border border-gray-600/50 w-16">
                                                <TextInput
                                                    className="px-3 py-2 text-xl text-white text-center font-bold bg-transparent rounded-xl"
                                                    value={formData.dueMinute.toString().padStart(2, '0')}
                                                    onChangeText={(text) => {
                                                        const minute = parseInt(text) || 0;
                                                        if (minute >= 0 && minute <= 59) {
                                                            setFormData(prev => ({ ...prev, dueMinute: minute }));
                                                        }
                                                    }}
                                                    keyboardType="numeric"
                                                    maxLength={2}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                    
                                    <TouchableOpacity
                                        className="bg-gradient-to-r from-[#8A83DA] to-[#6366F1] py-3 px-6 rounded-xl self-center"
                                        onPress={() => setShowTimeDropdown(false)}
                                    >
                                        <Text className="text-sm text-white font-bold">✓ Set Time</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Enhanced Date Picker */}
                        {showDatePicker && (
                            <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 mb-4 shadow-xl p-5">
                                <Text className="text-base font-bold text-white mb-4 text-center">📅 Pick a Date</Text>
                                
                                {/* Month & Year Selection */}
                                <View className="flex-row items-center justify-between mb-6">
                                    <TouchableOpacity
                                        className="w-10 h-10 bg-[#0F0F0F] rounded-full items-center justify-center"
                                        onPress={() => navigateMonth('prev')}
                                    >
                                        <Text className="text-lg font-bold text-[#8A83DA]">‹</Text>
                                    </TouchableOpacity>
                                    
                                    <View className="flex-1 mx-4">
                                        {/* Month Selector */}
                                        <TouchableOpacity
                                            className="bg-[#0F0F0F] rounded-xl px-4 py-3 mb-2 border border-gray-600/50"
                                            onPress={() => setShowMonthPicker(!showMonthPicker)}
                                        >
                                            <Text className="text-base font-bold text-white text-center">
                                                {getCalendarData().monthName} ▼
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        {/* Year Selector */}
                                        <TouchableOpacity
                                            className="bg-[#0F0F0F] rounded-xl px-4 py-2 border border-gray-600/50"
                                            onPress={() => setShowYearPicker(!showYearPicker)}
                                        >
                                            <Text className="text-sm font-semibold text-gray-300 text-center">
                                                {getCalendarData().year} ▼
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <TouchableOpacity
                                        className="w-10 h-10 bg-[#0F0F0F] rounded-full items-center justify-center"
                                        onPress={() => navigateMonth('next')}
                                    >
                                        <Text className="text-lg font-bold text-[#8A83DA]">›</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Month Picker Dropdown */}
                                {showMonthPicker && (
                                    <View className="bg-[#0F0F0F] rounded-xl border border-gray-600/50 mb-4 max-h-[200px]">
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {[
                                                'January', 'February', 'March', 'April', 'May', 'June',
                                                'July', 'August', 'September', 'October', 'November', 'December'
                                            ].map((month, index) => {
                                                const isSelected = index === getCalendarData().month;
                                                return (
                                                    <TouchableOpacity
                                                        key={month}
                                                        className={`px-4 py-3 ${index < 11 ? 'border-b border-gray-700/50' : ''} ${
                                                            isSelected ? 'bg-[#8A83DA]' : ''
                                                        }`}
                                                        onPress={() => {
                                                            const newDate = new Date(formData.dueDate);
                                                            newDate.setMonth(index);
                                                            setFormData(prev => ({ ...prev, dueDate: newDate }));
                                                            setShowMonthPicker(false);
                                                        }}
                                                    >
                                                        <Text className={`text-base font-medium text-center ${
                                                            isSelected ? 'text-white font-bold' : 'text-gray-300'
                                                        }`}>
                                                            {month}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Year Picker Dropdown */}
                                {showYearPicker && (
                                    <View className="bg-[#0F0F0F] rounded-xl border border-gray-600/50 mb-4 max-h-[200px]">
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {getYearRange().map((year) => {
                                                const isSelected = year === getCalendarData().year;
                                                return (
                                                    <TouchableOpacity
                                                        key={year}
                                                        className={`px-4 py-3 border-b border-gray-700/50 ${
                                                            isSelected ? 'bg-[#8A83DA]' : ''
                                                        }`}
                                                        onPress={() => {
                                                            const newDate = new Date(formData.dueDate);
                                                            newDate.setFullYear(year);
                                                            setFormData(prev => ({ ...prev, dueDate: newDate }));
                                                            setShowYearPicker(false);
                                                        }}
                                                    >
                                                        <Text className={`text-base font-medium text-center ${
                                                            isSelected ? 'text-white font-bold' : 'text-gray-300'
                                                        }`}>
                                                            {year}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Calendar Grid */}
                                <View className="flex-row mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                                        <View key={day} className="flex-1 items-center py-2">
                                            <Text className="text-xs font-bold text-gray-400">{day}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View className="flex-row flex-wrap">
                                    {getCalendarData().days.map((date, index) => {
                                        const isDisabled = isDateDisabled(date);
                                        const isSelected = isDateSelected(date);
                                        const isCurrentMonth = isDateInCurrentMonth(date);
                                        const isToday = date.toDateString() === new Date().toDateString();

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                className={`w-[14.28%] aspect-square items-center justify-center rounded-lg mb-1 ${
                                                    isSelected ? 'bg-gradient-to-r from-[#8A83DA] to-[#6366F1]' : 
                                                    isToday ? 'bg-[#8A83DA]/30' : ''
                                                } ${isDisabled ? 'opacity-30' : ''}`}
                                                onPress={() => !isDisabled && handleDateSelect(date)}
                                                disabled={isDisabled}
                                            >
                                                <Text className={`text-sm font-medium ${
                                                    !isCurrentMonth ? 'text-gray-600' : 
                                                    isSelected ? 'text-white font-bold' : 
                                                    isToday ? 'text-[#8A83DA] font-bold' :
                                                    isDisabled ? 'text-gray-600' : 'text-white'
                                                }`}>
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                
                                <TouchableOpacity
                                    className="bg-gradient-to-r from-[#8A83DA] to-[#6366F1] py-3 px-6 rounded-xl self-center mt-4"
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text className="text-sm text-white font-bold">✓ Confirm Date</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Reward Section */}
                    <View className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-5 rounded-2xl border border-amber-500/30 mb-6 shadow-lg">
                        <View className="flex-row items-center">
                            <Star size={24} color="#F59E0B" />
                            <View className="flex-1 ml-4">
                                <Text className="text-lg font-bold text-amber-400 mb-1">Quest Reward</Text>
                                <Text className="text-sm text-amber-200 leading-5">
                                    Complete your quest to earn <Text className="font-bold">1 Aura</Text> and <Text className="font-bold">10 XP points</Text>!
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Info Card */}
                    <View className="bg-gradient-to-r from-[#8A83DA]/20 to-[#6366F1]/20 p-4 rounded-2xl border border-[#8A83DA]/30 shadow-lg">
                        <Text className="text-sm text-[#8A83DA] font-semibold text-center">
                            💡 You can create up to 2 quest with custom deadlines
                        </Text>
                    </View>
                </ScrollView>

                {/* Modern Footer */}
                <View className="px-6 py-6 bg-[#0F0F0F] border-t border-gray-800/50">
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={handleClose}
                            className="flex-1 py-4 rounded-2xl items-center bg-[#1A1A1A] border border-gray-700/50 shadow-lg"
                        >
                            <Text className="text-base font-semibold text-gray-300">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            className={`flex-2 py-4 rounded-2xl items-center flex-row justify-center shadow-xl ${
                                loading || !formData.title.trim() 
                                    ? 'bg-gray-600' 
                                    : 'bg-gradient-to-r from-[#8A83DA] to-[#6366F1]'
                            }`}
                            disabled={loading || !formData.title.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Plus size={22} color="#FFFFFF" />
                                    <Text className="text-lg font-bold text-white ml-2">Start your Quest</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}


