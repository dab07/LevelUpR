import React, { useState, useRef } from 'react';
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
                        <Text style={styles.label}>Due Date & Time</Text>

                        {/* Date and Time Row */}
                        <View style={styles.dateTimeRow}>
                            {/* Date Selector */}
                            <TouchableOpacity
                                style={styles.dateSelector}
                                onPress={() => setShowDatePicker(!showDatePicker)}
                            >
                                <Calendar size={20} color="#8B5CF6" />
                                <Text style={styles.dateText}>{formatDate(formData.dueDate)}</Text>
                                <ChevronRight size={20} color="#6B7280" />
                            </TouchableOpacity>

                            {/* Time Dropdown Button */}
                            <TouchableOpacity
                                style={styles.timeDropdownButton}
                                onPress={() => setShowTimeDropdown(!showTimeDropdown)}
                            >
                                <Text style={styles.timeDropdownButtonText}>
                                    {formatTimeString()}
                                </Text>
                                <ChevronRight size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Time Dropdown */}
                        {showTimeDropdown && (
                            <View style={styles.timeDropdownContainer}>
                                <View style={styles.timeDropdownContent}>
                                    <Text style={styles.timeDropdownTitle}>End time:</Text>
                                    <View style={styles.timeInputContainer}>
                                        <TextInput
                                            style={styles.timeInput}
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
                                        style={styles.saveTimeButton}
                                        onPress={() => setShowTimeDropdown(false)}
                                    >
                                        <Text style={styles.saveTimeButtonText}>Save time</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Calendar */}
                        {showDatePicker && (
                            <View style={styles.calendarContainer}>
                                {/* Calendar Header */}
                                <View style={styles.calendarHeader}>
                                    <TouchableOpacity
                                        style={styles.navButton}
                                        onPress={() => navigateMonth('prev')}
                                    >
                                        <Text style={styles.navButtonText}>‹</Text>
                                    </TouchableOpacity>

                                    <View style={styles.monthYearContainer}>
                                        <Text style={styles.monthYearText}>
                                            {getCalendarData().monthName}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.yearButton}
                                            onPress={() => setShowYearPicker(!showYearPicker)}
                                        >
                                            <Text style={styles.yearButtonText}>
                                                {getCalendarData().year} ▼
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.navButton}
                                        onPress={() => navigateMonth('next')}
                                    >
                                        <Text style={styles.navButtonText}>›</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Year Picker */}
                                {showYearPicker && (
                                    <View style={styles.yearPicker}>
                                        <View style={styles.yearPickerHeader}>
                                            <TouchableOpacity
                                                style={styles.yearNavButton}
                                                onPress={() => navigateYear('prev')}
                                            >
                                                <Text style={styles.navButtonText}>‹</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.yearNavButton}
                                                onPress={() => navigateYear('next')}
                                            >
                                                <Text style={styles.navButtonText}>›</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
                                            {getYearRange().map((year) => (
                                                <TouchableOpacity
                                                    key={year}
                                                    style={[
                                                        styles.yearOption,
                                                        year === getCalendarData().year && styles.selectedYearOption
                                                    ]}
                                                    onPress={() => selectYear(year)}
                                                >
                                                    <Text style={[
                                                        styles.yearOptionText,
                                                        year === getCalendarData().year && styles.selectedYearOptionText
                                                    ]}>
                                                        {year}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Day Labels */}
                                <View style={styles.dayLabelsRow}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                        <View key={day} style={styles.dayLabel}>
                                            <Text style={styles.dayLabelText}>{day}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Calendar Grid */}
                                <View style={styles.calendarGrid}>
                                    {getCalendarData().days.map((date, index) => {
                                        const isDisabled = isDateDisabled(date);
                                        const isSelected = isDateSelected(date);
                                        const isCurrentMonth = isDateInCurrentMonth(date);

                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.calendarDay,
                                                    isSelected && styles.selectedCalendarDay,
                                                    isDisabled && styles.disabledCalendarDay,
                                                ]}
                                                onPress={() => !isDisabled && handleDateSelect(date)}
                                                disabled={isDisabled}
                                            >
                                                <Text style={[
                                                    styles.calendarDayText,
                                                    !isCurrentMonth && styles.otherMonthText,
                                                    isSelected && styles.selectedCalendarDayText,
                                                    isDisabled && styles.disabledCalendarDayText,
                                                ]}>
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <Text style={styles.helperText}>
                            Task will be due on {formatDate(formData.dueDate)} at {formatTimeString()}
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
                            📝 You can create up to 2 extra tasks with custom deadlines
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
    timeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
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
    dateTimeRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    dateSelector: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    dateText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 8,
    },
    timeDropdownButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    timeDropdownButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    timeDropdownContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    timeDropdownContent: {
        padding: 16,
    },
    timeDropdownTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    timeInputContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    timeInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
        textAlign: 'center',
        fontWeight: '600',
    },
    saveTimeButton: {
        alignSelf: 'flex-start',
    },
    saveTimeButtonText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },

    calendarContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
        padding: 16,
    },
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    navButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
    },
    monthYearContainer: {
        alignItems: 'center',
    },
    monthYearText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    yearButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
    },
    yearButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    yearPicker: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        marginBottom: 12,
        maxHeight: 200,
    },
    yearPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    yearNavButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    yearList: {
        maxHeight: 150,
    },
    yearOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    selectedYearOption: {
        backgroundColor: '#8B5CF6',
    },
    yearOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        textAlign: 'center',
    },
    selectedYearOptionText: {
        color: '#FFFFFF',
    },
    dayLabelsRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayLabel: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    dayLabelText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%', // 100% / 7 days
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        marginBottom: 4,
    },
    selectedCalendarDay: {
        backgroundColor: '#8B5CF6',
    },
    disabledCalendarDay: {
        opacity: 0.3,
    },
    calendarDayText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    selectedCalendarDayText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    disabledCalendarDayText: {
        color: '#D1D5DB',
    },
    otherMonthText: {
        color: '#D1D5DB',
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
