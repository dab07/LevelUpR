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
            <View className="flex-1 bg-[#1A1A1A]">
                {/* Header */}
                <LinearGradient
                    colors={['#8A83DA', '#463699']}
                    className="px-5 pt-12 pb-4"
                >
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity onPress={handleClose} className="p-1">
                            <X size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-white">
                            {step === 1 ? 'Create Group' : 'Add Members'}
                        </Text>
                        <View className="w-8" />
                    </View>
                </LinearGradient>

                {step === 1 ? (
                    <ScrollView className="flex-1 p-5">
                        <View className="mb-6">
                            <Text className="text-base font-semibold text-white mb-3">Group Name *</Text>
                            <TextInput
                                className="bg-[#2A2A2A] border border-gray-700 rounded-2xl px-4 py-3 text-base text-white"
                                value={groupName}
                                onChangeText={setGroupName}
                                placeholder="Enter group name"
                                placeholderTextColor="#6B7280"
                                maxLength={100}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-base font-semibold text-white mb-3">Description (Optional)</Text>
                            <TextInput
                                className="bg-[#2A2A2A] border border-gray-700 rounded-2xl px-4 py-3 text-base text-white h-24"
                                style={{ textAlignVertical: 'top' }}
                                value={groupDescription}
                                onChangeText={setGroupDescription}
                                placeholder="What's this group about?"
                                placeholderTextColor="#6B7280"
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleNext}
                            className="mt-5 rounded-2xl"
                        >
                            <LinearGradient
                                colors={['#8A83DA', '#463699']}
                                className="py-3 rounded-2xl items-center"
                            >
                                <Text className="text-base font-semibold text-white">Next: Add Members</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <View className="flex-1 p-5">
                        <View className="mb-6">
                            <View className="flex-row items-center bg-[#2A2A2A] rounded-2xl px-4 py-3 border border-gray-700">
                                <Search size={20} color="#6B7280" />
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

                            {searchResults.length > 0 && (
                                <ScrollView className="max-h-[200px] mt-3 rounded-2xl bg-[#2A2A2A] border border-gray-700">
                                    {searchResults.map((user) => (
                                        <TouchableOpacity
                                            key={user.id}
                                            onPress={() => handleAddMember(user)}
                                            className="flex-row items-center justify-between px-4 py-3 border-b border-gray-700 last:border-b-0"
                                        >
                                            <View className="flex-1">
                                                <Text className="text-base font-semibold text-white">@{user.username}</Text>
                                                <Text className="text-sm text-gray-400 mt-0.5">{user.displayName}</Text>
                                            </View>
                                            <UserPlus size={20} color="#8A83DA" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {selectedMembers.length > 0 && (
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-white mb-3">
                                    Selected Members ({selectedMembers.length})
                                </Text>
                                <ScrollView className="flex-1">
                                    {selectedMembers.map((member) => (
                                        <View key={member.id} className="flex-row items-center justify-between px-4 py-3 bg-[#2A2A2A] rounded-2xl mb-3 border border-gray-700">
                                            <View className="flex-1">
                                                <Text className="text-base font-semibold text-white">@{member.username}</Text>
                                                <Text className="text-sm text-gray-400 mt-0.5">{member.displayName}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleRemoveMember(member.id)}
                                                className="p-1"
                                            >
                                                <X size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View className="flex-row gap-3 pt-5">
                            <TouchableOpacity
                                onPress={() => setStep(1)}
                                className="flex-1 bg-[#2A2A2A] py-3 rounded-2xl items-center border border-gray-700"
                            >
                                <Text className="text-base font-semibold text-gray-400">Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCreateGroup}
                                className="flex-2 rounded-2xl items-center flex-row justify-center"
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={loading ? ['#374151', '#374151'] : ['#8A83DA', '#463699']}
                                    className="flex-1 py-3 rounded-2xl items-center flex-row justify-center"
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Users size={20} color="#FFFFFF" />
                                            <Text className="text-base font-semibold text-white ml-2">Create Group</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}


