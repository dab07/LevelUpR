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
    const [showDateTimePopup, setShowDateTimePopup] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [tempHour, setTempHour] = useState(Math.min(23, new Date().getHours() + 1));
    const [tempMinute, setTempMinute] = useState(0);
    const [tempDate, setTempDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    const hourScrollRef = useRef<ScrollView>(null);
    const minuteScrollRef = useRef<ScrollView>(null);
    const ITEM_HEIGHT = 50;

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
        setShowDateTimePopup(false);
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
        const year = tempDate.getFullYear();
        const month = tempDate.getMonth();

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
        const newDate = new Date(tempDate);
        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setTempDate(newDate);
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
        const newDate = new Date(tempDate);
        newDate.setFullYear(year);
        setTempDate(newDate);
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

    const openDateTimePopup = () => {
        setTempHour(formData.dueHour);
        setTempMinute(formData.dueMinute);
        setTempDate(new Date(formData.dueDate));
        setShowDateTimePopup(true);

        // Scroll to current values after a longer delay to ensure the ScrollViews are fully rendered
        setTimeout(() => {
            scrollToHour(formData.dueHour);
            scrollToMinute(formData.dueMinute);
        }, 300);
    };

    const applyDateTimeChanges = () => {
        setFormData(prev => ({
            ...prev,
            dueDate: tempDate,
            dueHour: tempHour,
            dueMinute: tempMinute
        }));
        setShowDateTimePopup(false);
    };

    const cancelDateTimeChanges = () => {
        setShowDateTimePopup(false);
        setShowYearPicker(false);
    };

    const scrollToHour = (hour: number) => {
        // Account for the 2 padding items at the top (2 * ITEM_HEIGHT)
        const scrollY = (hour + 2) * ITEM_HEIGHT;
        hourScrollRef.current?.scrollTo({
            y: scrollY,
            animated: true,
        });
    };

    const scrollToMinute = (minute: number) => {
        // Account for the 2 padding items at the top (2 * ITEM_HEIGHT)
        const scrollY = (minute + 2) * ITEM_HEIGHT;
        minuteScrollRef.current?.scrollTo({
            y: scrollY,
            animated: true,
        });
    };

    const handleHourScroll = (event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        // Subtract the padding offset (2 items) to get the actual hour index
        const index = Math.round(y / ITEM_HEIGHT) - 2;
        const newHour = Math.max(0, Math.min(23, index));
        if (newHour !== tempHour && newHour >= 0) {
            setTempHour(newHour);
        }
    };

    const handleMinuteScroll = (event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        // Subtract the padding offset (2 items) to get the actual minute index
        const index = Math.round(y / ITEM_HEIGHT) - 2;
        const newMinute = Math.max(0, Math.min(59, index));
        if (newMinute !== tempMinute && newMinute >= 0) {
            setTempMinute(newMinute);
        }
    };

    const renderTimePickerItems = (items: number[], selectedValue: number) => {
        return items.map((item, index) => (
            <View key={item} style={styles.timePickerItem}>
                <Text style={[
                    styles.timePickerItemText,
                    item === selectedValue && styles.selectedTimePickerItemText
                ]}>
                    {item.toString().padStart(2, '0')}
                </Text>
            </View>
        ));
    };

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isDateSelected = (date: Date) => {
        return date.toDateString() === tempDate.toDateString();
    };

    const isDateInCurrentMonth = (date: Date) => {
        return date.getMonth() === tempDate.getMonth();
    };

    const handleDateSelect = (date: Date) => {
        setTempDate(date);
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

                        {/* Date and Time Display */}
                        <TouchableOpacity
                            style={styles.dateTimeSelector}
                            onPress={openDateTimePopup}
                        >
                            <Calendar size={20} color="#8B5CF6" />
                            <Text style={styles.dateTimeText}>
                                {formatDate(formData.dueDate)} at {formData.dueHour.toString().padStart(2, '0')}:{formData.dueMinute.toString().padStart(2, '0')}
                            </Text>
                            <ChevronRight size={20} color="#6B7280" />
                        </TouchableOpacity>

                        <Text style={styles.helperText}>
                            Tap to change date and time
                        </Text>
                    </View>

                    {/* Date Time Popup */}
                    {showDateTimePopup && (
                        <Modal
                            visible={showDateTimePopup}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={cancelDateTimeChanges}
                        >
                            <TouchableOpacity
                                style={styles.popupOverlay}
                                activeOpacity={1}
                                onPress={cancelDateTimeChanges}
                            >
                                <View style={styles.popupContainer}>
                                    <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                                        {/* Time Selector */}
                                        <View style={styles.timeSelector}>
                                            <Text style={styles.popupTitle}>Select Time</Text>

                                            <View style={styles.timePickers}>
                                                {/* Hour Picker */}
                                                <View style={styles.timePicker}>
                                                    <Text style={styles.timePickerLabel}>Hour</Text>
                                                    <View style={styles.timePickerWrapper}>
                                                        <View style={styles.timePickerOverlay} />
                                                        <ScrollView
                                                            ref={hourScrollRef}
                                                            style={styles.timePickerScroll}
                                                            showsVerticalScrollIndicator={false}
                                                            snapToInterval={ITEM_HEIGHT}
                                                            decelerationRate="fast"
                                                            onMomentumScrollEnd={handleHourScroll}
                                                            onScrollEndDrag={handleHourScroll}
                                                            contentContainerStyle={styles.timePickerContent}
                                                        >
                                                            {/* Padding items for proper centering */}
                                                            <View style={styles.timePickerPadding} />
                                                            <View style={styles.timePickerPadding} />
                                                            {renderTimePickerItems(getHourOptions(), tempHour)}
                                                            <View style={styles.timePickerPadding} />
                                                            <View style={styles.timePickerPadding} />
                                                        </ScrollView>
                                                    </View>
                                                </View>

                                                {/* Minute Picker */}
                                                <View style={styles.timePicker}>
                                                    <Text style={styles.timePickerLabel}>Minute</Text>
                                                    <View style={styles.timePickerWrapper}>
                                                        <View style={styles.timePickerOverlay} />
                                                        <ScrollView
                                                            ref={minuteScrollRef}
                                                            style={styles.timePickerScroll}
                                                            showsVerticalScrollIndicator={false}
                                                            snapToInterval={ITEM_HEIGHT}
                                                            decelerationRate="fast"
                                                            onMomentumScrollEnd={handleMinuteScroll}
                                                            onScrollEndDrag={handleMinuteScroll}
                                                            contentContainerStyle={styles.timePickerContent}
                                                        >
                                                            {/* Padding items for proper centering */}
                                                            <View style={styles.timePickerPadding} />
                                                            <View style={styles.timePickerPadding} />
                                                            {renderTimePickerItems(getMinuteOptions(), tempMinute)}
                                                            <View style={styles.timePickerPadding} />
                                                            <View style={styles.timePickerPadding} />
                                                        </ScrollView>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Calendar */}
                                        <View style={styles.calendarContainer}>
                                            <Text style={styles.popupTitle}>Select Date</Text>

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

                                        {/* Action Buttons */}
                                        <View style={styles.popupActions}>
                                            <TouchableOpacity
                                                style={[styles.popupButton, styles.cancelPopupButton]}
                                                onPress={cancelDateTimeChanges}
                                            >
                                                <Text style={styles.cancelPopupButtonText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.popupButton, styles.confirmPopupButton]}
                                                onPress={applyDateTimeChanges}
                                            >
                                                <Text style={styles.confirmPopupButtonText}>Confirm</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    )}

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
    dateTimeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginBottom: 8,
    },
    dateTimeText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 8,
    },
    popupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    popupContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    timeSelector: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    timePickers: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
    },
    timePicker: {
        alignItems: 'center',
    },
    timePickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
    },
    timePickerWrapper: {
        height: 250,
        width: 80,
        position: 'relative',
    },
    timePickerScroll: {
        flex: 1,
    },
    timePickerContent: {
        alignItems: 'center',
    },
    timePickerOverlay: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        height: 50,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        zIndex: 1,
        pointerEvents: 'none',
    },
    timePickerItem: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    timePickerItemText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#6B7280',
    },
    selectedTimePickerItemText: {
        color: '#8B5CF6',
        fontWeight: '600',
        fontSize: 20,
    },
    timePickerPadding: {
        height: 50,
        width: 80,
    },
    popupActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    popupButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelPopupButton: {
        backgroundColor: '#F3F4F6',
    },
    confirmPopupButton: {
        backgroundColor: '#8B5CF6',
    },
    cancelPopupButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmPopupButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    calendarContainer: {
        padding: 20,
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
