 import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
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
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    useEffect(() => {
        if (visible && group) {
            loadGroupData();
            setupMessageSubscription();
        }

        return () => {
            if (subscriptionRef.current && typeof subscriptionRef.current.unsubscribe === 'function') {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
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
            console.error('Error loading group data:', error);
        }
    };

    const setupMessageSubscription = () => {
        if (!group) return;

        try {
            const subscription = groupService.subscribeToGroupMessages(
                group.id,
                (newMessage: Message) => {
                    setMessages(prev => [...prev, newMessage]);
                    setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            );

            subscriptionRef.current = subscription;
        } catch (error) {
            console.error('Error setting up message subscription:', error);
        }
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
                    <View className="items-center my-4">
                        <Text className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-xl">
                            {formatMessageDate(message.createdAt)}
                        </Text>
                    </View>
                )}

                <View className={`my-1 max-w-[80%] px-3 py-2 rounded-2xl ${
                    isCurrentUser 
                        ? 'self-end bg-violet-500' 
                        : 'self-start bg-gray-100'
                }`}>
                    {!isCurrentUser && (
                        <Text className="text-xs font-semibold text-gray-500 mb-0.5">
                            {message.users?.display_name || 'Unknown User'}
                        </Text>
                    )}
                    <Text className={`text-base leading-5 ${
                        isCurrentUser ? 'text-white' : 'text-gray-900'
                    }`}>
                        {message.content}
                    </Text>
                    <Text className={`text-[11px] mt-1 ${
                        isCurrentUser 
                            ? 'text-white/70 text-right' 
                            : 'text-gray-400'
                    }`}>
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
                className="flex-1 bg-white"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
                    <TouchableOpacity onPress={onClose} className="p-1">
                        <X size={24} color="#6B7280" />
                    </TouchableOpacity>

                    <View className="flex-1 items-center">
                        <Text className="text-lg font-semibold text-gray-900">{group.name}</Text>
                        <Text className="text-sm text-gray-500 mt-0.5">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleCreateChallenge}
                        className="p-2 bg-violet-500/10 rounded-2xl"
                    >
                        <Plus size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.length === 0 ? (
                        <View className="flex-1 items-center justify-center py-15">
                            <Users size={48} color="#D1D5DB" />
                            <Text className="text-lg font-semibold text-gray-500 mt-4">No messages yet</Text>
                            <Text className="text-sm text-gray-400 mt-2 text-center">
                                Start the conversation with your group!
                            </Text>
                        </View>
                    ) : (
                        messages.map((message, index) => renderMessage(message, index))
                    )}
                </ScrollView>

                <View className="flex-row items-end px-4 py-3 border-t border-gray-200 bg-white">
                    <TextInput
                        className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-base max-h-[100px] mr-3"
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        onPress={handleSendMessage}
                        className={`p-2.5 rounded-2xl ${
                            (!newMessage.trim() || loading) 
                                ? 'bg-gray-100' 
                                : 'bg-violet-500/10'
                        }`}
                        disabled={!newMessage.trim() || loading}
                    >
                        <Send size={20} color={!newMessage.trim() || loading ? '#9CA3AF' : '#8B5CF6'} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}


