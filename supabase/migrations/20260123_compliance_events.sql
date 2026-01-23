-- EU AI Act Compliance Events Table
-- Implements Article 12 (Record-keeping) and Article 19 (Logs) requirements
-- Migration: 20260123_compliance_events.sql
-- NOTE: This migration is idempotent (safe to re-run)

-- Create enum types for compliance events (with IF NOT EXISTS pattern)
DO $$ BEGIN
  CREATE TYPE compliance_event_type AS ENUM (
    'subsidy_recommendation_generated',
    'subsidy_recommendation_viewed',
    'subsidy_application_started',
    'ai_chat_message',
    'profile_analysis_completed',
    'website_analysis_completed',
    'user_feedback_submitted',
    'human_review_requested',
    'data_export_requested',
    'consent_recorded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_action_type AS ENUM (
    'viewed',
    'clicked',
    'saved',
    'dismissed',
    'applied',
    'reported_incorrect',
    'requested_explanation',
    'requested_human_review',
    'no_action'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_category AS ENUM (
    'information_outdated',
    'link_broken',
    'not_relevant',
    'incorrect_eligibility',
    'helpful',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE retention_category AS ENUM (
    'standard',    -- 6 months active, then archive
    'extended',    -- 3 years (for legal compliance)
    'legal_hold'   -- Indefinite (pending investigation)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gdpr_basis AS ENUM (
    'contract',
    'consent',
    'legitimate_interest',
    'legal_obligation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE system_status AS ENUM (
    'normal',
    'degraded',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main compliance events table
CREATE TABLE IF NOT EXISTS compliance_events (
  -- Core identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event classification
  event_type compliance_event_type NOT NULL,
  function_name TEXT NOT NULL,

  -- Actor identification (with privacy consideration)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID,
  session_id TEXT,

  -- Input snapshot (JSONB for flexibility)
  input_snapshot JSONB,

  -- AI output (JSONB for flexibility)
  ai_output JSONB,

  -- Human interaction tracking
  human_interaction JSONB,

  -- Model metadata
  model_provider TEXT NOT NULL DEFAULT 'mistral',
  model_version TEXT NOT NULL DEFAULT 'mistral-small-latest',
  system_version TEXT NOT NULL DEFAULT '2.0.0',

  -- Token usage
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_tokens INTEGER DEFAULT 0,

  -- User feedback
  feedback JSONB,

  -- System status
  system_status system_status NOT NULL DEFAULT 'normal',
  error_message TEXT,

  -- Data retention metadata
  retention_category retention_category NOT NULL DEFAULT 'standard',
  gdpr_basis gdpr_basis NOT NULL DEFAULT 'contract',

  -- Archival tracking
  archived_at TIMESTAMPTZ,
  deletion_scheduled_at TIMESTAMPTZ
);

-- Add ALL potentially missing columns if table already existed (for idempotency)
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS event_id UUID UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS event_type compliance_event_type DEFAULT 'subsidy_recommendation_generated';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS function_name TEXT;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS input_snapshot JSONB;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS ai_output JSONB;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS human_interaction JSONB;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS model_provider TEXT DEFAULT 'mistral';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'mistral-small-latest';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS system_version TEXT DEFAULT '2.0.0';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS cached_tokens INTEGER DEFAULT 0;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS feedback JSONB;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS system_status system_status DEFAULT 'normal';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS retention_category retention_category DEFAULT 'standard';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS gdpr_basis gdpr_basis DEFAULT 'contract';
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE compliance_events ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

-- Set defaults for any nullable columns that were added
UPDATE compliance_events SET function_name = 'unknown' WHERE function_name IS NULL;
UPDATE compliance_events SET system_status = 'normal' WHERE system_status IS NULL;
UPDATE compliance_events SET retention_category = 'standard' WHERE retention_category IS NULL;
UPDATE compliance_events SET gdpr_basis = 'contract' WHERE gdpr_basis IS NULL;

-- Indexes for efficient querying (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_compliance_events_user_id ON compliance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_event_type ON compliance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_events_created_at ON compliance_events(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_events_profile_id ON compliance_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_function_name ON compliance_events(function_name);
CREATE INDEX IF NOT EXISTS idx_compliance_events_retention ON compliance_events(retention_category, deletion_scheduled_at);

-- Index for JSONB queries on input_snapshot
CREATE INDEX IF NOT EXISTS idx_compliance_events_input_snapshot ON compliance_events USING GIN (input_snapshot);

-- Human review requests table
CREATE TABLE IF NOT EXISTS human_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Request context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES compliance_events(event_id) ON DELETE SET NULL,
  subsidy_id TEXT,

  -- Request details
  reason TEXT NOT NULL CHECK (reason IN ('low_confidence', 'user_request', 'high_value', 'complex_criteria')),
  user_question TEXT,

  -- Resolution tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  response_time_hours DECIMAL(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_human_review_requests_user_id ON human_review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_human_review_requests_status ON human_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_human_review_requests_created_at ON human_review_requests(created_at);

-- Bias testing results table
CREATE TABLE IF NOT EXISTS bias_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  test_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_name TEXT NOT NULL,

  -- Test parameters
  synthetic_companies JSONB NOT NULL,
  subsidy_id TEXT,

  -- Results
  passed BOOLEAN NOT NULL,
  variance_score DECIMAL(10, 4) NOT NULL,
  flagged_biases JSONB,

  -- Metadata
  model_version TEXT NOT NULL,
  tester TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bias_test_results_test_date ON bias_test_results(test_date);
CREATE INDEX IF NOT EXISTS idx_bias_test_results_passed ON bias_test_results(passed);

-- Compliance metrics summary view
CREATE OR REPLACE VIEW compliance_metrics_daily AS
SELECT
  DATE(created_at) as metric_date,

  -- Usage metrics
  COUNT(*) FILTER (WHERE event_type = 'subsidy_recommendation_generated') as total_recommendations,
  COUNT(*) FILTER (WHERE event_type = 'ai_chat_message') as total_chat_messages,
  COUNT(DISTINCT user_id) as unique_users,

  -- Quality metrics (from feedback JSONB)
  COUNT(*) FILTER (WHERE feedback->>'category' = 'information_outdated') as hallucination_reports,
  COUNT(*) FILTER (WHERE feedback->>'category' = 'link_broken') as broken_link_reports,
  COUNT(*) FILTER (WHERE feedback->>'category' = 'incorrect_eligibility') as incorrect_eligibility_reports,

  -- User satisfaction
  COUNT(*) FILTER (WHERE feedback->>'feedback_type' = 'positive') as positive_feedback_count,
  COUNT(*) FILTER (WHERE feedback->>'feedback_type' = 'negative') as negative_feedback_count,

  -- System health
  COUNT(*) FILTER (WHERE system_status = 'error') as error_count,
  AVG(CASE WHEN ai_output->>'processing_time_ms' IS NOT NULL
      THEN (ai_output->>'processing_time_ms')::INTEGER END) as avg_response_time_ms

FROM compliance_events
GROUP BY DATE(created_at);

-- Row Level Security
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_test_results ENABLE ROW LEVEL SECURITY;

-- Policies (using DO blocks to avoid errors if they exist)
DO $$ BEGIN
  CREATE POLICY "Users can view own compliance events"
    ON compliance_events FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service can insert compliance events"
    ON compliance_events FOR INSERT
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own review requests"
    ON human_review_requests FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create review requests"
    ON human_review_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view bias tests"
    ON bias_test_results FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Function to schedule deletion based on retention policy
CREATE OR REPLACE FUNCTION schedule_compliance_event_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Set deletion date based on retention category
  IF NEW.retention_category = 'standard' THEN
    NEW.deletion_scheduled_at = NEW.created_at + INTERVAL '6 months';
  ELSIF NEW.retention_category = 'extended' THEN
    NEW.deletion_scheduled_at = NEW.created_at + INTERVAL '3 years';
  -- legal_hold has no scheduled deletion
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (drop and recreate to be idempotent)
DROP TRIGGER IF EXISTS set_deletion_schedule ON compliance_events;
CREATE TRIGGER set_deletion_schedule
  BEFORE INSERT ON compliance_events
  FOR EACH ROW
  EXECUTE FUNCTION schedule_compliance_event_deletion();

-- Comment for documentation
COMMENT ON TABLE compliance_events IS 'EU AI Act Article 12/19 compliant audit log for AI system events';
COMMENT ON TABLE human_review_requests IS 'EU AI Act Article 14 compliant human oversight tracking';
COMMENT ON TABLE bias_test_results IS 'EU AI Act Article 10 compliant bias testing records';
