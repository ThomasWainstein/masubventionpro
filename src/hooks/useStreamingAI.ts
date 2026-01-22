import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useConversationMemory } from './useConversationMemory';
import { useAIUsage, estimateTokens } from './useAIUsage';
import { detectPII, maskPIIWithMatches } from '@/lib/pii';
import type { PIIUserChoice, PendingPIIMessage } from '@/lib/pii';
import type { QuickScoreData } from '@/components/chat/IntelligenceScoreCard';
import type { MaSubventionProProfile } from '@/types';
import type { AIUsageStatus } from '@/types/ai-usage';

// Business tier types for AI context
type BusinessTier = 'startup' | 'tpe' | 'pme' | 'eti' | 'ge' | 'association';

/**
 * Determine business tier based on profile characteristics
 * This helps the AI provide more relevant and contextual responses
 */
function determineBusinessTier(profile: MaSubventionProProfile | null): BusinessTier {
  if (!profile) return 'pme'; // Default fallback

  const { employees, legal_form, year_created, annual_turnover, company_category } = profile;

  // Association gets its own tier
  if (legal_form === 'ASSO') {
    return 'association';
  }

  // Check company_category if available (from INSEE data)
  if (company_category) {
    const categoryLower = company_category.toLowerCase();
    if (categoryLower.includes('ge') || categoryLower.includes('grande entreprise')) return 'ge';
    if (categoryLower.includes('eti')) return 'eti';
    if (categoryLower.includes('pme')) return 'pme';
    if (categoryLower.includes('tpe') || categoryLower.includes('micro')) return 'tpe';
  }

  // Determine by employee count
  const employeeCount = employees || '';

  // Large enterprise (GE): 250+ employees or very high turnover
  if (employeeCount === '250+' || (annual_turnover && annual_turnover >= 50000000)) {
    return 'ge';
  }

  // ETI: 250-4999 employees or turnover 50M-1.5B (we'll estimate from 51-250 range with high turnover)
  if (employeeCount === '51-250' && annual_turnover && annual_turnover >= 10000000) {
    return 'eti';
  }

  // PME: 10-249 employees
  if (employeeCount === '51-250' || employeeCount === '11-50') {
    return 'pme';
  }

  // Micro-enterprise legal form
  if (legal_form === 'MICRO' || legal_form === 'EI') {
    return 'tpe';
  }

  // Startup: Young company (< 5 years) with small team
  const currentYear = new Date().getFullYear();
  const companyAge = year_created ? currentYear - year_created : null;

  if (companyAge !== null && companyAge <= 5 && (employeeCount === '1-10' || !employeeCount)) {
    return 'startup';
  }

  // TPE: Very small business (1-10 employees)
  if (employeeCount === '1-10') {
    return 'tpe';
  }

  // Default to PME
  return 'pme';
}

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
  usageStatus: AIUsageStatus | null;
  isUsageBlocked: boolean;
  pendingPII: PendingPIIMessage | null;
  sendMessage: (content: string, profileId: string, profile?: MaSubventionProProfile | null) => Promise<void>;
  handlePIIChoice: (choice: PIIUserChoice) => void;
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

  // PII detection state
  const [pendingPII, setPendingPII] = useState<PendingPIIMessage | null>(null);
  const pendingContextRef = useRef<{ profileId: string; profile: MaSubventionProProfile | null } | null>(null);

  // AI usage tracking
  const { checkUsage, logUsage, canUseAI, status: usageStatus } = useAIUsage();

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

  // Internal function to actually send the message (after PII check passed)
  const doSendMessage = useCallback(
    async (content: string, profileId: string, profile?: MaSubventionProProfile | null) => {
      if (!user || !content.trim()) return;

      // Determine business tier from profile
      const userTier = determineBusinessTier(profile || null);

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
            userTier, // Dynamic tier based on profile: startup, tpe, pme, eti, ge, association
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

                  // Log AI usage (estimate tokens from content)
                  const inputTokens = parsed.usage?.input_tokens || estimateTokens(content);
                  const outputTokens = parsed.usage?.output_tokens || estimateTokens(accumulatedContent);
                  logUsage({
                    function_name: 'enhanced-profile-conversation-stream',
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    profile_id: profileId,
                    success: true,
                  });
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
    [user, messages, addMessage, updateLastMessage, logUsage]
  );

  // Public sendMessage function with PII detection
  const sendMessage = useCallback(
    async (content: string, profileId: string, profile?: MaSubventionProProfile | null) => {
      if (!user || !content.trim()) return;

      // Check AI usage before proceeding
      const usageCheck = await checkUsage();
      if (!usageCheck.allowed) {
        setError(usageCheck.error || 'Limite d\'utilisation IA atteinte');
        return;
      }

      // Check for PII in the message
      const piiResult = detectPII(content.trim());
      if (piiResult.hasPII) {
        // Store context for when user makes a choice
        pendingContextRef.current = { profileId, profile: profile || null };
        setPendingPII({ message: content.trim(), matches: piiResult.matches });
        return; // Wait for user decision via handlePIIChoice
      }

      // No PII found, send directly
      await doSendMessage(content, profileId, profile);
    },
    [user, checkUsage, doSendMessage]
  );

  // Handle user's choice after PII detection
  const handlePIIChoice = useCallback(
    (choice: PIIUserChoice) => {
      if (!pendingPII || !pendingContextRef.current) {
        setPendingPII(null);
        return;
      }

      const { message, matches } = pendingPII;
      const { profileId, profile } = pendingContextRef.current;

      // Clear pending state
      setPendingPII(null);
      pendingContextRef.current = null;

      switch (choice) {
        case 'send':
          // Send original message as-is
          doSendMessage(message, profileId, profile);
          break;
        case 'mask':
          // Mask PII and send
          const maskedMessage = maskPIIWithMatches(message, matches);
          doSendMessage(maskedMessage, profileId, profile);
          break;
        case 'cancel':
          // User cancelled, do nothing
          break;
      }
    },
    [pendingPII, doSendMessage]
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
    usageStatus,
    isUsageBlocked: !canUseAI(),
    pendingPII,
    sendMessage,
    handlePIIChoice,
    clearMessages,
    loadConversation,
    loadConversationById,
    loadConversationList,
    createNewConversation,
  };
}

export default useStreamingAI;
