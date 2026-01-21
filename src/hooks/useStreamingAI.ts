import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useConversationMemory } from './useConversationMemory';
import type { QuickScoreData } from '@/components/chat/IntelligenceScoreCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatIntelligence {
  intent?: 'score_query' | 'stacking_query' | 'general_conversation' | 'report_request';
  enrichedIntent?: {
    primary: string;
    urgency: 'high' | 'medium' | 'low';
    sophistication: 'novice' | 'intermediate' | 'expert';
  };
  quickScore?: {
    raw: QuickScoreData;
    formatted: string;
  };
  stacking?: {
    raw: Array<{
      subsidy_id: string;
      subsidy_title: string;
      agency: string;
      compatibility_score: number;
      companies_stacked: number;
      typical_sequence: string;
    }>;
    formatted: string;
  };
  profileMatches?: {
    matches: Array<{
      id: string;
      title: string;
      organization?: string;
      successProbability: number;
      amountMax?: number;
      fundingType?: string;
      deadline?: string;
      successReasons?: string[];
    }>;
    stats?: {
      totalMatches: number;
      highProbabilityCount: number;
      totalPotential: number;
      avgSuccessProbability?: number;
    };
    benchmark?: {
      baseSuccessRate: number;
      trend: string;
      competitiveDensity: string;
      similarCompaniesCount?: number;
      avgAmountReceived?: number;
      topPrograms?: string[];
    };
  };
  conversationMaturity?: {
    isReady: boolean;
    score: number;
    reasons: string[];
  };
  suggestReport?: boolean;
  triggerReport?: boolean;
  detectedContext?: {
    newRegion?: string;
    detectedCity?: string;
    projectType?: string;
  };
  rgpdProtection?: {
    wasAnonymized: boolean;
    piiFound: string[];
    sensitivity: string;
  };
}

// Conversation from database
interface DbConversation {
  id: string;
  user_id: string;
  title: string;
  messages: any[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface UseStreamingAIReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  intelligence: ChatIntelligence | null;
  conversationId: string | null;
  conversations: DbConversation[];
  sendMessage: (content: string, profileId: string) => Promise<void>;
  clearMessages: () => void;
  loadConversation: (profileId: string) => void;
  loadConversationById: (conversationId: string) => Promise<void>;
  loadConversationList: () => Promise<void>;
  createNewConversation: () => void;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-profile-conversation-stream`;

export function useStreamingAI(): UseStreamingAIReturn {
  const { user } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<ChatIntelligence | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use conversation memory for persistence
  const {
    messages,
    conversationId,
    conversations,
    addMessage,
    updateLastMessage,
    clearMessages: clearStoredMessages,
    loadMessages,
    loadConversationById,
    loadConversationList,
    createNewConversation,
  } = useConversationMemory();

  // Load conversation for a profile
  const loadConversation = useCallback(
    (profileId: string) => {
      loadMessages(profileId);
      setIntelligence(null);
      setError(null);
    },
    [loadMessages]
  );

  const sendMessage = useCallback(
    async (content: string, profileId: string) => {
      if (!user || !content.trim()) return;

      // Cancel any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      // Add messages to memory
      addMessage(userMessage);
      addMessage(assistantMessage);

      setIsStreaming(true);
      setError(null);

      try {
        // Refresh session to get fresh token
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        let session = refreshData?.session;

        // Fallback to getSession if refresh fails
        if (refreshError || !session) {
          const { data: sessionData } = await supabase.auth.getSession();
          session = sessionData?.session;
        }

        if (!session?.access_token) {
          throw new Error('Non authentifie - veuillez rafraichir la page');
        }

        // Prepare conversation history (last 10 messages for context)
        const conversationHistory = messages.slice(-10).map((msg) => ({
          type: msg.role,
          content: msg.content,
        }));

        abortControllerRef.current = new AbortController();

        const response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            message: content.trim(),
            profileId,
            conversationHistory,
            sessionId: null,
            userTier: 'business', // MaSubventionPro users
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Stream error response:', errorText);
          throw new Error(`Erreur du service: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Impossible de lire la reponse');
        }

        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'content') {
                  accumulatedContent += parsed.content;
                  updateLastMessage(accumulatedContent, true);
                } else if (parsed.type === 'done') {
                  // Extract intelligence data
                  if (parsed.intelligence) {
                    setIntelligence(parsed.intelligence);
                  }

                  // Mark message as complete
                  updateLastMessage(accumulatedContent, false);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }

        console.error('Streaming error:', err);
        setError(err.message || 'Une erreur est survenue');

        // Update the assistant message to show error
        updateLastMessage(
          "Desole, une erreur s'est produite. Veuillez reessayer.",
          false
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [user, messages, addMessage, updateLastMessage]
  );

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearStoredMessages();
    setIntelligence(null);
    setError(null);
    setIsStreaming(false);
  }, [clearStoredMessages]);

  return {
    messages,
    isStreaming,
    error,
    intelligence,
    conversationId,
    conversations,
    sendMessage,
    clearMessages,
    loadConversation,
    loadConversationById,
    loadConversationList,
    createNewConversation,
  };
}

export default useStreamingAI;
