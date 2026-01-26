-- Migration: Add enhanced company fields to masubventionpro_profiles
-- Date: 2026-01-26
-- Description: Adds convention_collective, dirigeants, nombre_etablissements, nombre_etablissements_ouverts
-- These fields are populated from the recherche-entreprises.api.gouv.fr API

-- Add convention_collective field (IDCC codes as array)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS convention_collective text[] DEFAULT NULL;

-- Add dirigeants field (JSON array of company directors)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS dirigeants jsonb DEFAULT NULL;

-- Add nombre_etablissements field (total number of establishments)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS nombre_etablissements integer DEFAULT NULL;

-- Add nombre_etablissements_ouverts field (number of active establishments)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS nombre_etablissements_ouverts integer DEFAULT NULL;

-- Add capital_social field (from INPI/RNE data)
ALTER TABLE masubventionpro_profiles
ADD COLUMN IF NOT EXISTS capital_social integer DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN masubventionpro_profiles.convention_collective IS 'IDCC codes from convention collective (e.g., ["7024"])';
COMMENT ON COLUMN masubventionpro_profiles.dirigeants IS 'JSON array of company directors with nom, prenoms, qualite, type fields';
COMMENT ON COLUMN masubventionpro_profiles.nombre_etablissements IS 'Total number of establishments for this company';
COMMENT ON COLUMN masubventionpro_profiles.nombre_etablissements_ouverts IS 'Number of active/open establishments';
COMMENT ON COLUMN masubventionpro_profiles.capital_social IS 'Company capital social in euros (from INPI/RNE)';
