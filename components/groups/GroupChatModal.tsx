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
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Users, Plus, MoreVertical, Phone, Video } from 'lucide-react-native';
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
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
        const isCurrentUser = message.senderId === 'current_user'; // This would come from auth context
        
        // Check if this message is part of a group (consecutive messages from same user)
        const isFirstInGroup = !previousMessage || previousMessage.senderId !== message.senderId;
        const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;

        return (
            <View key={message.id}>
                {showDateSeparator && (
                    <View className="items-center my-6">
                        <View className="bg-[#2A2A2A] px-3 py-1.5 rounded-xl">
                            <Text className="text-xs text-gray-300 font-medium">
                                {formatMessageDate(message.createdAt)}
                            </Text>
                        </View>
                    </View>
                )}

                <View className={`mb-1 max-w-[85%] ${isCurrentUser ? 'self-end' : 'self-start'}`}>
                    {!isCurrentUser && isFirstInGroup && (
                        <Text className="text-xs font-medium text-[#8A83DA] mb-1 ml-3">
                            {message.users?.display_name || 'Unknown User'}
                        </Text>
                    )}
                    
                    <View className={`px-4 py-2.5 ${
                        isCurrentUser 
                            ? 'bg-[#8A83DA] rounded-l-2xl rounded-tr-2xl' + (isLastInGroup ? ' rounded-br-md' : ' rounded-br-2xl')
                            : 'bg-[#2A2A2A] rounded-r-2xl rounded-tl-2xl' + (isLastInGroup ? ' rounded-bl-md' : ' rounded-bl-2xl')
                    } ${isFirstInGroup ? 'mt-1' : ''} ${isLastInGroup ? 'mb-2' : ''}`}>
                        <Text className={`text-base leading-5 ${
                            isCurrentUser ? 'text-white' : 'text-gray-100'
                        }`}>
                            {message.content}
                        </Text>
                        
                        <View className={`flex-row items-center mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <Text className={`text-[11px] ${
                                isCurrentUser 
                                    ? 'text-white/70' 
                                    : 'text-gray-400'
                            }`}>
                                {formatMessageTime(message.createdAt)}
                            </Text>
                            
                            {isCurrentUser && (
                                <View className="ml-1">
                                    {/* Message status indicators */}
                                    <View className="w-3 h-3 items-center justify-center">
                                        <View className="w-1 h-1 bg-white/70 rounded-full" />
                                        <View className="w-1 h-1 bg-white/70 rounded-full ml-0.5" />
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (!group) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
            <KeyboardAvoidingView
                className="flex-1 bg-[#1A1A1A]"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <LinearGradient
                    colors={['#8A83DA', '#463699']}
                    className="px-4 pt-12 pb-4"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                            <TouchableOpacity onPress={onClose} className="mr-4">
                                <ArrowLeft size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            
                            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
                                <Users size={20} color="#FFFFFF" />
                            </View>
                            
                            <View className="flex-1">
                                <Text className="text-white font-bold text-lg">{group.name}</Text>
                                <Text className="text-white/80 text-sm">
                                    {members.length} member{members.length !== 1 ? 's' : ''} • Online
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-4">
                            <TouchableOpacity>
                                <Video size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <Phone size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateChallenge}>
                                <MoreVertical size={22} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                {/* Messages Area */}
                <View className="flex-1 bg-[#0F0F0F]">
                    <ScrollView
                        ref={scrollViewRef}
                        className="flex-1"
                        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.length === 0 ? (
                            <View className="flex-1 items-center justify-center py-20">
                                <View className="w-20 h-20 rounded-full bg-[#8A83DA]/20 items-center justify-center mb-4">
                                    <Users size={32} color="#8A83DA" />
                                </View>
                                <Text className="text-lg font-semibold text-white mb-2">No messages yet</Text>
                                <Text className="text-sm text-gray-400 text-center leading-5">
                                    Start the conversation with your group members!
                                </Text>
                            </View>
                        ) : (
                            messages.map((message, index) => renderMessage(message, index))
                        )}
                    </ScrollView>
                </View>

                {/* Input Area */}
                <View className="bg-[#1A1A1A] px-4 py-3 border-t border-gray-800">
                    <View className="flex-row items-end">
                        <View className="flex-1 bg-[#2A2A2A] rounded-3xl border border-gray-700 mr-3">
                            <TextInput
                                className="px-4 py-3 text-white text-base max-h-[100px]"
                                value={newMessage}
                                onChangeText={setNewMessage}
                                placeholder="Type a message..."
                                placeholderTextColor="#6B7280"
                                multiline
                                maxLength={2000}
                                style={{ textAlignVertical: 'center' }}
                            />
                        </View>
                        
                        <TouchableOpacity
                            onPress={handleSendMessage}
                            disabled={!newMessage.trim() || loading}
                            className="w-12 h-12 rounded-full items-center justify-center"
                        >
                            <LinearGradient
                                colors={(!newMessage.trim() || loading) ? ['#374151', '#374151'] : ['#8A83DA', '#463699']}
                                className="w-12 h-12 rounded-full items-center justify-center"
                            >
                                <Send size={20} color="#FFFFFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}


