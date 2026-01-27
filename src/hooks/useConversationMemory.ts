import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage } from './useStreamingAI';

const MAX_STORED_MESSAGES = 50;

// Database message format
interface DbMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

// Conversation from database
interface DbConversation {
  id: string;
  user_id: string;
  title: string;
  messages: DbMessage[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface UseConversationMemoryReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  conversations: DbConversation[];
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string, isStreaming?: boolean) => void;
  clearMessages: () => void;
  loadMessages: (profileId: string) => void;
  loadConversationById: (conversationId: string) => Promise<void>;
  loadConversationList: () => Promise<void>;
  createNewConversation: () => void;
}

/**
 * useConversationMemory - Persists chat history to Supabase database
 * Automatically loads/saves conversation per user with conversation history
 * Falls back to session-only storage if database is unavailable (406 error with opaque keys)
 */
export function useConversationMemory(): UseConversationMemoryReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<ChatMessage[]>([]);
  // DISABLED: Database persistence for conversation_history
  // The opaque publishable key doesn't support REST API access to this table (406 error)
  // Using in-memory only storage - conversations won't persist across page reloads
  const dbAvailableRef = useRef<boolean>(false); // Disabled - always use in-memory
  const dbCheckedRef = useRef<boolean>(true);    // Already "checked" - skip DB calls
  const dbCheckingRef = useRef<boolean>(false);

  // Helper to check if error is a 406 (Not Acceptable) - opaque key limitation
  const is406Error = (error: any): boolean => {
    if (!error) return false;
    // Check various places the 406 might appear
    const code = error.code;
    const status = error.status;
    const message = error.message || '';
    return (
      code === '406' ||
      code === 406 ||
      status === 406 ||
      message.includes('406') ||
      message.includes('Not Acceptable')
    );
  };

  // Convert ChatMessage to DB format
  const toDbMessage = (msg: ChatMessage): DbMessage => ({
    id: msg.id,
    content: msg.content,
    sender: msg.role,
    timestamp: msg.timestamp.toISOString(),
  });

  // Convert DB format to ChatMessage
  const fromDbMessage = (msg: DbMessage): ChatMessage => ({
    id: msg.id,
    role: msg.sender,
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    isStreaming: false,
  });

  // Generate a title from the first user message
  const generateTitle = (content: string): string => {
    const maxLength = 50;
    const cleaned = content.trim().replace(/\n/g, ' ');
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength - 3) + '...';
  };

  // Load conversation list for current user
  const loadConversationList = useCallback(async () => {
    // Skip if db not available, or if another check is in progress (prevents duplicate 406)
    if (!user || !dbAvailableRef.current) return;
    if (!dbCheckedRef.current && dbCheckingRef.current) return;

    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        if (is406Error(error)) {
          console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
          dbAvailableRef.current = false;
          dbCheckedRef.current = true;
          return;
        }
        console.error('Error loading conversation list:', error);
        return;
      }

      dbCheckedRef.current = true;
      setConversations(data || []);
    } catch (error: any) {
      if (is406Error(error)) {
        console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
        dbAvailableRef.current = false;
        dbCheckedRef.current = true;
        return;
      }
      console.error('Error loading conversation list:', error);
    }
  }, [user]);

  // Load a specific conversation by ID
  const loadConversationById = useCallback(async (id: string) => {
    if (!user || !dbAvailableRef.current) return;

    try {
      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (is406Error(error)) {
          console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
          dbAvailableRef.current = false;
          dbCheckedRef.current = true;
          return;
        }
        console.error('Error loading conversation:', error);
        return;
      }

      if (data) {
        setConversationId(data.id);
        const restoredMessages = (data.messages || []).map(fromDbMessage);
        setMessages(restoredMessages);
        pendingMessagesRef.current = restoredMessages;
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [user]);

  // Load messages - loads most recent conversation or creates new one
  const loadMessages = useCallback(
    async (_profileId: string) => {
      if (!user) {
        setMessages([]);
        return;
      }

      // If db is not available, keep existing in-memory messages (session-only mode)
      // Only clear messages on first load (when we have no messages yet)
      if (!dbAvailableRef.current) {
        // Don't wipe existing messages - this preserves the current conversation
        // Messages will only be cleared by explicit user action (clearMessages)
        if (pendingMessagesRef.current.length === 0) {
          // First load - initialize empty
          setMessages([]);
        }
        return;
      }

      // Mark that we're checking db availability (prevents duplicate 406 errors)
      dbCheckingRef.current = true;

      try {
        // Try to load the most recent non-archived conversation
        const { data, error } = await supabase
          .from('conversation_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // 406 = Not Acceptable - opaque key doesn't have REST API access
          if (is406Error(error)) {
            console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
            dbAvailableRef.current = false;
            dbCheckedRef.current = true;
            dbCheckingRef.current = false;
            setMessages([]);
            pendingMessagesRef.current = [];
            return;
          }
          // PGRST116 = no rows found (this is ok)
          if (error.code !== 'PGRST116') {
            console.error('Error loading conversation:', error);
            dbCheckingRef.current = false;
            setMessages([]);
            return;
          }
        }

        dbCheckedRef.current = true;
        dbCheckingRef.current = false;

        if (data) {
          setConversationId(data.id);
          const restoredMessages = (data.messages || []).map(fromDbMessage);
          setMessages(restoredMessages);
          pendingMessagesRef.current = restoredMessages;
        } else {
          // No existing conversation, start fresh
          setConversationId(null);
          setMessages([]);
          pendingMessagesRef.current = [];
        }

        // Also load conversation list
        loadConversationList();
      } catch (error: any) {
        // Check for 406 in fetch errors
        if (is406Error(error)) {
          console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
          dbAvailableRef.current = false;
          dbCheckedRef.current = true;
          dbCheckingRef.current = false;
          setMessages([]);
          pendingMessagesRef.current = [];
          return;
        }
        console.error('Error loading conversation:', error);
        dbCheckingRef.current = false;
        setMessages([]);
      }
    },
    [user, loadConversationList]
  );

  // Save messages to database (debounced)
  // When db is not available, messages are kept in memory only (session storage)
  const saveMessages = useCallback(
    async (updatedMessages: ChatMessage[], forceImmediate = false) => {
      if (!user) return;

      // Store pending messages (always, even if db not available - for in-memory use)
      pendingMessagesRef.current = updatedMessages;

      // Skip database operations if db is not available
      if (!dbAvailableRef.current) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const doSave = async () => {
        const messagesToSave = pendingMessagesRef.current;
        if (messagesToSave.length === 0) return;

        // Only keep last N messages
        const trimmedMessages = messagesToSave.slice(-MAX_STORED_MESSAGES);
        const dbMessages = trimmedMessages.map(toDbMessage);

        try {
          if (conversationId) {
            // Update existing conversation
            const { error } = await supabase
              .from('conversation_history')
              .update({
                messages: dbMessages,
                updated_at: new Date().toISOString(),
              })
              .eq('id', conversationId)
              .eq('user_id', user.id);

            if (error) {
              if (is406Error(error)) {
                console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
                dbAvailableRef.current = false;
                return;
              }
              console.error('Error updating conversation:', error);
            }
          } else {
            // Create new conversation
            const firstUserMessage = messagesToSave.find((m) => m.role === 'user');
            const title = firstUserMessage
              ? generateTitle(firstUserMessage.content)
              : 'Nouvelle conversation';

            const { data, error } = await supabase
              .from('conversation_history')
              .insert({
                user_id: user.id,
                title,
                messages: dbMessages,
              })
              .select()
              .single();

            if (error) {
              if (is406Error(error)) {
                console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
                dbAvailableRef.current = false;
                return;
              }
              console.error('Error creating conversation:', error);
            } else if (data) {
              setConversationId(data.id);
            }
          }
        } catch (error) {
          console.error('Error saving conversation:', error);
        }
      };

      if (forceImmediate) {
        await doSave();
      } else {
        // Debounce saves to avoid too many database writes during streaming
        saveTimeoutRef.current = setTimeout(doSave, 1000);
      }
    },
    [user, conversationId]
  );

  // Add a new message
  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => {
        const updated = [...prev, message];
        // Always update pendingMessagesRef to prevent loadMessages from wiping messages
        pendingMessagesRef.current = updated;
        // Don't save to DB immediately for streaming messages
        if (!message.isStreaming) {
          saveMessages(updated);
        }
        return updated;
      });
    },
    [saveMessages]
  );

  // Update the last message (for streaming)
  const updateLastMessage = useCallback(
    (content: string, isStreaming?: boolean) => {
      setMessages((prev) => {
        if (prev.length === 0) {
          console.warn('[updateLastMessage] No messages to update');
          return prev;
        }

        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...lastMsg,
          content,
          isStreaming: isStreaming ?? lastMsg.isStreaming,
        };

        // Always update pendingMessagesRef to keep it in sync
        pendingMessagesRef.current = updated;

        // Log first few updates
        if (content.length < 200) {
          console.log('[updateLastMessage] Updated message:', { contentLength: content.length, isStreaming });
        }

        // Save when streaming is complete
        if (!isStreaming) {
          saveMessages(updated, true); // Force immediate save
        }

        return updated;
      });
    },
    [saveMessages]
  );

  // Create a new conversation (clears current and starts fresh)
  const createNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    pendingMessagesRef.current = [];
  }, []);

  // Clear/archive current conversation
  const clearMessages = useCallback(async () => {
    setMessages([]);
    pendingMessagesRef.current = [];

    if (!user || !conversationId) {
      setConversationId(null);
      return;
    }

    // Skip database operations if db is not available
    if (!dbAvailableRef.current) {
      setConversationId(null);
      return;
    }

    try {
      // Archive the conversation instead of deleting
      const { error } = await supabase
        .from('conversation_history')
        .update({ is_archived: true })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        if (is406Error(error)) {
          console.warn('[ConversationMemory] Database not accessible (406), using session-only storage');
          dbAvailableRef.current = false;
        } else {
          console.error('Error archiving conversation:', error);
        }
      }

      setConversationId(null);
      // Refresh conversation list
      loadConversationList();
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }, [user, conversationId, loadConversationList]);

  return {
    messages,
    conversationId,
    conversations,
    addMessage,
    updateLastMessage,
    clearMessages,
    loadMessages,
    loadConversationById,
    loadConversationList,
    createNewConversation,
  };
}

export default useConversationMemory;
