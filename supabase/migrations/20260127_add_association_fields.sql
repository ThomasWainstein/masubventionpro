-- Migration: Add association-specific fields to masubventionpro_profiles
-- Date: 2026-01-27
-- Description: Adds fields for associations (loi 1901, cooperatives, foundations)
-- These fields enable better matching for non-profit organizations

-- Add is_association field (computed from legal_form)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS is_association boolean DEFAULT NULL;

-- Add association_type field (type of association)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS association_type text DEFAULT NULL;

-- Add association_purpose field (mission/object of the association)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS association_purpose text DEFAULT NULL;

-- Add member_count field (number of members for associations)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS member_count integer DEFAULT NULL;

-- Add volunteer_count field (number of volunteers for associations)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS volunteer_count integer DEFAULT NULL;

-- Add budget_annual field (annual budget for associations, different from turnover)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS budget_annual numeric DEFAULT NULL;

-- Add rup_date field (date of RUP recognition if applicable)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS rup_date date DEFAULT NULL;

-- Add agrement_esus field (ESUS certification)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS agrement_esus boolean DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN masubventionpro_profiles.is_association IS 'True if legal_form is ASSO, COOP, or FONDATION';
COMMENT ON COLUMN masubventionpro_profiles.association_type IS 'Type of association (loi_1901, rup, rig, culturelle, sportive, etc.)';
COMMENT ON COLUMN masubventionpro_profiles.association_purpose IS 'Mission and purpose of the association';
COMMENT ON COLUMN masubventionpro_profiles.member_count IS 'Number of members (for associations)';
COMMENT ON COLUMN masubventionpro_profiles.volunteer_count IS 'Number of volunteers (for associations)';
COMMENT ON COLUMN masubventionpro_profiles.budget_annual IS 'Annual budget in euros (for associations, separate from commercial turnover)';
COMMENT ON COLUMN masubventionpro_profiles.rup_date IS 'Date of RUP (Reconnaissance d''Utilité Publique) if applicable';
COMMENT ON COLUMN masubventionpro_profiles.agrement_esus IS 'ESUS (Entreprise Solidaire d''Utilité Sociale) certification status';

-- Create index for faster association filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_association ON masubventionpro_profiles(is_association) WHERE is_association = true;

-- Create index for association_type
CREATE INDEX IF NOT EXISTS idx_profiles_association_type ON masubventionpro_profiles(association_type) WHERE association_type IS NOT NULL;
