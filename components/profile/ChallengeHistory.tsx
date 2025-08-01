import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Search, Filter, Trophy, Calendar, Users, Star } from 'lucide-react-native';
import {ChallengeHistoryItem ,profileService } from '@/services/profileService';
import {User, Challenge} from '@/types';

interface ChallengeHistoryProps {
    userId: string;
}

type SortOption = 'date' | 'credits' | 'difficulty';
type FilterOption = 'all' | 'completed' | 'failed';

export default function ChallengeHistory({ userId }: ChallengeHistoryProps) {
    const [challenges, setChallenges] = useState<ChallengeHistoryItem[]>([]);
    const [filteredChallenges, setFilteredChallenges] = useState<ChallengeHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadChallengeHistory();
    }, [userId]);

    useEffect(() => {
        applyFiltersAndSort();
    }, [challenges, searchQuery, sortBy, filterBy]);

    const loadChallengeHistory = async () => {
        setLoading(true);
        try {
            const history = await profileService.getChallengeHistory(userId);
            setChallenges(history);
        } catch (error) {
            console.error('Error loading challenge history:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSort = () => {
        let filtered = [...challenges];

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(challenge =>
                challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply completion filter
        if (filterBy !== 'all') {
            filtered = filtered.filter(challenge =>
                filterBy === 'completed' ? challenge.isCompleted : !challenge.isCompleted
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
                case 'credits':
                    return b.creditsEarned - a.creditsEarned;
                case 'difficulty':
                    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                    return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
                default:
                    return 0;
            }
        });

        setFilteredChallenges(filtered);
    };

    const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
        switch (difficulty) {
            case 'easy':
                return '#10B981';
            case 'medium':
                return '#F59E0B';
            case 'hard':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const renderChallengeCard = (challenge: ChallengeHistoryItem) => (
        <View key={challenge.id} style={styles.challengeCard}>
            <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.challengeTitle} numberOfLines={2}>
                        {challenge.title}
                    </Text>
                    <View style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor(challenge.difficulty) }
                    ]}>
                        <Text style={styles.difficultyText}>
                            {challenge.difficulty.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.statusContainer}>
                    {challenge.isCompleted ? (
                        <Trophy size={20} color="#10B981" />
                    ) : (
                        <View style={styles.failedIcon}>
                            <Text style={styles.failedText}>✗</Text>
                        </View>
                    )}
                </View>
            </View>

            <Text style={styles.challengeDescription} numberOfLines={2}>
                {challenge.description}
            </Text>

            <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                    <Calendar size={16} color="#6B7280" />
                    <Text style={styles.footerText}>
                        {formatDate(challenge.completedAt)}
                    </Text>
                </View>

                <View style={styles.footerItem}>
                    <Users size={16} color="#6B7280" />
                    <Text style={styles.footerText}>
                        {challenge.totalParticipants} participants
                    </Text>
                </View>

                <View style={styles.creditsContainer}>
                    <Star size={16} color="#F59E0B" />
                    <Text style={[
                        styles.creditsText,
                        { color: challenge.creditsEarned > 0 ? '#10B981' : '#EF4444' }
                    ]}>
                        {challenge.creditsEarned > 0 ? '+' : ''}{challenge.creditsEarned}
                    </Text>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>Loading challenge history...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Challenge History</Text>
                <TouchableOpacity
                    onPress={() => setShowFilters(!showFilters)}
                    style={styles.filterButton}
                >
                    <Filter size={20} color="#8B5CF6" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#6B7280" />
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search challenges..."
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {showFilters && (
                <View style={styles.filtersContainer}>
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Sort by:</Text>
                        <View style={styles.filterOptions}>
                            {[
                                { key: 'date', label: 'Date' },
                                { key: 'credits', label: 'Credits' },
                                { key: 'difficulty', label: 'Difficulty' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => setSortBy(option.key as SortOption)}
                                    style={[
                                        styles.filterOption,
                                        sortBy === option.key && styles.activeFilterOption
                                    ]}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        sortBy === option.key && styles.activeFilterOptionText
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Filter:</Text>
                        <View style={styles.filterOptions}>
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'completed', label: 'Completed' },
                                { key: 'failed', label: 'Failed' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => setFilterBy(option.key as FilterOption)}
                                    style={[
                                        styles.filterOption,
                                        filterBy === option.key && styles.activeFilterOption
                                    ]}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        filterBy === option.key && styles.activeFilterOptionText
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            <ScrollView style={styles.challengesList} showsVerticalScrollIndicator={false}>
                {filteredChallenges.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Trophy size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No Challenges Found</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery.trim()
                                ? 'Try adjusting your search or filters'
                                : 'Start participating in challenges to see your history here!'
                            }
                        </Text>
                    </View>
                ) : (
                    filteredChallenges.map(renderChallengeCard)
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    filterButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        margin: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        marginLeft: 8,
    },
    filtersContainer: {
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterRow: {
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    filterOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    filterOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeFilterOption: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    filterOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    activeFilterOptionText: {
        color: '#FFFFFF',
    },
    challengesList: {
        flex: 1,
        padding: 20,
    },
    challengeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    difficultyBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    difficultyText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statusContainer: {
        alignItems: 'center',
    },
    failedIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    failedText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    challengeDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    creditsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    creditsText: {
        fontSize: 14,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
});
