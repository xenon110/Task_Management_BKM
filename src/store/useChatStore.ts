import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  reactions: Record<string, string[]>;
  sender?: { name: string; avatar_url: string };
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  members?: string[];
}

interface ChatState {
  channels: Channel[];
  messages: ChatMessage[];
  isInitialized: boolean;
  initChat: () => Promise<void>;
  addChannel: (channel: Channel) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'created_at' | 'reactions'>) => Promise<void>;
  addReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  messages: [],
  isInitialized: false,

  initChat: async () => {
    try {
      const [channelsRes, messagesRes] = await Promise.all([
        supabase.from('channels').select('*'),
        supabase.from('messages').select('*, sender:users(name, avatar_url)').order('created_at', { ascending: true })
      ]);

      if (channelsRes.error) throw channelsRes.error;
      if (messagesRes.error) throw messagesRes.error;

      set({
        channels: channelsRes.data || [],
        messages: messagesRes.data || [],
        isInitialized: true
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  },

  addChannel: async (channel) => {
    const tempId = channel.id || `temp-channel-${Date.now()}`;
    const newChannel = { id: tempId, name: channel.name, type: channel.type };
    
    set((state) => ({
      channels: [...state.channels, { ...channel, id: tempId }]
    }));

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert([newChannel])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        channels: state.channels.map(c => c.id === tempId ? data : c)
      }));
    } catch (error) {
      console.error('Error adding channel:', error);
      set((state) => ({
        channels: state.channels.filter(c => c.id !== tempId)
      }));
    }
  },

  addMessage: async (message) => {
    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newMessage = {
      id: tempId,
      channel_id: message.channel_id,
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      sender_avatar: message.sender_avatar,
      content: message.content,
      reactions: {}
    };

    set((state) => ({
      messages: [...state.messages, { 
        ...newMessage, 
        id: tempId, 
        created_at: new Date().toISOString(),
        sender_name: message.sender_name,
        sender_avatar: message.sender_avatar 
      }]
    }));

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([newMessage])
        .select('*, sender:users(name, avatar_url)')
        .single();

      if (error) throw error;

      set((state) => ({
        messages: state.messages.map(m => m.id === tempId ? data : m)
      }));
    } catch (error) {
      console.error('Error adding message:', error);
      set((state) => ({
        messages: state.messages.filter(m => m.id !== tempId)
      }));
    }
  },

  addReaction: async (messageId, emoji, userId) => {
    const state = get();
    const message = state.messages.find(m => m.id === messageId);
    if (!message) return;

    const reactions = { ...message.reactions };
    if (!reactions[emoji]) reactions[emoji] = [];
    
    if (reactions[emoji].includes(userId)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(userId);
    }

    set((state) => ({
      messages: state.messages.map(m => m.id === messageId ? { ...m, reactions } : m)
    }));

    try {
      const { error } = await supabase
        .from('messages')
        .update({ reactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      set({ messages: state.messages });
    }
  }
}));

