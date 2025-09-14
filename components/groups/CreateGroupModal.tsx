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
import { LinearGradient } from 'expo-linear-gradient';
import { X, Search, UserPlus, Users } from 'lucide-react-native';
import { groupService } from '@/services/groupService';

interface CreateGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onGroupCreated: () => void;
}

interface SearchUser {
    id: string;
    username: string;
    displayName: string;
}

export default function CreateGroupModal({ visible, onClose, onGroupCreated }: CreateGroupModalProps) {
    const [step, setStep] = useState(1); // 1: Group details, 2: Add members
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const results = await groupService.searchUsers(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = (user: SearchUser) => {
        if (!selectedMembers.find(m => m.id === user.id)) {
            setSelectedMembers([...selectedMembers, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemoveMember = (userId: string) => {
        setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a groups name');
            return;
        }

        setLoading(true);
        try {
            await groupService.createGroup(
                groupName.trim(),
                groupDescription.trim(),
                selectedMembers.map(m => m.username)
            );

            Alert.alert('Success', 'Group created successfully!');
            handleClose();
            onGroupCreated();
        } catch (error) {
            console.error('Create groups error:', error);
            Alert.alert('Error', 'Failed to create groups. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setGroupName('');
        setGroupDescription('');
        setSearchQuery('');
        setSearchResults([]);
        setSelectedMembers([]);
        onClose();
    };

    const handleNext = () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a groups name');
            return;
        }
        setStep(2);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-[#0F0F0F]">
                {/* Modern Header */}
                <View className="bg-gradient-to-r from-[#8A83DA] to-[#6366F1] px-6 pt-14 pb-6 rounded-b-3xl shadow-2xl">
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity 
                            onPress={handleClose} 
                            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-sm"
                        >
                            <X size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View className="items-center">
                            <Text className="text-xl font-bold text-white">
                                {step === 1 ? 'Create Group' : 'Add Members'}
                            </Text>
                            <Text className="text-sm text-white/80 mt-1">
                                {step === 1 ? 'Build your community' : 'Invite your friends'}
                            </Text>
                        </View>
                        <View className="w-10" />
                    </View>
                    
                    {/* Progress Indicator */}
                    <View className="flex-row mt-6 bg-white/20 rounded-full p-1">
                        <View className={`flex-1 h-2 rounded-full ${step === 1 ? 'bg-white' : 'bg-white/50'}`} />
                        <View className="w-2" />
                        <View className={`flex-1 h-2 rounded-full ${step === 2 ? 'bg-white' : 'bg-white/30'}`} />
                    </View>
                </View>

                {step === 1 ? (
                    <ScrollView className="flex-1 px-6 py-6">
                        {/* Group Name Section */}
                        <View className="mb-8">
                            <Text className="text-lg font-bold text-white mb-4">
                                👥 Group Name
                            </Text>
                            <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-lg">
                                <TextInput
                                    className="px-5 py-4 text-lg text-white bg-transparent rounded-2xl"
                                    value={groupName}
                                    onChangeText={setGroupName}
                                    placeholder="Enter a catchy group name"
                                    placeholderTextColor="#6B7280"
                                    maxLength={100}
                                    autoFocus
                                />
                            </View>
                        </View>

                        {/* Description Section */}
                        <View className="mb-8">
                            <Text className="text-lg font-bold text-white mb-4">
                                📝 Description <Text className="text-sm font-normal text-gray-400">(Optional)</Text>
                            </Text>
                            <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-lg">
                                <TextInput
                                    className="px-5 py-4 text-base text-white bg-transparent rounded-2xl min-h-[100px]"
                                    style={{ textAlignVertical: 'top' }}
                                    value={groupDescription}
                                    onChangeText={setGroupDescription}
                                    placeholder="What's this group about? Share your vision..."
                                    placeholderTextColor="#6B7280"
                                    multiline
                                    numberOfLines={4}
                                    maxLength={500}
                                />
                            </View>
                        </View>

                        {/* Info Card */}
                        <View className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-5 rounded-2xl border border-blue-500/30 mb-6 shadow-lg">
                            <View className="flex-row items-center">
                                <Users size={24} color="#3B82F6" />
                                <View className="flex-1 ml-4">
                                    <Text className="text-lg font-bold text-blue-400 mb-1">🚀 Group Features</Text>
                                    <Text className="text-sm text-blue-200 leading-5">
                                        • Create challenges and bet with friends{'\n'}
                                        • Real-time group chat{'\n'}
                                        • Track progress together
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleNext}
                            className="bg-gradient-to-r from-[#8A83DA] to-[#6366F1] py-4 rounded-2xl shadow-xl"
                            disabled={!groupName.trim()}
                        >
                            <Text className="text-lg font-bold text-white text-center">
                                Next: Add Members →
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <View className="flex-1 px-6 py-6">
                        {/* Search Section */}
                        <View className="mb-6">
                            <Text className="text-lg font-bold text-white mb-4">
                                🔍 Find Friends
                            </Text>
                            <View className="bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-lg">
                                <View className="flex-row items-center px-5 py-4">
                                    <Search size={22} color="#8A83DA" />
                                    <TextInput
                                        className="flex-1 text-base text-white ml-3"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        placeholder="Search by username..."
                                        placeholderTextColor="#6B7280"
                                        autoCapitalize="none"
                                    />
                                    {searching && <ActivityIndicator size="small" color="#8A83DA" />}
                                </View>
                            </View>

                            {searchResults.length > 0 && (
                                <View className="mt-4 bg-[#1A1A1A] rounded-2xl border border-gray-700/50 shadow-xl max-h-[200px]">
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        {searchResults.map((user, index) => (
                                            <TouchableOpacity
                                                key={user.id}
                                                onPress={() => handleAddMember(user)}
                                                className={`flex-row items-center justify-between px-5 py-4 ${
                                                    index < searchResults.length - 1 ? 'border-b border-gray-700/50' : ''
                                                }`}
                                            >
                                                <View className="flex-1">
                                                    <Text className="text-base font-semibold text-white">@{user.username}</Text>
                                                    <Text className="text-sm text-gray-400 mt-1">{user.displayName}</Text>
                                                </View>
                                                <View className="w-10 h-10 bg-[#8A83DA]/20 rounded-full items-center justify-center">
                                                    <UserPlus size={18} color="#8A83DA" />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {selectedMembers.length > 0 ? (
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-white mb-4">
                                    ✅ Selected Members ({selectedMembers.length})
                                </Text>
                                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                                    {selectedMembers.map((member) => (
                                        <View key={member.id} className="flex-row items-center justify-between px-5 py-4 bg-[#1A1A1A] rounded-2xl mb-3 border border-gray-700/50 shadow-lg">
                                            <View className="flex-1">
                                                <Text className="text-base font-semibold text-white">@{member.username}</Text>
                                                <Text className="text-sm text-gray-400 mt-1">{member.displayName}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleRemoveMember(member.id)}
                                                className="w-8 h-8 bg-red-500/20 rounded-full items-center justify-center"
                                            >
                                                <X size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <View className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-700/50 shadow-lg">
                                    <Text className="text-6xl text-center mb-4">👥</Text>
                                    <Text className="text-lg font-bold text-white text-center mb-2">No Members Yet</Text>
                                    <Text className="text-sm text-gray-400 text-center">
                                        Search for friends to add to your group
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Footer Buttons */}
                        <View className="flex-row gap-4 pt-6">
                            <TouchableOpacity
                                onPress={() => setStep(1)}
                                className="flex-1 bg-[#1A1A1A] py-4 rounded-2xl items-center border border-gray-700/50 shadow-lg"
                            >
                                <Text className="text-base font-semibold text-gray-300">← Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCreateGroup}
                                className={`flex-2 py-4 rounded-2xl items-center flex-row justify-center shadow-xl ${
                                    loading ? 'bg-gray-600' : 'bg-gradient-to-r from-[#8A83DA] to-[#6366F1]'
                                }`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Users size={22} color="#FFFFFF" />
                                        <Text className="text-lg font-bold text-white ml-2">Create Group</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}


