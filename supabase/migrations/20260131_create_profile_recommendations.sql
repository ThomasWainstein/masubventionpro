-- ============================================
-- Profile Recommended Subsidies System
-- Persistent, pre-computed subsidy matching
-- ============================================

-- 1. Create the recommendations table
CREATE TABLE IF NOT EXISTS profile_recommended_subsidies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES masubventionpro_profiles(id) ON DELETE CASCADE,
  subsidy_id UUID NOT NULL REFERENCES subsidies(id) ON DELETE CASCADE,

  -- Matching scores
  match_score INTEGER DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  match_reasons JSONB DEFAULT '[]'::jsonb,

  -- Tracking
  first_matched_at TIMESTAMPTZ DEFAULT now(),  -- For "new this week" badge
  dismissed_at TIMESTAMPTZ,                     -- Soft-delete if user dismisses

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicates
  UNIQUE(profile_id, subsidy_id)
);

-- 2. Add tracking column to profiles
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS last_subsidy_refresh_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS recommendation_count INTEGER DEFAULT 0;

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profile_recs_profile_active
ON profile_recommended_subsidies(profile_id)
WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_recs_new_subsidies
ON profile_recommended_subsidies(profile_id, first_matched_at DESC)
WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_recs_score
ON profile_recommended_subsidies(profile_id, match_score DESC)
WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_recs_subsidy
ON profile_recommended_subsidies(subsidy_id);

-- 4. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_profile_recs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profile_recs_updated_at
BEFORE UPDATE ON profile_recommended_subsidies
FOR EACH ROW
EXECUTE FUNCTION update_profile_recs_updated_at();

-- 5. Function to update profile recommendation count
CREATE OR REPLACE FUNCTION update_profile_recommendation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE masubventionpro_profiles
    SET recommendation_count = (
      SELECT COUNT(*) FROM profile_recommended_subsidies
      WHERE profile_id = NEW.profile_id AND dismissed_at IS NULL
    )
    WHERE id = NEW.profile_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE masubventionpro_profiles
    SET recommendation_count = (
      SELECT COUNT(*) FROM profile_recommended_subsidies
      WHERE profile_id = OLD.profile_id AND dismissed_at IS NULL
    )
    WHERE id = OLD.profile_id;
  ELSIF TG_OP = 'UPDATE' AND (OLD.dismissed_at IS DISTINCT FROM NEW.dismissed_at) THEN
    UPDATE masubventionpro_profiles
    SET recommendation_count = (
      SELECT COUNT(*) FROM profile_recommended_subsidies
      WHERE profile_id = NEW.profile_id AND dismissed_at IS NULL
    )
    WHERE id = NEW.profile_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rec_count
AFTER INSERT OR UPDATE OR DELETE ON profile_recommended_subsidies
FOR EACH ROW
EXECUTE FUNCTION update_profile_recommendation_count();

-- 6. Enable RLS
ALTER TABLE profile_recommended_subsidies ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Users can view their own recommendations (via profile ownership)
CREATE POLICY "Users can view own recommendations"
ON profile_recommended_subsidies
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM masubventionpro_profiles
    WHERE user_id = auth.uid()
  )
);

-- Users can dismiss their own recommendations
CREATE POLICY "Users can dismiss own recommendations"
ON profile_recommended_subsidies
FOR UPDATE
USING (
  profile_id IN (
    SELECT id FROM masubventionpro_profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  profile_id IN (
    SELECT id FROM masubventionpro_profiles
    WHERE user_id = auth.uid()
  )
);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access"
ON profile_recommended_subsidies
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- 8. Function to clean up expired subsidies (for cron)
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM profile_recommended_subsidies prs
    USING subsidies s
    WHERE prs.subsidy_id = s.id
      AND s.deadline IS NOT NULL
      AND s.deadline < CURRENT_DATE
    RETURNING prs.id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_recommendations() TO service_role;

COMMENT ON TABLE profile_recommended_subsidies IS 'Cached subsidy recommendations per company profile. Auto-populated on profile creation, refreshed 2x/week, auto-cleaned daily.';
COMMENT ON COLUMN profile_recommended_subsidies.match_score IS 'Base matching score 0-100 based on region, sector, size';
COMMENT ON COLUMN profile_recommended_subsidies.ai_score IS 'Optional AI-enhanced score, populated asynchronously';
COMMENT ON COLUMN profile_recommended_subsidies.first_matched_at IS 'When this subsidy was first matched - used for "new this week" badges';
COMMENT ON COLUMN profile_recommended_subsidies.dismissed_at IS 'If set, user dismissed this recommendation - won''t reappear';
