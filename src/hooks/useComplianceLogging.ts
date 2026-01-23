import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ComplianceEvent,
  ComplianceEventInput,
  MatchInputSnapshot,
  MatchOutputResult,
  ChatInputSnapshot,
  ChatOutputResult,
  HumanInteraction,
  UserFeedback,
} from '@/types/compliance-events';
import type { AIModelProvider } from '@/types/ai-usage';

// Current system version - update with releases
const SYSTEM_VERSION = '2.0.0';

// Default model configuration - Mistral AI (GDPR-compliant French provider)
const DEFAULT_MODEL_PROVIDER = 'mistral';
const DEFAULT_MODEL_VERSION = 'mistral-small-latest';

/**
 * Generate a UUID v4
 */
function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

interface UseComplianceLoggingReturn {
  // Core logging functions
  logEvent: (input: ComplianceEventInput) => Promise<string | null>;
  logSubsidyRecommendation: (
    profileId: string,
    inputSnapshot: MatchInputSnapshot,
    output: MatchOutputResult,
    tokens: { input: number; output: number; cached?: number },
    modelVersion?: string
  ) => Promise<string | null>;
  logChatMessage: (
    input: ChatInputSnapshot,
    output: ChatOutputResult,
    tokens: { input: number; output: number; cached?: number },
    profileId?: string
  ) => Promise<string | null>;

  // User interaction tracking
  logUserAction: (
    eventId: string,
    interaction: HumanInteraction
  ) => Promise<boolean>;
  logFeedback: (
    eventId: string,
    feedback: UserFeedback
  ) => Promise<boolean>;

  // Human oversight
  requestHumanReview: (
    eventId: string,
    reason: 'low_confidence' | 'user_request' | 'high_value' | 'complex_criteria',
    subsidyId?: string,
    question?: string
  ) => Promise<string | null>;
}

/**
 * Hook for EU AI Act compliant logging
 * Implements Article 12 (Record-keeping) and Article 19 (Logs) requirements
 */
export function useComplianceLogging(): UseComplianceLoggingReturn {
  const { user } = useAuth();

  /**
   * Core event logging function
   */
  const logEvent = useCallback(async (input: ComplianceEventInput): Promise<string | null> => {
    if (!user) {
      console.warn('[Compliance] Cannot log event: User not authenticated');
      return null;
    }

    const eventId = generateEventId();

    try {
      const event: Partial<ComplianceEvent> = {
        event_id: eventId,
        timestamp: getCurrentTimestamp(),
        event_type: input.event_type,
        function_name: input.function_name,
        user_id: user.id,
        profile_id: input.profile_id,
        input_snapshot: input.input_snapshot,
        ai_output: input.ai_output,
        human_interaction: input.human_interaction ? {
          action: input.human_interaction.action || 'no_action',
          ...input.human_interaction,
        } : undefined,
        model_meta: {
          model_provider: DEFAULT_MODEL_PROVIDER as AIModelProvider,
          model_version: input.model_version || DEFAULT_MODEL_VERSION,
          system_version: SYSTEM_VERSION,
        },
        tokens: input.tokens,
        feedback: input.feedback,
        system_status: input.error_message ? 'error' : 'normal',
        error_message: input.error_message,
        retention_category: 'standard',
        gdpr_basis: 'contract',
      };

      const { error } = await supabase
        .from('compliance_events')
        .insert({
          event_id: event.event_id,
          event_type: event.event_type,
          function_name: event.function_name,
          user_id: event.user_id,
          profile_id: event.profile_id,
          input_snapshot: event.input_snapshot,
          ai_output: event.ai_output,
          human_interaction: event.human_interaction,
          model_provider: event.model_meta?.model_provider,
          model_version: event.model_meta?.model_version || DEFAULT_MODEL_VERSION,
          system_version: event.model_meta?.system_version || SYSTEM_VERSION,
          input_tokens: event.tokens?.input,
          output_tokens: event.tokens?.output,
          cached_tokens: event.tokens?.cached || 0,
          feedback: event.feedback,
          system_status: event.system_status,
          error_message: event.error_message,
          retention_category: event.retention_category,
          gdpr_basis: event.gdpr_basis,
        });

      if (error) {
        console.error('[Compliance] Error logging event:', error);
        return null;
      }

      return eventId;
    } catch (err) {
      console.error('[Compliance] Exception logging event:', err);
      return null;
    }
  }, [user]);

  /**
   * Log a subsidy recommendation event
   */
  const logSubsidyRecommendation = useCallback(async (
    profileId: string,
    inputSnapshot: MatchInputSnapshot,
    output: MatchOutputResult,
    tokens: { input: number; output: number; cached?: number },
    modelVersion?: string
  ): Promise<string | null> => {
    return logEvent({
      event_type: 'subsidy_recommendation_generated',
      function_name: 'v5-hybrid-calculate-matches',
      profile_id: profileId,
      input_snapshot: inputSnapshot,
      ai_output: output,
      tokens,
      model_version: modelVersion,
    });
  }, [logEvent]);

  /**
   * Log an AI chat message event
   */
  const logChatMessage = useCallback(async (
    input: ChatInputSnapshot,
    output: ChatOutputResult,
    tokens: { input: number; output: number; cached?: number },
    profileId?: string
  ): Promise<string | null> => {
    return logEvent({
      event_type: 'ai_chat_message',
      function_name: 'enhanced-profile-conversation-stream',
      profile_id: profileId,
      input_snapshot: input,
      ai_output: output,
      tokens,
    });
  }, [logEvent]);

  /**
   * Update an existing event with user interaction data
   */
  const logUserAction = useCallback(async (
    eventId: string,
    interaction: HumanInteraction
  ): Promise<boolean> => {
    if (!user) {
      console.warn('[Compliance] Cannot log action: User not authenticated');
      return false;
    }

    try {
      const { error } = await supabase
        .from('compliance_events')
        .update({
          human_interaction: {
            ...interaction,
            action_timestamp: getCurrentTimestamp(),
          },
        })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Compliance] Error logging user action:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Compliance] Exception logging user action:', err);
      return false;
    }
  }, [user]);

  /**
   * Add feedback to an existing event
   */
  const logFeedback = useCallback(async (
    eventId: string,
    feedback: UserFeedback
  ): Promise<boolean> => {
    if (!user) {
      console.warn('[Compliance] Cannot log feedback: User not authenticated');
      return false;
    }

    try {
      // First, log a separate feedback event
      await logEvent({
        event_type: 'user_feedback_submitted',
        function_name: 'v5-hybrid-calculate-matches', // or extract from original event
        input_snapshot: { original_event_id: eventId } as any,
        ai_output: { feedback } as any,
      });

      // Then update the original event
      const { error } = await supabase
        .from('compliance_events')
        .update({ feedback })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Compliance] Error logging feedback:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Compliance] Exception logging feedback:', err);
      return false;
    }
  }, [user, logEvent]);

  /**
   * Request human review for an AI recommendation
   * Implements Article 14 (Human Oversight)
   */
  const requestHumanReview = useCallback(async (
    eventId: string,
    reason: 'low_confidence' | 'user_request' | 'high_value' | 'complex_criteria',
    subsidyId?: string,
    question?: string
  ): Promise<string | null> => {
    if (!user) {
      console.warn('[Compliance] Cannot request review: User not authenticated');
      return null;
    }

    const requestId = generateEventId();

    try {
      const { error } = await supabase
        .from('human_review_requests')
        .insert({
          request_id: requestId,
          user_id: user.id,
          event_id: eventId,
          subsidy_id: subsidyId,
          reason,
          user_question: question,
          status: 'pending',
        });

      if (error) {
        console.error('[Compliance] Error creating review request:', error);
        return null;
      }

      // Also log a compliance event for the review request
      await logEvent({
        event_type: 'human_review_requested',
        function_name: 'v5-hybrid-calculate-matches',
        input_snapshot: {
          original_event_id: eventId,
          subsidy_id: subsidyId,
          reason,
        } as any,
      });

      return requestId;
    } catch (err) {
      console.error('[Compliance] Exception creating review request:', err);
      return null;
    }
  }, [user, logEvent]);

  return {
    logEvent,
    logSubsidyRecommendation,
    logChatMessage,
    logUserAction,
    logFeedback,
    requestHumanReview,
  };
}

export default useComplianceLogging;

/**
 * Utility function to create input snapshot from profile data
 */
export function createMatchInputSnapshot(profile: any): MatchInputSnapshot {
  return {
    company_siren: profile?.siren,
    company_name: profile?.company_name,
    sector_code: profile?.naf_code,
    region: profile?.region,
    department: profile?.department,
    employee_count: profile?.employee_count,
    turnover: profile?.turnover,
    company_age_months: profile?.company_age_months,
    project_types: profile?.project_types,
    business_tier: profile?.business_tier,
  };
}

/**
 * Utility function to create output result from recommendations
 */
export function createMatchOutputResult(
  recommendations: any[],
  processingTimeMs: number
): MatchOutputResult {
  return {
    recommended_subsidies: recommendations.map((rec) => ({
      subsidy_id: rec.id || rec.subsidy_id,
      subsidy_name: rec.name || rec.title,
      match_score: rec.score || rec.match_score || 0,
      confidence_level: getConfidenceLevel(rec.score || rec.match_score || 0),
      success_probability: rec.success_probability,
      key_factors: rec.key_factors || rec.reasons || [],
      source_url: rec.source_url || rec.link,
    })),
    total_matches: recommendations.length,
    processing_time_ms: processingTimeMs,
  };
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
