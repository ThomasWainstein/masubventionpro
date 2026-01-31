-- Migration: Add profile_id to saved_subsidies for multi-company support
-- This allows users to save subsidies per company profile

-- Add profile_id column (nullable initially for existing data)
ALTER TABLE masubventionpro_saved_subsidies
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES masubventionpro_profiles(id) ON DELETE CASCADE;

-- Create index for faster lookups by profile
CREATE INDEX IF NOT EXISTS idx_masubventionpro_saved_subsidies_profile_id
ON masubventionpro_saved_subsidies(profile_id);

-- Update existing records to use the user's first profile
-- This is a data migration for existing saved subsidies
UPDATE masubventionpro_saved_subsidies ss
SET profile_id = (
  SELECT p.id FROM masubventionpro_profiles p
  WHERE p.user_id = ss.user_id
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE ss.profile_id IS NULL;

-- Add compound unique constraint to prevent duplicate saves per profile
-- (same subsidy can be saved for different profiles)
ALTER TABLE masubventionpro_saved_subsidies
DROP CONSTRAINT IF EXISTS masubventionpro_saved_subsidies_user_subsidy_unique;

ALTER TABLE masubventionpro_saved_subsidies
ADD CONSTRAINT masubventionpro_saved_subsidies_profile_subsidy_unique
UNIQUE (profile_id, subsidy_id);

-- Comment explaining the change
COMMENT ON COLUMN masubventionpro_saved_subsidies.profile_id IS
'Company profile this saved subsidy belongs to. Enables multi-company subsidy tracking.';
