import { supabase } from './supabase';

export interface Message {
    id?: string;
    sender_uid: string;
    receiver_uid: string;
    content: string;
    created_at: string;
    read?: boolean;
    shared_content?: any;
}

export interface Connection {
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
    user_id_1: string;
    user_id_2: string;
    initiated_by: string;
    compatibility_score: number | null;
    created_at: string;
}

/**
 * Send a message to another user
 */
export const sendMessage = async (message: Message) => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            ...message,
            read: false
        })
        .select();
        
    if (error) {
        throw error;
    }
    return data?.[0];
};

/**
 * Get messages between the current user and another user
 */
export const getMessages = async (currentUserId: string, otherUserId: string) => {
    if (!currentUserId || !otherUserId) {
        throw new Error('Both currentUserId and otherUserId are required');
    }

    // First get messages where current user is sender
    const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_uid', currentUserId)
        .eq('receiver_uid', otherUserId);

    if (sentError) {
        console.error('Error fetching sent messages:', sentError);
        throw sentError;
    }

    // Then get messages where current user is receiver
    const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_uid', otherUserId)
        .eq('receiver_uid', currentUserId);

    if (receivedError) {
        console.error('Error fetching received messages:', receivedError);
        throw receivedError;
    }

    // Combine and sort messages
    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
    return allMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    
    const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', messageIds);

    if (error) {
        throw error;
    }
};

/**
 * Get all connections for a user regardless of status
 */
export const getAllUserConnections = async (userId: string) => {
    if (!userId) {
        throw new Error('userId is required');
    }

    const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or('user_id_1.eq.' + userId + ',user_id_2.eq.' + userId);

    if (error) {
        console.error("Error fetching all connections:", error);
        throw error;
    }

    return data || [];
};

/**
 * Get active messaging connections for a user (accepted connections with profile data)
 */
export const getUserConnections = async (userId: string) => {
    if (!userId) {
        throw new Error('userId is required');
    }

    try {
        // Get accepted connections using the base connection query
        const connections = await getAllUserConnections(userId);
        const acceptedConnections = connections.filter(conn => conn.status === 'accepted');

        if (acceptedConnections.length === 0) {
            console.log("No accepted connections found for user:", userId);
            return [];
        }

        // Get all the other user IDs we need to fetch profiles for
        const otherUserIds = acceptedConnections.map(conn => 
            conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1
        );

        console.log("Looking up profiles for users:", otherUserIds);

        // Fetch profiles for all other users
        const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', otherUserIds);

        if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
            throw profilesError;
        }

        // Map profiles to a dictionary for easy lookup
        const profileMap = (profiles || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
        }, {} as Record<string, any>);

        // Transform connections with profile data
        return acceptedConnections.map(conn => {
            const otherUserId = conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1;
            const profile = profileMap[otherUserId];

            return {
                id: conn.id,
                status: conn.status,
                user_id_1: conn.user_id_1,
                user_id_2: conn.user_id_2,
                initiated_by: conn.initiated_by,
                compatibility_score: conn.compatibility_score,
                created_at: conn.created_at,
                other_user: {
                    user_id: otherUserId,
                    display_name: profile?.display_name || 'Unknown User',
                    avatar_url: profile?.avatar_url
                }
            };
        });
    } catch (error) {
        console.error("Error fetching connections:", error);
        throw error;
    }
};

/**
 * Subscribe to new messages
 */
export const subscribeToMessages = (
    userId: string, 
    callback: (message: Message) => void
) => {
    const subscription = supabase
        .channel('messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_uid=eq.${userId}`
        }, (payload) => {
            callback(payload.new as Message);
        })
        .subscribe();

    return subscription;
};

/**
 * Format timestamp to readable time
 */
export const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};