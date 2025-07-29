import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { X, Send, Users, Plus } from 'lucide-react-native';
import { groupService } from '@/services/groupService';
import { Group, Message, GroupMember } from '@/types';

interface GroupChatModalProps {
    visible: boolean;
    onClose: () => void;
    group: Group | null;
}

export default function GroupChatModal({ visible, onClose, group }: GroupChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const subscriptionRef = useRef<any>(null);

    useEffect(() => {
        if (visible && group) {
            loadGroupData();
            setupMessageSubscription();
        }

        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }
        };
    }, [visible, group]);

    const loadGroupData = async () => {
        if (!group) return;

        try {
            const [groupMessages, groupMembers] = await Promise.all([
                groupService.getGroupMessages(group.id),
                groupService.getGroupMembers(group.id),
            ]);

            setMessages(groupMessages);
            setMembers(groupMembers);
        } catch (error) {
            console.error('Error loading groups data:', error);
        }
    };

    const setupMessageSubscription = () => {
        if (!group) return;

        subscriptionRef.current = groupService.subscribeToGroupMessages(
            group.id,
            (newMessage: Message) => {
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !group || loading) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setLoading(true);

        try {
            await groupService.sendMessage(group.id, messageText);
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
            setNewMessage(messageText); // Restore message on error
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChallenge = () => {
        Alert.alert(
            'Create Challenge',
            'Challenge creation feature coming soon!',
            [{ text: 'OK' }]
        );
    };

    const formatMessageTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatMessageDate = (timestamp: string): string => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
        if (!previousMessage) return true;

        const currentDate = new Date(currentMessage.createdAt).toDateString();
        const previousDate = new Date(previousMessage.createdAt).toDateString();

        return currentDate !== previousDate;
    };

    const renderMessage = (message: Message, index: number) => {
        const previousMessage = index > 0 ? messages[index - 1] : undefined;
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
        const isCurrentUser = message.senderId === 'current_user'; // This would come from auth context

        return (
            <View key={message.id}>
                {showDateSeparator && (
                    <View style={styles.dateSeparator}>
                        <Text style={styles.dateSeparatorText}>
                            {formatMessageDate(message.createdAt)}
                        </Text>
                    </View>
                )}

                <View style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
                ]}>
                    {!isCurrentUser && (
                        <Text style={styles.senderName}>
                            {message.users?.display_name || 'Unknown User'}
                        </Text>
                    )}
                    <Text style={[
                        styles.messageText,
                        isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
                    ]}>
                        {message.content}
                    </Text>
                    <Text style={[
                        styles.messageTime,
                        isCurrentUser ? styles.currentUserMessageTime : styles.otherUserMessageTime
                    ]}>
                        {formatMessageTime(message.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (!group) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.memberCount}>
                            {members.length} member{members.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleCreateChallenge}
                        style={styles.challengeButton}
                    >
                        <Plus size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Users size={48} color="#D1D5DB" />
                            <Text style={styles.emptyStateText}>No messages yet</Text>
                            <Text style={styles.emptyStateSubtext}>
                                Start the conversation with your group!
                            </Text>
                        </View>
                    ) : (
                        messages.map((message, index) => renderMessage(message, index))
                    )}
                </ScrollView>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.messageInput}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        onPress={handleSendMessage}
                        style={[
                            styles.sendButton,
                            (!newMessage.trim() || loading) && styles.sendButtonDisabled
                        ]}
                        disabled={!newMessage.trim() || loading}
                    >
                        <Send size={20} color={!newMessage.trim() || loading ? '#9CA3AF' : '#8B5CF6'} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    groupName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    memberCount: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    challengeButton: {
        padding: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderRadius: 20,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
    },
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: '#9CA3AF',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
    },
    currentUserMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#8B5CF6',
    },
    otherUserMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3F4F6',
    },
    senderName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    currentUserMessageText: {
        color: '#FFFFFF',
    },
    otherUserMessageText: {
        color: '#111827',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    currentUserMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    otherUserMessageTime: {
        color: '#9CA3AF',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    messageInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 12,
    },
    sendButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    sendButtonDisabled: {
        backgroundColor: '#F3F4F6',
    },
});
