-- ============================================================================
-- Setup Cron Jobs for Recommendation System
--
-- This migration sets up automated jobs for:
-- 1. Cleaning up expired recommendations (daily at midnight UTC)
-- 2. Updating recommendation counts (hourly)
--
-- NOTE: For daily refresh with load distribution, set up cron jobs that call:
-- POST https://<project-ref>.supabase.co/functions/v1/cron-refresh-recommendations
-- with Authorization: Bearer <service_role_key>
-- and body: {"partition": "auto"} or {"partition": 0-6}
--
-- LOAD DISTRIBUTION:
-- The edge function supports partitioning profiles across 7 days:
-- - partition=0 (Sunday): ~14% of profiles (UUIDs starting with 0,7,e)
-- - partition=1 (Monday): ~14% of profiles (UUIDs starting with 1,8,f)
-- - partition=2 (Tuesday): ~14% of profiles (UUIDs starting with 2,9)
-- - partition=3 (Wednesday): ~14% of profiles (UUIDs starting with 3,a)
-- - partition=4 (Thursday): ~14% of profiles (UUIDs starting with 4,b)
-- - partition=5 (Friday): ~14% of profiles (UUIDs starting with 5,c)
-- - partition=6 (Saturday): ~14% of profiles (UUIDs starting with 6,d)
--
-- Use {"partition": "auto"} to automatically select based on current day
--
-- EXAMPLE GITHUB ACTIONS SCHEDULE (runs daily at 6am UTC):
-- on:
--   schedule:
--     - cron: '0 6 * * *'
-- jobs:
--   refresh:
--     runs-on: ubuntu-latest
--     steps:
--       - run: |
--           curl -X POST "$SUPABASE_URL/functions/v1/cron-refresh-recommendations" \
--             -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
--             -H "Content-Type: application/json" \
--             -d '{"partition": "auto"}'
-- ============================================================================

-- Enable pg_cron extension (should already be enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. DAILY CLEANUP JOB
-- Removes recommendations for expired subsidies (past deadline)
-- Runs every day at 00:00 UTC
-- ============================================================================

-- Remove existing job if any (safe to run multiple times)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-recommendations');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule the cleanup job
SELECT cron.schedule(
  'cleanup-expired-recommendations',
  '0 0 * * *',  -- Every day at midnight UTC
  $$SELECT cleanup_expired_recommendations()$$
);

-- ============================================================================
-- 2. UPDATE RECOMMENDATION COUNTS
-- Updates the cached recommendation_count on profiles after changes
-- Runs every hour to keep counts in sync
-- ============================================================================

-- Create the count update function
CREATE OR REPLACE FUNCTION update_profile_recommendation_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update counts for profiles that had recent recommendation changes
  UPDATE masubventionpro_profiles p
  SET recommendation_count = (
    SELECT COUNT(*)
    FROM profile_recommended_subsidies prs
    JOIN subsidies s ON s.id = prs.subsidy_id
    WHERE prs.profile_id = p.id
      AND prs.dismissed_at IS NULL
      AND (s.deadline IS NULL OR s.deadline >= CURRENT_DATE)
      AND s.is_active = true
  ),
  updated_at = NOW()
  WHERE EXISTS (
    SELECT 1
    FROM profile_recommended_subsidies prs
    WHERE prs.profile_id = p.id
      AND prs.updated_at > NOW() - INTERVAL '2 hours'
  );

  -- Also update profiles that haven't been counted yet
  UPDATE masubventionpro_profiles p
  SET recommendation_count = (
    SELECT COUNT(*)
    FROM profile_recommended_subsidies prs
    JOIN subsidies s ON s.id = prs.subsidy_id
    WHERE prs.profile_id = p.id
      AND prs.dismissed_at IS NULL
      AND (s.deadline IS NULL OR s.deadline >= CURRENT_DATE)
      AND s.is_active = true
  ),
  updated_at = NOW()
  WHERE p.recommendation_count IS NULL
    AND EXISTS (
      SELECT 1
      FROM profile_recommended_subsidies prs
      WHERE prs.profile_id = p.id
    );
END;
$$;

-- Remove existing job if any
DO $$
BEGIN
  PERFORM cron.unschedule('update-recommendation-counts');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule hourly count updates
SELECT cron.schedule(
  'update-recommendation-counts',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT update_profile_recommendation_counts()$$
);

-- ============================================================================
-- 3. MARK STALE PROFILES (FOR CLIENT-SIDE REFRESH)
-- This function marks profiles that need refresh, so the client can
-- trigger the edge function when the user accesses their dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_profiles_needing_refresh(threshold_days INTEGER DEFAULT 3)
RETURNS TABLE(profile_id UUID, company_name TEXT, last_refresh TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.company_name,
    p.last_subsidy_refresh_at
  FROM masubventionpro_profiles p
  WHERE p.last_subsidy_refresh_at IS NULL
     OR p.last_subsidy_refresh_at < NOW() - (threshold_days || ' days')::INTERVAL
  ORDER BY p.last_subsidy_refresh_at ASC NULLS FIRST;
END;
$$;

-- ============================================================================
-- VERIFICATION & DOCUMENTATION
-- ============================================================================

-- View scheduled jobs:
-- SELECT jobid, jobname, schedule, command FROM cron.job;

-- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Manual trigger for testing:
-- SELECT cleanup_expired_recommendations();
-- SELECT update_profile_recommendation_counts();
