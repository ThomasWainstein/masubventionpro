-- Migration: Add RNA number field to masubventionpro_profiles
-- Date: 2026-01-27
-- Description: Adds RNA (Répertoire National des Associations) number field for associations
-- RNA numbers are in the format W + 9 digits (e.g., W123456789)

-- Add rna_number field
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS rna_number text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN masubventionpro_profiles.rna_number IS 'RNA number (Répertoire National des Associations) in format W + 9 digits';

-- Create index for faster lookups by RNA number
CREATE INDEX IF NOT EXISTS idx_profiles_rna_number ON masubventionpro_profiles(rna_number) WHERE rna_number IS NOT NULL;

-- Add constraint to validate RNA format (W followed by 9 digits)
ALTER TABLE masubventionpro_profiles
ADD CONSTRAINT chk_rna_number_format
CHECK (rna_number IS NULL OR rna_number ~ '^W[0-9]{9}$');
