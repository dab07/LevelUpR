import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
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
        <View key={challenge.id} className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                    <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={2}>
                        {challenge.title}
                    </Text>
                    <View 
                        className="self-start px-2 py-0.5 rounded"
                        style={{ backgroundColor: getDifficultyColor(challenge.difficulty) }}
                    >
                        <Text className="text-[10px] font-bold text-white">
                            {challenge.difficulty.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View className="items-center">
                    {challenge.isCompleted ? (
                        <Trophy size={20} color="#10B981" />
                    ) : (
                        <View className="w-5 h-5 rounded-full bg-red-500 justify-center items-center">
                            <Text className="text-xs text-white font-bold">✗</Text>
                        </View>
                    )}
                </View>
            </View>

            <Text className="text-sm text-gray-500 leading-5 mb-3" numberOfLines={2}>
                {challenge.description}
            </Text>

            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-1">
                    <Calendar size={16} color="#6B7280" />
                    <Text className="text-xs text-gray-500 font-medium">
                        {formatDate(challenge.completedAt)}
                    </Text>
                </View>

                <View className="flex-row items-center gap-1">
                    <Users size={16} color="#6B7280" />
                    <Text className="text-xs text-gray-500 font-medium">
                        {challenge.totalParticipants} participants
                    </Text>
                </View>

                <View className="flex-row items-center gap-1">
                    <Star size={16} color="#F59E0B" />
                    <Text 
                        className={`text-sm font-bold ${
                            challenge.creditsEarned > 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                    >
                        {challenge.creditsEarned > 0 ? '+' : ''}{challenge.creditsEarned}
                    </Text>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center p-10">
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text className="text-base text-gray-500 mt-3">Loading challenge history...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
                <Text className="text-xl font-bold text-gray-900">Challenge History</Text>
                <TouchableOpacity
                    onPress={() => setShowFilters(!showFilters)}
                    className="p-2 rounded-lg bg-violet-500/10"
                >
                    <Filter size={20} color="#8B5CF6" />
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2.5 m-5 border border-gray-200">
                <Search size={20} color="#6B7280" />
                <TextInput
                    className="flex-1 text-base text-gray-900 ml-2"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search challenges..."
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {showFilters && (
                <View className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                    <View className="mb-3">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Sort by:</Text>
                        <View className="flex-row gap-2">
                            {[
                                { key: 'date', label: 'Date' },
                                { key: 'credits', label: 'Credits' },
                                { key: 'difficulty', label: 'Difficulty' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => setSortBy(option.key as SortOption)}
                                    className={`px-3 py-1.5 rounded-2xl border ${
                                        sortBy === option.key 
                                            ? 'bg-violet-500 border-violet-500' 
                                            : 'bg-white border-gray-200'
                                    }`}
                                >
                                    <Text className={`text-sm font-medium ${
                                        sortBy === option.key ? 'text-white' : 'text-gray-500'
                                    }`}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="text-sm font-semibold text-gray-700 mb-2">Filter:</Text>
                        <View className="flex-row gap-2">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'completed', label: 'Completed' },
                                { key: 'failed', label: 'Failed' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    onPress={() => setFilterBy(option.key as FilterOption)}
                                    className={`px-3 py-1.5 rounded-2xl border ${
                                        filterBy === option.key 
                                            ? 'bg-violet-500 border-violet-500' 
                                            : 'bg-white border-gray-200'
                                    }`}
                                >
                                    <Text className={`text-sm font-medium ${
                                        filterBy === option.key ? 'text-white' : 'text-gray-500'
                                    }`}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
                {filteredChallenges.length === 0 ? (
                    <View className="items-center py-15">
                        <Trophy size={48} color="#D1D5DB" />
                        <Text className="text-lg font-semibold text-gray-500 mt-4 mb-2">No Challenges Found</Text>
                        <Text className="text-sm text-gray-400 text-center leading-5">
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


