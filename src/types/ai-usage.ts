// AI Usage Tracking Types for MaSubventionPro

/**
 * AI function identifiers
 */
export type AIFunctionName =
  | 'enhanced-profile-conversation-stream'
  | 'v5-hybrid-calculate-matches'
  | 'analyze-company-website';

/**
 * Supported AI model providers
 */
export type AIModelProvider = 'deepseek' | 'mistral';

/**
 * Individual usage log entry
 */
export interface AIUsageLog {
  id: string;
  user_id: string;
  function_name: AIFunctionName;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_cents: number;
  model_provider: AIModelProvider;
  profile_id?: string;
  success: boolean;
  created_at: string;
}

/**
 * Usage limits configuration (in EUR)
 */
export interface AIUsageLimits {
  daily: number;   // 0.50 EUR
  weekly: number;  // 2.00 EUR
  yearly: number;  // 10.00 EUR
}

/**
 * Current usage summary from database view
 */
export interface AIUsageSummary {
  user_id: string;
  daily_cost_eur: number;
  weekly_cost_eur: number;
  yearly_cost_eur: number;
  daily_requests: number;
  weekly_requests: number;
  total_requests: number;
}

/**
 * Usage status with cap information
 */
export interface AIUsageStatus {
  summary: AIUsageSummary | null;
  limits: AIUsageLimits;
  isBlocked: boolean;
  blockedReason?: 'daily' | 'weekly' | 'yearly';
  remainingDaily: number;
  remainingWeekly: number;
  remainingYearly: number;
  percentages: {
    daily: number;
    weekly: number;
    yearly: number;
  };
}

/**
 * Token usage from AI response
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

/**
 * Pricing configuration (cost per million tokens in USD)
 */
export interface AIPricing {
  input: number;        // $0.14 per 1M tokens
  output: number;       // $0.28 per 1M tokens
  cachedOutput: number; // $0.014 per 1M tokens
}

/**
 * Log entry for creating new usage record
 */
export interface AIUsageLogInput {
  function_name: AIFunctionName;
  input_tokens: number;
  output_tokens: number;
  cached_tokens?: number;
  model_provider?: AIModelProvider;
  profile_id?: string;
  success?: boolean;
}

/**
 * Result from checking if AI can be used
 */
export interface AIUsageCheckResult {
  allowed: boolean;
  status: AIUsageStatus;
  error?: string;
}
