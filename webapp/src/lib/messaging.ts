import { supabase } from './supabase';

export interface Message {
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
}

export const sendMessage = async (message: Message) => {
    const { data, error } = await supabase.from('messages').insert(message);
    if (error) {
        throw error;
    }
    return data;
}