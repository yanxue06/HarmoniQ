import { supabase } from './supabase';

export interface Message {
    id?: string;
    sender_id: string;
    receiver_id: string;
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
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),` +
            `and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }
    return data || [];
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
 * Get all connections for a user
 */
export const getUserConnections = async (userId: string) => {
    // Simple query without foreign key references
    const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq('status', 'accepted');

    if (error) {
        console.error("Error fetching connections:", error);
        throw error;
    }

    return data || [];
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
            filter: `receiver_id=eq.${userId}`
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