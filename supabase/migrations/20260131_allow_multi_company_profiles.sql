-- Migration: Allow multiple company profiles per user
-- This enables the Premium Groupe multi-company feature

-- Drop the unique constraint on user_id that prevents multiple companies
ALTER TABLE masubventionpro_profiles
DROP CONSTRAINT IF EXISTS masubventionpro_profiles_user_id_key;

-- Add a compound unique constraint to prevent duplicate SIRETs per user
-- (a user can't add the same company twice)
ALTER TABLE masubventionpro_profiles
ADD CONSTRAINT masubventionpro_profiles_user_siret_unique
UNIQUE (user_id, siret);

-- Add index for faster lookups by user_id (since it's no longer unique, we need an index)
CREATE INDEX IF NOT EXISTS idx_masubventionpro_profiles_user_id
ON masubventionpro_profiles(user_id);

-- Comment explaining the change
COMMENT ON TABLE masubventionpro_profiles IS
'Company profiles for MaSubventionPro users. Users with Premium Groupe can have multiple profiles.';
