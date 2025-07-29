import { supabase } from '@/lib/supabase';
import { Group, GroupMember, Message, GroupChallenge } from '@/types';

class GroupService {
    async createGroup(name: string, description: string, memberUsernames: string[]): Promise<Group> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Create the groups
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
                name,
                description,
                creator_id: user.id,
                is_private: true,
            })
            .select()
            .single();

        if (groupError) throw groupError;

        // Add members to the groups
        if (memberUsernames.length > 0) {
            // Get user IDs from usernames
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, username')
                .in('username', memberUsernames);

            if (usersError) throw usersError;

            // Add members
            const memberInserts = users.map(user => ({
                group_id: group.id,
                user_id: user.id,
                role: 'member' as const,
            }));

            const { error: membersError } = await supabase
                .from('group_members')
                .insert(memberInserts);

            if (membersError) throw membersError;
        }

        return group;
    }

    async getUserGroups(userId: string): Promise<Group[]> {
        const { data, error } = await supabase
            .from('groups')
            .select(`
        *,
        group_members!inner(user_id)
      `)
            .eq('group_members.user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getGroupMembers(groupId: string): Promise<GroupMember[]> {
        const { data, error } = await supabase
            .from('group_members')
            .select(`
        *,
        users(username, display_name)
      `)
            .eq('group_id', groupId);

        if (error) throw error;

        return (data || []).map(member => ({
            id: member.id,
            groupId: member.group_id,
            userId: member.user_id,
            username: member.users.username,
            displayName: member.users.display_name,
            role: member.role,
            joinedAt: member.joined_at,
        }));
    }

    async searchUsers(query: string): Promise<{ id: string; username: string; displayName: string }[]> {
        if (!query.trim()) return [];

        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;
        return data || [];
    }

    async sendMessage(groupId: string, content: string): Promise<Message> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: user.id,
                group_id: groupId,
                content,
                message_type: 'text',
            })
            .select(`
        *,
        users(username, display_name)
      `)
            .single();

        if (error) throw error;
        return data;
    }

    async getGroupMessages(groupId: string, limit = 50): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
        *,
        users(username, display_name)
      `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).reverse();
    }

    async subscribeToGroupMessages(groupId: string, callback: (message: Message) => void) {
        return supabase
            .channel(`group_${groupId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `group_id=eq.${groupId}`,
                },
                async (payload) => {
                    // Fetch the complete message with user data
                    const { data } = await supabase
                        .from('messages')
                        .select(`
              *,
              users(username, display_name)
            `)
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        callback(data);
                    }
                }
            )
            .subscribe();
    }

    async createGroupChallenge(
        groupId: string,
        title: string,
        description: string,
        deadline: string,
        minimumBet: number
    ): Promise<GroupChallenge> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('challenges')
            .insert({
                creator_id: user.id,
                group_id: groupId,
                title,
                description,
                deadline,
                minimum_bet: minimumBet,
                is_global: false,
                status: 'active',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export const groupService = new GroupService();
