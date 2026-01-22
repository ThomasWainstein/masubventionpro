import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  AIUsageStatus,
  AIUsageSummary,
  AIUsageLimits,
  AIUsageLogInput,
  AIUsageCheckResult,
  TokenUsage,
  AIPricing,
} from '@/types/ai-usage';

// Default usage limits in EUR
const DEFAULT_LIMITS: AIUsageLimits = {
  daily: 0.50,
  weekly: 2.00,
  yearly: 10.00,
};

// DeepSeek pricing (USD per 1M tokens)
const DEEPSEEK_PRICING: AIPricing = {
  input: 0.14,
  output: 0.28,
  cachedOutput: 0.014,
};

// USD to EUR conversion rate
const USD_TO_EUR = 0.92;

/**
 * Calculate cost in EUR cents from token usage
 */
export function calculateCost(
  tokens: TokenUsage,
  pricing: AIPricing = DEEPSEEK_PRICING
): number {
  const inputCostUSD = (tokens.inputTokens / 1_000_000) * pricing.input;
  const outputCostUSD = (tokens.outputTokens / 1_000_000) * pricing.output;
  const cachedCostUSD = ((tokens.cachedTokens || 0) / 1_000_000) * pricing.cachedOutput;

  const totalUSD = inputCostUSD + outputCostUSD + cachedCostUSD;
  const totalEUR = totalUSD * USD_TO_EUR;

  // Return in cents with 4 decimal precision
  return Math.round(totalEUR * 100 * 10000) / 10000;
}

/**
 * Estimate token count from text (rough approximation)
 * ~4 characters per token for English/French text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

interface UseAIUsageReturn {
  status: AIUsageStatus | null;
  loading: boolean;
  error: string | null;
  checkUsage: () => Promise<AIUsageCheckResult>;
  logUsage: (input: AIUsageLogInput) => Promise<boolean>;
  refresh: () => Promise<void>;
  canUseAI: () => boolean;
  estimateCost: (estimatedTokens: TokenUsage) => number;
}

export function useAIUsage(): UseAIUsageReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<AIUsageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current usage summary
  const fetchUsageSummary = useCallback(async (): Promise<AIUsageSummary | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('ai_usage_summary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found (new user)
        throw fetchError;
      }

      // Return default values for new users
      if (!data) {
        return {
          user_id: user.id,
          daily_cost_eur: 0,
          weekly_cost_eur: 0,
          yearly_cost_eur: 0,
          daily_requests: 0,
          weekly_requests: 0,
          total_requests: 0,
        };
      }

      return data;
    } catch (err) {
      console.error('[useAIUsage] Error fetching summary:', err);
      return null;
    }
  }, [user]);

  // Calculate status from summary
  const calculateStatus = useCallback((summary: AIUsageSummary | null): AIUsageStatus => {
    const limits = DEFAULT_LIMITS;

    if (!summary) {
      return {
        summary: null,
        limits,
        isBlocked: false,
        remainingDaily: limits.daily,
        remainingWeekly: limits.weekly,
        remainingYearly: limits.yearly,
        percentages: { daily: 0, weekly: 0, yearly: 0 },
      };
    }

    const remainingDaily = Math.max(0, limits.daily - summary.daily_cost_eur);
    const remainingWeekly = Math.max(0, limits.weekly - summary.weekly_cost_eur);
    const remainingYearly = Math.max(0, limits.yearly - summary.yearly_cost_eur);

    // Check which cap is hit (priority: daily > weekly > yearly)
    let isBlocked = false;
    let blockedReason: 'daily' | 'weekly' | 'yearly' | undefined;

    if (summary.daily_cost_eur >= limits.daily) {
      isBlocked = true;
      blockedReason = 'daily';
    } else if (summary.weekly_cost_eur >= limits.weekly) {
      isBlocked = true;
      blockedReason = 'weekly';
    } else if (summary.yearly_cost_eur >= limits.yearly) {
      isBlocked = true;
      blockedReason = 'yearly';
    }

    return {
      summary,
      limits,
      isBlocked,
      blockedReason,
      remainingDaily,
      remainingWeekly,
      remainingYearly,
      percentages: {
        daily: Math.min(100, (summary.daily_cost_eur / limits.daily) * 100),
        weekly: Math.min(100, (summary.weekly_cost_eur / limits.weekly) * 100),
        yearly: Math.min(100, (summary.yearly_cost_eur / limits.yearly) * 100),
      },
    };
  }, []);

  // Refresh usage data
  const refresh = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const summary = await fetchUsageSummary();
      setStatus(calculateStatus(summary));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des donnees d\'utilisation');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUsageSummary, calculateStatus]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Check if AI can be used
  const checkUsage = useCallback(async (): Promise<AIUsageCheckResult> => {
    if (!user) {
      return {
        allowed: false,
        status: calculateStatus(null),
        error: 'Non authentifie',
      };
    }

    const summary = await fetchUsageSummary();
    const currentStatus = calculateStatus(summary);
    setStatus(currentStatus);

    let errorMessage: string | undefined;
    if (currentStatus.isBlocked) {
      const limitType = currentStatus.blockedReason === 'daily' ? 'quotidienne' :
        currentStatus.blockedReason === 'weekly' ? 'hebdomadaire' : 'annuelle';
      const retryTime = currentStatus.blockedReason === 'daily' ? 'Reessayez demain.' :
        currentStatus.blockedReason === 'weekly' ? 'Reessayez lundi prochain.' : 'Contactez le support.';
      errorMessage = `Limite ${limitType} atteinte. ${retryTime}`;
    }

    return {
      allowed: !currentStatus.isBlocked,
      status: currentStatus,
      error: errorMessage,
    };
  }, [user, fetchUsageSummary, calculateStatus]);

  // Log usage after AI call
  const logUsage = useCallback(async (input: AIUsageLogInput): Promise<boolean> => {
    if (!user) return false;

    try {
      const costCents = calculateCost({
        inputTokens: input.input_tokens,
        outputTokens: input.output_tokens,
        cachedTokens: input.cached_tokens || 0,
      });

      const { error: insertError } = await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          function_name: input.function_name,
          input_tokens: input.input_tokens,
          output_tokens: input.output_tokens,
          cached_tokens: input.cached_tokens || 0,
          cost_cents: costCents,
          model_provider: input.model_provider || 'deepseek',
          profile_id: input.profile_id,
          success: input.success ?? true,
        });

      if (insertError) {
        console.error('[useAIUsage] Error logging usage:', insertError);
        return false;
      }

      // Refresh status after logging
      await refresh();
      return true;
    } catch (err) {
      console.error('[useAIUsage] Error logging usage:', err);
      return false;
    }
  }, [user, refresh]);

  // Quick check without async (uses cached status)
  const canUseAI = useCallback((): boolean => {
    return !status?.isBlocked;
  }, [status]);

  // Estimate cost for planning purposes
  const estimateCost = useCallback((estimatedTokens: TokenUsage): number => {
    return calculateCost(estimatedTokens) / 100; // Return in EUR
  }, []);

  return {
    status,
    loading,
    error,
    checkUsage,
    logUsage,
    refresh,
    canUseAI,
    estimateCost,
  };
}

export default useAIUsage;
