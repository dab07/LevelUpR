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
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {step === 1 ? 'Create Group' : 'Add Members'}
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                {step === 1 ? (
                    <ScrollView style={styles.content}>
                        <View style={styles.section}>
                            <Text style={styles.label}>Group Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={groupName}
                                onChangeText={setGroupName}
                                placeholder="Enter group name"
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>Description (Optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
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
                            style={styles.nextButton}
                        >
                            <Text style={styles.nextButtonText}>Next: Add Members</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <View style={styles.content}>
                        <View style={styles.searchSection}>
                            <View style={styles.searchContainer}>
                                <Search size={20} color="#6B7280" />
                                <TextInput
                                    style={styles.searchInput}
                                    value={searchQuery}
                                    onChangeText={handleSearch}
                                    placeholder="Search by username..."
                                    autoCapitalize="none"
                                />
                                {searching && <ActivityIndicator size="small" color="#8B5CF6" />}
                            </View>

                            {searchResults.length > 0 && (
                                <ScrollView style={styles.searchResults}>
                                    {searchResults.map((user) => (
                                        <TouchableOpacity
                                            key={user.id}
                                            onPress={() => handleAddMember(user)}
                                            style={styles.searchResult}
                                        >
                                            <View style={styles.userInfo}>
                                                <Text style={styles.username}>@{user.username}</Text>
                                                <Text style={styles.displayName}>{user.displayName}</Text>
                                            </View>
                                            <UserPlus size={20} color="#8B5CF6" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {selectedMembers.length > 0 && (
                            <View style={styles.selectedSection}>
                                <Text style={styles.selectedTitle}>
                                    Selected Members ({selectedMembers.length})
                                </Text>
                                <ScrollView style={styles.selectedList}>
                                    {selectedMembers.map((member) => (
                                        <View key={member.id} style={styles.selectedMember}>
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberUsername}>@{member.username}</Text>
                                                <Text style={styles.memberDisplayName}>{member.displayName}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleRemoveMember(member.id)}
                                                style={styles.removeButton}
                                            >
                                                <X size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity
                                onPress={() => setStep(1)}
                                style={styles.backButton}
                            >
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCreateGroup}
                                style={styles.createButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Users size={20} color="#FFFFFF" />
                                        <Text style={styles.createButtonText}>Create Group</Text>
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
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    nextButton: {
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    searchSection: {
        marginBottom: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        marginLeft: 8,
    },
    searchResults: {
        maxHeight: 200,
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
    },
    searchResult: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    displayName: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    selectedSection: {
        flex: 1,
    },
    selectedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    selectedList: {
        flex: 1,
    },
    selectedMember: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        marginBottom: 8,
    },
    memberInfo: {
        flex: 1,
    },
    memberUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    memberDisplayName: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    removeButton: {
        padding: 4,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 20,
    },
    backButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    createButton: {
        flex: 2,
        backgroundColor: '#8B5CF6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
});
