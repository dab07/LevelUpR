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
            <View className="flex-1 bg-white">
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
                    <TouchableOpacity onPress={handleClose} className="p-1">
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold text-gray-900">
                        {step === 1 ? 'Create Group' : 'Add Members'}
                    </Text>
                    <View className="w-8" />
                </View>

                {step === 1 ? (
                    <ScrollView className="flex-1 p-5">
                        <View className="mb-6">
                            <Text className="text-base font-semibold text-gray-700 mb-2">Group Name *</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900"
                                value={groupName}
                                onChangeText={setGroupName}
                                placeholder="Enter group name"
                                maxLength={100}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-base font-semibold text-gray-700 mb-2">Description (Optional)</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900 h-20"
                                style={{ textAlignVertical: 'top' }}
                                value={groupDescription}
                                onChangeText={setGroupDescription}
                                placeholder="What's this group about?"
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleNext}
                            className="bg-purple-500 py-3 rounded-lg items-center mt-5"
                        >
                            <Text className="text-base font-semibold text-white">Next: Add Members</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <View className="flex-1 p-5">
                        <View className="mb-6">
                            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                                <Search size={20} color="#6B7280" />
                                <TextInput
                                    className="flex-1 text-base text-gray-900 ml-2"
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    placeholder="Search by username..."
                                    autoCapitalize="none"
                                />
                                {searching && <ActivityIndicator size="small" color="#8B5CF6" />}
                            </View>

                            {searchResults.length > 0 && (
                                <ScrollView className="max-h-[200px] mt-2 rounded-lg bg-gray-50">
                                    {searchResults.map((user) => (
                                        <TouchableOpacity
                                            key={user.id}
                                            onPress={() => handleAddMember(user)}
                                            className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200"
                                        >
                                            <View className="flex-1">
                                                <Text className="text-base font-semibold text-gray-900">@{user.username}</Text>
                                                <Text className="text-sm text-gray-500 mt-0.5">{user.displayName}</Text>
                                            </View>
                                            <UserPlus size={20} color="#8B5CF6" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {selectedMembers.length > 0 && (
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-gray-700 mb-3">
                                    Selected Members ({selectedMembers.length})
                                </Text>
                                <ScrollView className="flex-1">
                                    {selectedMembers.map((member) => (
                                        <View key={member.id} className="flex-row items-center justify-between px-4 py-3 bg-gray-100 rounded-lg mb-2">
                                            <View className="flex-1">
                                                <Text className="text-base font-semibold text-gray-900">@{member.username}</Text>
                                                <Text className="text-sm text-gray-500 mt-0.5">{member.displayName}</Text>
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
                                className="flex-1 bg-gray-100 py-3 rounded-lg items-center"
                            >
                                <Text className="text-base font-semibold text-gray-500">Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCreateGroup}
                                className="flex-2 bg-purple-500 py-3 rounded-lg items-center flex-row justify-center"
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Users size={20} color="#FFFFFF" />
                                        <Text className="text-base font-semibold text-white ml-2">Create Group</Text>
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


