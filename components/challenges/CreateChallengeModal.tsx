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
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Challenge</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.groupInfo}>
                        <Trophy size={20} color="#8B5CF6" />
                        <Text style={styles.groupName}>For: {group.name}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Challenge Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.title}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                            placeholder="e.g., Complete 10,000 steps today"
                            maxLength={200}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                            placeholder="Describe what needs to be accomplished..."
                            multiline
                            numberOfLines={3}
                            maxLength={1000}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Minimum Bet (Credits) *</Text>
                        <View style={styles.inputContainer}>
                            <Coins size={20} color="#F59E0B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={formData.minimumBet}
                                onChangeText={(value) => setFormData(prev => ({ ...prev, minimumBet: value }))}
                                placeholder="1"
                                keyboardType="numeric"
                                maxLength={3}
                            />
                        </View>
                        <Text style={styles.helperText}>
                            Minimum 1 credit for group challenges
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Deadline *</Text>

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
                                    <Text style={styles.timeDropdownTitle}>Deadline time:</Text>
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
                            Challenge deadline: {formatDate(formData.dueDate)} at {formatTimeString()}
                        </Text>
                    </View>

                    <View style={styles.infoCard}>
                        <Clock size={20} color="#3B82F6" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoTitle}>How Betting Works</Text>
                            <Text style={styles.infoText}>
                                • Members bet "Yes" or "No" on challenge completion{'\n'}
                                • You submit proof before deadline{'\n'}
                                • 6-hour voting period for verification{'\n'}
                                • Winners split the losing side's credits
                            </Text>
                        </View>
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
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Trophy size={20} color="#FFFFFF" />
                                <Text style={styles.createButtonText}>Create Challenge</Text>
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
    groupInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8B5CF6',
        marginLeft: 8,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
        paddingLeft: 44,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingLeft: 12,
    },
    helperText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
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
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#F0F9FF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginTop: 8,
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E40AF',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#1E40AF',
        lineHeight: 16,
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
