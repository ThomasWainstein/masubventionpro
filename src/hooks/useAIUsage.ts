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

// Plan-based usage limits in EUR (total for subscription period)
const PLAN_LIMITS: Record<string, AIUsageLimits> = {
  decouverte: { total: 1.00 },   // Starter: €1
  business: { total: 10.00 },   // Business: €10
  premium: { total: 20.00 },    // Premium: €20
};

/**
 * Get usage limits based on user's subscription plan
 */
function getLimitsForPlan(plan: string | undefined): AIUsageLimits {
  return PLAN_LIMITS[plan || 'decouverte'] || PLAN_LIMITS.decouverte;
}

// Mistral AI pricing (USD per 1M tokens)
// Using Mistral Small for cost-effective, GDPR-compliant AI
const MISTRAL_PRICING: AIPricing = {
  input: 0.10,
  output: 0.30,
  cachedOutput: 0.03, // Mistral doesn't have caching discount like DeepSeek
};

// Legacy DeepSeek pricing (kept for reference)
// const DEEPSEEK_PRICING: AIPricing = {
//   input: 0.14,
//   output: 0.28,
//   cachedOutput: 0.014,
// };

// Active pricing configuration
const ACTIVE_PRICING = MISTRAL_PRICING;

// USD to EUR conversion rate
const USD_TO_EUR = 0.92;

/**
 * Calculate cost in EUR cents from token usage
 */
export function calculateCost(
  tokens: TokenUsage,
  pricing: AIPricing = ACTIVE_PRICING
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

    // Return default values - ai_usage_summary view not yet implemented
    // TODO: Create ai_usage_summary view in database for proper usage tracking
    return {
      user_id: user.id,
      daily_cost_eur: 0,
      weekly_cost_eur: 0,
      yearly_cost_eur: 0,
      daily_requests: 0,
      weekly_requests: 0,
      total_requests: 0,
    };
  }, [user]);

  // Calculate status from summary
  const calculateStatus = useCallback((summary: AIUsageSummary | null): AIUsageStatus => {
    const userPlan = user?.user_metadata?.selected_plan as string | undefined;
    const limits = getLimitsForPlan(userPlan);

    if (!summary) {
      return {
        summary: null,
        limits,
        isBlocked: false,
        remaining: limits.total,
        percentage: 0,
      };
    }

    // Use yearly_cost_eur as the total usage tracker
    const totalUsed = summary.yearly_cost_eur;
    const remaining = Math.max(0, limits.total - totalUsed);
    const isBlocked = totalUsed >= limits.total;

    return {
      summary,
      limits,
      isBlocked,
      remaining,
      percentage: Math.min(100, (totalUsed / limits.total) * 100),
    };
  }, [user]);

  // Refresh usage data
  const refresh = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const summary = await fetchUsageSummary();
      setStatus(calculateStatus(summary));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données d\'utilisation');
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
      errorMessage = 'Limite d\'utilisation IA atteinte. Passez a un forfait superieur pour continuer.';
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
          model_provider: input.model_provider || 'mistral',
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
