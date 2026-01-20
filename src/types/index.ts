// MaSubventionPro TypeScript Types

export interface MaSubventionProProfile {
  id: string;
  user_id: string;
  company_name: string;
  siret: string | null;
  siren: string | null;
  naf_code: string | null;
  naf_label: string | null;
  sector: string | null;
  sub_sector: string | null;
  region: string | null;
  department: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  employees: string | null;
  annual_turnover: number | null;
  year_created: number | null;
  legal_form: string | null;
  company_category: string | null;
  certifications: string[];
  project_types: string[];
  created_at: string;
  updated_at: string;
}

export interface SavedSubsidy {
  id: string;
  user_id: string;
  subsidy_id: string;
  status: 'saved' | 'interested' | 'applied' | 'received' | 'rejected';
  notes: string | null;
  created_at: string;
  updated_at: string;
  subsidy?: Subsidy;
}

export interface Subsidy {
  id: string;
  title: string | { fr?: string; en?: string };
  description: string | { fr?: string; en?: string } | null;
  agency: string | null;
  region: string[] | null;
  deadline: string | null;
  start_date: string | null;
  amount_min: number | null;
  amount_max: number | null;
  funding_type: string | null;
  categories: string[] | null;
  primary_sector: string | null;
  keywords: string[] | null;
  application_url: string | null;
  source_url: string | null;
  quality_score: number | null;
  status: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
    source?: string;
    selected_plan?: string;
  };
}

export type SubscriptionPlan = 'decouverte' | 'business' | 'premium';

export interface SubscriptionInfo {
  plan: SubscriptionPlan | null;
  searchesUsed: number;
  searchesLimit: number;
  isActive: boolean;
}

// French regions
export const FRENCH_REGIONS = [
  'Auvergne-Rhone-Alpes',
  'Bourgogne-Franche-Comte',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Guadeloupe',
  'Guyane',
  'Hauts-de-France',
  'Ile-de-France',
  'La Reunion',
  'Martinique',
  'Mayotte',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Cote d'Azur",
  'National',
] as const;

// Employee count ranges
export const EMPLOYEE_RANGES = [
  { value: '1-10', label: '1-10 salaries' },
  { value: '11-50', label: '11-50 salaries' },
  { value: '51-250', label: '51-250 salaries' },
  { value: '250+', label: 'Plus de 250 salaries' },
] as const;

// Legal forms
export const LEGAL_FORMS = [
  { value: 'SARL', label: 'SARL' },
  { value: 'SAS', label: 'SAS' },
  { value: 'SASU', label: 'SASU' },
  { value: 'EURL', label: 'EURL' },
  { value: 'SA', label: 'SA' },
  { value: 'SCI', label: 'SCI' },
  { value: 'EI', label: 'Entreprise Individuelle' },
  { value: 'MICRO', label: 'Micro-entreprise' },
  { value: 'ASSO', label: 'Association' },
  { value: 'OTHER', label: 'Autre' },
] as const;

// Funding types
export const FUNDING_TYPES = [
  { value: 'subvention', label: 'Subvention' },
  { value: 'pret', label: 'Pret' },
  { value: 'garantie', label: 'Garantie' },
  { value: 'avance', label: 'Avance remboursable' },
  { value: 'accompagnement', label: 'Accompagnement' },
  { value: 'fiscal', label: 'Avantage fiscal' },
] as const;

// Project types
export const PROJECT_TYPES = [
  { value: 'innovation', label: 'Innovation / R&D' },
  { value: 'export', label: 'Export / International' },
  { value: 'transition-eco', label: 'Transition ecologique' },
  { value: 'numerique', label: 'Transformation numerique' },
  { value: 'emploi', label: 'Emploi / Formation' },
  { value: 'creation', label: 'Creation / Reprise' },
  { value: 'investissement', label: 'Investissement' },
  { value: 'tresorerie', label: 'Tresorerie' },
] as const;

// Helper to extract French title from multilingual field
export function getSubsidyTitle(subsidy: Subsidy): string {
  if (typeof subsidy.title === 'string') {
    return subsidy.title;
  }
  return subsidy.title?.fr || subsidy.title?.en || 'Sans titre';
}

// Helper to extract French description from multilingual field
export function getSubsidyDescription(subsidy: Subsidy): string {
  if (!subsidy.description) return '';
  if (typeof subsidy.description === 'string') {
    return subsidy.description;
  }
  return subsidy.description?.fr || subsidy.description?.en || '';
}
