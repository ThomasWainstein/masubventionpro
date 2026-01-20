import { useState, useCallback } from 'react';
import type { ChatMessage } from './useStreamingAI';

const STORAGE_KEY = 'masubventionpro_chat_history';
const MAX_STORED_MESSAGES = 50;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredConversation {
  profileId: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

interface UseConversationMemoryReturn {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string, isStreaming?: boolean) => void;
  clearMessages: () => void;
  loadMessages: (profileId: string) => void;
}

/**
 * useConversationMemory - Persists chat history to localStorage
 * Automatically loads/saves conversation per profile with 24h expiry
 */
export function useConversationMemory(): UseConversationMemoryReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  // Load messages from localStorage for a profile
  const loadMessages = useCallback((profileId: string) => {
    setCurrentProfileId(profileId);

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setMessages([]);
        return;
      }

      const conversations: Record<string, StoredConversation> = JSON.parse(stored);
      const conversation = conversations[profileId];

      if (!conversation) {
        setMessages([]);
        return;
      }

      // Check if conversation has expired
      const now = Date.now();
      if (now - conversation.lastUpdated > SESSION_DURATION_MS) {
        // Expired, clear it
        delete conversations[profileId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        setMessages([]);
        return;
      }

      // Restore messages with proper Date objects
      const restoredMessages = conversation.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      setMessages(restoredMessages);
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([]);
    }
  }, []);

  // Save messages to localStorage
  const saveMessages = useCallback(
    (updatedMessages: ChatMessage[]) => {
      if (!currentProfileId) return;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const conversations: Record<string, StoredConversation> = stored
          ? JSON.parse(stored)
          : {};

        // Only keep last N messages
        const messagesToStore = updatedMessages.slice(-MAX_STORED_MESSAGES);

        conversations[currentProfileId] = {
          profileId: currentProfileId,
          messages: messagesToStore,
          lastUpdated: Date.now(),
        };

        // Clean up old conversations (older than 7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        Object.keys(conversations).forEach((id) => {
          if (conversations[id].lastUpdated < weekAgo) {
            delete conversations[id];
          }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    },
    [currentProfileId]
  );

  // Add a new message
  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => {
        const updated = [...prev, message];
        saveMessages(updated);
        return updated;
      });
    },
    [saveMessages]
  );

  // Update the last message (for streaming)
  const updateLastMessage = useCallback(
    (content: string, isStreaming?: boolean) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;

        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...lastMsg,
          content,
          isStreaming: isStreaming ?? lastMsg.isStreaming,
        };

        // Only save when streaming is complete
        if (!isStreaming) {
          saveMessages(updated);
        }

        return updated;
      });
    },
    [saveMessages]
  );

  // Clear all messages for current profile
  const clearMessages = useCallback(() => {
    setMessages([]);

    if (!currentProfileId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const conversations: Record<string, StoredConversation> = JSON.parse(stored);
        delete conversations[currentProfileId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      }
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }, [currentProfileId]);

  return {
    messages,
    addMessage,
    updateLastMessage,
    clearMessages,
    loadMessages,
  };
}

export default useConversationMemory;
