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
import { X, Trophy, Calendar, Coins, Clock, ChevronRight } from 'lucide-react-native';
import { challengeService } from '@/services/challengeService';
import { Group } from '@/types';

interface CreateChallengeModalProps {
    visible: boolean;
    onClose: () => void;
    group: Group;
    onChallengeCreated: () => void;
}

export default function CreateChallengeModal({
    visible,
    onClose,
    group,
    onChallengeCreated
}: CreateChallengeModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        minimumBet: '1',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
        dueHour: Math.min(23, new Date().getHours() + 1),
        dueMinute: 0,
    });
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.description.trim()) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const minimumBet = parseInt(formData.minimumBet);
        if (isNaN(minimumBet) || minimumBet < 1) {
            Alert.alert('Error', 'Minimum bet must be at least 1 credit');
            return;
        }

        // Create deadline with selected date and time
        const deadlineDate = new Date(formData.dueDate);
        deadlineDate.setHours(formData.dueHour, formData.dueMinute, 0, 0);

        if (deadlineDate <= new Date()) {
            Alert.alert('Error', 'Deadline must be in the future');
            return;
        }

        setLoading(true);
        try {
            await challengeService.createChallenge({
                title: formData.title.trim(),
                description: formData.description.trim(),
                minimumBet,
                deadline: deadlineDate.toISOString(),
                isGlobal: false,
                groupId: group.id,
            });

            Alert.alert('Success', 'Challenge created successfully!');
            handleClose();
            onChallengeCreated();
        } catch (error) {
            console.error('Create challenge error:', error);
            Alert.alert('Error', 'Failed to create challenge. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: '',
            description: '',
            minimumBet: '1',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            dueHour: Math.min(23, new Date().getHours() + 1),
            dueMinute: 0,
        });
        setShowTimeDropdown(false);
        setShowDatePicker(false);
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
            <View className="flex-1 bg-white">
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
                    <TouchableOpacity onPress={handleClose} className="p-1">
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">Create Challenge</Text>
                    <View className="w-8" />
                </View>

                <ScrollView className="flex-1 p-5">
                    <View className="flex-row items-center bg-violet-50 px-4 py-3 rounded-lg mb-6">
                        <Trophy size={20} color="#8B5CF6" />
                        <Text className="text-base font-semibold text-violet-600 ml-2">For: {group.name}</Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-gray-700 mb-2">Challenge Title *</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900"
                            value={formData.title}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                            placeholder="e.g., Complete 10,000 steps today"
                            maxLength={200}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-gray-700 mb-2">Description *</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900 h-20 pl-3"
                            style={{ textAlignVertical: 'top' }}
                            value={formData.description}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                            placeholder="Describe what needs to be accomplished..."
                            multiline
                            numberOfLines={3}
                            maxLength={1000}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-gray-700 mb-2">Minimum Bet (Credits) *</Text>
                        <View className="flex-row items-center relative">
                            <Coins size={20} color="#F59E0B" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                            <TextInput
                                className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900 pl-11 flex-1"
                                value={formData.minimumBet}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, minimumBet: value }))}
                                placeholder="1"
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                        <Text className="text-xs text-gray-500 mt-1">
                            Minimum 1 credit for group challenges
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-base font-semibold text-gray-700 mb-2">Deadline *</Text>

                        {/* Date and Time Row */}
                        <View className="flex-row gap-3 mb-2">
                            {/* Date Selector */}
                            <TouchableOpacity
                                className="flex-2 flex-row items-center bg-gray-50 rounded-lg px-3 py-3 border border-gray-300"
                                onPress={() => setShowDatePicker(!showDatePicker)}
                            >
                                <Calendar size={20} color="#8B5CF6" />
                                <Text className="flex-1 text-base font-semibold text-gray-900 ml-2">{formatDate(formData.dueDate)}</Text>
                                <ChevronRight size={20} color="#6B7280" />
                            </TouchableOpacity>

                            {/* Time Dropdown Button */}
                            <TouchableOpacity
                                className="flex-1 flex-row items-center justify-between bg-blue-600 rounded-lg px-3 py-3"
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
                            <View className="bg-white rounded-lg border border-gray-200 mb-3 shadow-sm shadow-black/10">
                                <View className="p-4">
                                    <Text className="text-sm font-semibold text-gray-900 mb-2">Deadline time:</Text>
                                    <View className="relative mb-3">
                                        <TextInput
                                            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900 text-center font-semibold"
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
                                            maxLength={5}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        className="self-start"
                                        onPress={() => setShowTimeDropdown(false)}
                                    >
                                        <Text className="text-sm text-blue-600 font-medium underline">Save time</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Calendar */}
                        {showDatePicker && (
                            <View className="bg-white rounded-xl border border-gray-200 mb-3 p-4">
                                {/* Calendar Header */}
                                <View className="flex-row items-center justify-between mb-4">
                                    <TouchableOpacity
                                        className="w-8 h-8 rounded-2xl bg-gray-100 items-center justify-center"
                                        onPress={() => navigateMonth('prev')}
                                    >
                                        <Text className="text-lg font-semibold text-gray-500">‹</Text>
                                    </TouchableOpacity>

                                    <View className="items-center">
                                        <Text className="text-lg font-semibold text-gray-900 mb-1">
                                            {getCalendarData().monthName}
                                        </Text>
                                        <TouchableOpacity
                                            className="px-2 py-1 rounded bg-gray-100"
                                            onPress={() => setShowYearPicker(!showYearPicker)}
                                        >
                                            <Text className="text-sm font-medium text-gray-500">
                                                {getCalendarData().year} ▼
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        className="w-8 h-8 rounded-2xl bg-gray-100 items-center justify-center"
                                        onPress={() => navigateMonth('next')}
                                    >
                                        <Text className="text-lg font-semibold text-gray-500">›</Text>
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
                                        <ScrollView className="max-h-[150px]" showsVerticalScrollIndicator={false}>
                                            {getYearRange().map((year) => (
                                                <TouchableOpacity
                                                    key={year}
                                                    className={`px-4 py-3 border-b border-gray-100 ${year === getCalendarData().year ? 'bg-violet-600' : ''}`}
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
                                            <Text className="text-xs font-semibold text-gray-500">{day}</Text>
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
                                                className={`w-[14.28%] aspect-square items-center justify-center rounded-lg mb-1 ${isSelected ? 'bg-violet-600' : ''} ${isDisabled ? 'opacity-30' : ''}`}
                                                onPress={() => !isDisabled && handleDateSelect(date)}
                                                disabled={isDisabled}
                                            >
                                                <Text className={`text-base font-medium ${!isCurrentMonth ? 'text-gray-300' : isSelected ? 'text-white font-semibold' : isDisabled ? 'text-gray-300' : 'text-gray-900'}`}>
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <Text className="text-xs text-gray-500 mt-1">
                            Challenge deadline: {formatDate(formData.dueDate)} at {formatTimeString()}
                        </Text>
                    </View>

                    <View className="flex-row bg-blue-50 p-4 rounded-xl border border-blue-200 mt-2">
                        <Clock size={20} color="#3B82F6" />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm font-semibold text-blue-800 mb-1">How Betting Works</Text>
                            <Text className="text-xs text-blue-800 leading-4">
                                • Members bet "Yes" or "No" on challenge completion{'\n'}
                                • You submit proof before deadline{'\n'}
                                • 6-hour voting period for verification{'\n'}
                                • Winners split the losing side's credits
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                <View className="flex-row gap-3 p-5 border-t border-gray-200">
                    <TouchableOpacity
                        onPress={handleClose}
                        className="flex-1 py-3 rounded-lg items-center flex-row justify-center bg-gray-100"
                    >
                        <Text className="text-base font-semibold text-gray-500">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        className="flex-1 py-3 rounded-lg items-center flex-row justify-center bg-violet-600"
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Trophy size={20} color="#FFFFFF" />
                                <Text className="text-base font-semibold text-white ml-2">Create Challenge</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}


