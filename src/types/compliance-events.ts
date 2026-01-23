// EU AI Act Compliance Event Types for MaSubventionPro
// Implements Article 12 (Record-keeping) and Article 19 (Logs) requirements

import type { AIFunctionName, AIModelProvider } from './ai-usage';

/**
 * Compliance event types for audit logging
 */
export type ComplianceEventType =
  | 'subsidy_recommendation_generated'
  | 'subsidy_recommendation_viewed'
  | 'subsidy_application_started'
  | 'ai_chat_message'
  | 'profile_analysis_completed'
  | 'website_analysis_completed'
  | 'user_feedback_submitted'
  | 'human_review_requested'
  | 'data_export_requested'
  | 'consent_recorded';

/**
 * User action taken after AI output
 */
export type UserAction =
  | 'viewed'
  | 'clicked'
  | 'saved'
  | 'dismissed'
  | 'applied'
  | 'reported_incorrect'
  | 'requested_explanation'
  | 'requested_human_review'
  | 'no_action';

/**
 * Feedback categories for AI recommendations
 */
export type FeedbackCategory =
  | 'information_outdated'
  | 'link_broken'
  | 'not_relevant'
  | 'incorrect_eligibility'
  | 'helpful'
  | 'other';

/**
 * Input snapshot for subsidy matching
 * Captures the business profile at time of recommendation
 */
export interface MatchInputSnapshot {
  company_siren?: string;
  company_name?: string;
  sector_code?: string;        // NAF code
  region?: string;
  department?: string;
  employee_count?: number;
  turnover?: number;
  company_age_months?: number;
  project_types?: string[];
  business_tier?: 'startup' | 'tpe' | 'pme' | 'eti' | 'ge' | 'association';
}

/**
 * AI output for subsidy recommendations
 */
export interface MatchOutputResult {
  recommended_subsidies: RecommendedSubsidy[];
  total_matches: number;
  processing_time_ms: number;
}

/**
 * Individual subsidy recommendation
 */
export interface RecommendedSubsidy {
  subsidy_id: string;
  subsidy_name: string;
  match_score: number;           // 0-100
  confidence_level: 'high' | 'medium' | 'low';
  success_probability?: number;  // 0-100
  key_factors: string[];         // ["sector_match", "region_match", "turnover_eligible"]
  source_url?: string;           // Official government source
}

/**
 * AI chat message context
 */
export interface ChatInputSnapshot {
  user_message: string;
  conversation_id?: string;
  message_index?: number;
  profile_context_included: boolean;
}

/**
 * AI chat response
 */
export interface ChatOutputResult {
  assistant_message: string;
  sources_cited: string[];
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Human interaction tracking
 */
export interface HumanInteraction {
  viewed_at?: string;           // ISO timestamp
  action: UserAction;
  action_timestamp?: string;    // ISO timestamp
  override?: boolean;           // User overrode AI suggestion
  override_reason?: string;
  time_to_action_ms?: number;   // Time from view to action
}

/**
 * Model metadata for traceability
 */
export interface ModelMetadata {
  model_provider: AIModelProvider;
  model_version: string;        // e.g., "deepseek-chat-v3"
  model_temperature?: number;
  knowledge_cutoff?: string;    // ISO date
  system_version: string;       // MaSubventionPro version
}

/**
 * User feedback on AI output
 */
export interface UserFeedback {
  feedback_type: 'positive' | 'negative';
  category?: FeedbackCategory;
  free_text?: string;
  subsidy_id?: string;
}

/**
 * Complete compliance event log entry
 * Implements the JSON schema from Article 12/19 requirements
 */
export interface ComplianceEvent {
  // Core identifiers
  event_id: string;              // UUID
  timestamp: string;             // ISO 8601
  event_type: ComplianceEventType;

  // Actor identification
  user_id: string;               // Hashed for privacy if needed
  profile_id?: string;
  session_id?: string;

  // AI function context
  function_name: AIFunctionName;

  // Input/Output snapshots (type varies by event_type)
  input_snapshot?: MatchInputSnapshot | ChatInputSnapshot;
  ai_output?: MatchOutputResult | ChatOutputResult;

  // Human interaction tracking
  human_interaction?: HumanInteraction;

  // Model traceability
  model_meta: ModelMetadata;

  // Token usage (for cost tracking)
  tokens?: {
    input: number;
    output: number;
    cached?: number;
  };

  // User feedback (if applicable)
  feedback?: UserFeedback;

  // System status
  system_status: 'normal' | 'degraded' | 'error';
  error_message?: string;

  // Data retention metadata
  retention_category: 'standard' | 'extended' | 'legal_hold';
  gdpr_basis: 'contract' | 'consent' | 'legitimate_interest' | 'legal_obligation';
}

/**
 * Compliance event input for creating new records
 * Simplified version for use in application code
 */
export interface ComplianceEventInput {
  event_type: ComplianceEventType;
  function_name: AIFunctionName;
  profile_id?: string;
  input_snapshot?: MatchInputSnapshot | ChatInputSnapshot;
  ai_output?: MatchOutputResult | ChatOutputResult;
  human_interaction?: Partial<HumanInteraction>;
  model_version?: string;
  tokens?: {
    input: number;
    output: number;
    cached?: number;
  };
  feedback?: UserFeedback;
  error_message?: string;
}

/**
 * Bias testing record
 * For Article 10 (Data Governance) compliance
 */
export interface BiasTestResult {
  test_id: string;
  test_date: string;
  test_name: string;

  // Test parameters
  synthetic_companies: SyntheticCompany[];
  subsidy_id: string;

  // Results
  passed: boolean;
  variance_score: number;        // 0 = identical results, higher = more variance
  flagged_biases: BiasFlag[];

  // Metadata
  model_version: string;
  tester: string;
}

/**
 * Synthetic company for bias testing
 */
export interface SyntheticCompany {
  company_id: string;
  region: string;
  sector_code: string;
  employee_count: number;
  turnover: number;

  // Results for this company
  recommended: boolean;
  match_score: number;
}

/**
 * Bias flag from testing
 */
export interface BiasFlag {
  bias_type: 'regional' | 'sector' | 'size' | 'name' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  affected_groups: string[];
}

/**
 * Compliance metrics summary
 * For Article 72 (Post-market monitoring)
 */
export interface ComplianceMetrics {
  period_start: string;
  period_end: string;

  // Usage metrics
  total_recommendations: number;
  total_chat_messages: number;
  unique_users: number;

  // Quality metrics
  hallucination_reports: number;
  broken_link_reports: number;
  incorrect_eligibility_reports: number;

  // User satisfaction
  positive_feedback_count: number;
  negative_feedback_count: number;
  feedback_rate: number;         // % of recommendations with feedback

  // System health
  average_response_time_ms: number;
  error_rate: number;

  // Bias monitoring
  regional_variance_score: number;
  sector_variance_score: number;
}

/**
 * Human review request
 * For Article 14 (Human Oversight) compliance
 */
export interface HumanReviewRequest {
  request_id: string;
  timestamp: string;
  user_id: string;

  // What needs review
  event_id: string;              // Reference to original compliance event
  subsidy_id?: string;

  // Request details
  reason: 'low_confidence' | 'user_request' | 'high_value' | 'complex_criteria';
  user_question?: string;

  // Resolution
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  assigned_to?: string;
  resolution_notes?: string;
  resolved_at?: string;
  response_time_hours?: number;
}
