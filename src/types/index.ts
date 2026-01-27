// MaSubventionPro TypeScript Types

export interface WebsiteIntelligenceData {
  companyDescription?: string;
  businessActivities?: string[];
  innovations?: {
    indicators: string[];
    technologies: string[];
    score: number;
  };
  sustainability?: {
    initiatives: string[];
    certifications: string[];
    score: number;
  };
  export?: {
    markets: string[];
    multilingualSite: boolean;
    score: number;
  };
  digital?: {
    technologies: string[];
    ecommerce: boolean;
    score: number;
  };
  growth?: {
    signals: string[];
    recentInvestment: boolean;
    score: number;
  };
  analysis?: {
    confidence: number;
    analysisDate: string;
    modelUsed?: string;
  };
}

export interface ProfileDirigeant {
  nom: string;
  prenoms: string;
  qualite: string;
  type: 'personne physique' | 'personne morale';
}

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
  website_url: string | null;
  website_intelligence: WebsiteIntelligenceData | null;
  logo_url: string | null;
  description: string | null;
  certifications: string[];
  project_types: string[];
  // New fields from enhanced company search
  convention_collective: string[] | null;  // IDCC codes
  dirigeants: ProfileDirigeant[] | null;   // Company directors/managers
  nombre_etablissements: number | null;    // Total number of establishments
  nombre_etablissements_ouverts: number | null;  // Number of active establishments
  capital_social: number | null;           // Capital social in euros (from INPI/RNE)
  // Association-specific fields
  is_association: boolean | null;          // True if legal_form is ASSO, COOP, or FONDATION
  association_type: string | null;         // Type of association (loi_1901, rup, etc.)
  association_purpose: string | null;      // Mission/purpose of the association
  member_count: number | null;             // Number of members (for associations)
  volunteer_count: number | null;          // Number of volunteers (for associations)
  budget_annual: number | null;            // Annual budget (used instead of turnover for associations)
  rup_date: string | null;                 // Date of RUP recognition (if applicable)
  agrement_esus: boolean | null;           // ESUS (Entreprise Solidaire d'Utilité Sociale) certification
  rna_number: string | null;               // RNA number (W + 9 digits) for associations
  created_at: string;
  updated_at: string;
}

export interface ProfileDocument {
  id: string;
  user_id: string;
  profile_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: 'identity' | 'financial' | 'legal' | 'business' | 'other';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data: Record<string, any> | null;
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
  // Link validation fields
  link_status?: 'unknown' | 'valid' | 'invalid' | 'reported' | null;
  link_last_checked?: string | null;
  link_error?: string | null;
  link_report_count?: number | null;
  // Logo from funding agency
  logo_url?: string | null;
  // Eligibility & beneficiary fields
  aid_conditions?: string | null;
  aid_benef?: string | null;
  decoded_profils?: Array<{ code: string; label: string }> | null;
  effectif?: string | null;
  age_entreprise?: string | null;
  jeunes?: boolean | null;
  femmes?: boolean | null;
  seniors?: boolean | null;
  handicapes?: boolean | null;
  // Budget & funding details
  aid_montant?: string | null;
  decoded_natures?: Array<{ code: string; label: string }> | null;
  // Additional details
  aid_objet?: string | null;
  aid_operations_el?: string | null;
  aid_validation?: string | null;
  duree_projet?: string | null;
  decoded_projets?: Array<{ code: string; label: string }> | null;
  decoded_financeurs?: Array<{ code: string; label: string }> | null;
  contacts?: Array<{ nom?: string; email?: string; telephone?: string }> | null;
  complements_sources?: string | null;
  complements_formulaires?: string | null;
  // Entity type eligibility (computed from aid_benef, decoded_profils)
  eligible_entity_types?: string[] | null;  // ['entreprise', 'association', 'collectivite', etc.]
  association_eligible?: boolean | null;    // Explicitly eligible for associations
  company_only?: boolean | null;            // Only for companies (excludes associations)
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
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Guadeloupe',
  'Guyane',
  'Hauts-de-France',
  'Île-de-France',
  'La Réunion',
  'Martinique',
  'Mayotte',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
  'National',
] as const;

// Employee count ranges
export const EMPLOYEE_RANGES = [
  { value: '1-10', label: '1-10 salariés' },
  { value: '11-50', label: '11-50 salariés' },
  { value: '51-250', label: '51-250 salariés' },
  { value: '250+', label: 'Plus de 250 salariés' },
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
  { value: 'COOP', label: 'Coopérative' },
  { value: 'FONDATION', label: 'Fondation' },
  { value: 'OTHER', label: 'Autre' },
] as const;

// Entity types for eligibility matching
export const ENTITY_TYPES = [
  { value: 'entreprise', label: 'Entreprise', keywords: ['entreprise', 'société', 'pme', 'tpe', 'eti', 'startup'] },
  { value: 'association', label: 'Association', keywords: ['association', 'asso', 'organisme à but non lucratif', 'loi 1901'] },
  { value: 'collectivite', label: 'Collectivité', keywords: ['collectivité', 'commune', 'mairie', 'département', 'région', 'epci'] },
  { value: 'etablissement_public', label: 'Établissement public', keywords: ['établissement public', 'epic', 'epa'] },
  { value: 'particulier', label: 'Particulier', keywords: ['particulier', 'individuel', 'personne physique'] },
] as const;

// Association types (for associations only)
export const ASSOCIATION_TYPES = [
  { value: 'loi_1901', label: 'Association loi 1901' },
  { value: 'rup', label: 'Association reconnue d\'utilité publique' },
  { value: 'rig', label: 'Association d\'intérêt général' },
  { value: 'culturelle', label: 'Association culturelle' },
  { value: 'sportive', label: 'Association sportive' },
  { value: 'educative', label: 'Association éducative' },
  { value: 'sociale', label: 'Association sociale / humanitaire' },
  { value: 'environnementale', label: 'Association environnementale' },
  { value: 'professionnelle', label: 'Association professionnelle' },
  { value: 'other', label: 'Autre type d\'association' },
] as const;

// Funding types
export const FUNDING_TYPES = [
  { value: 'subvention', label: 'Subvention' },
  { value: 'pret', label: 'Prêt' },
  { value: 'garantie', label: 'Garantie' },
  { value: 'avance', label: 'Avance remboursable' },
  { value: 'accompagnement', label: 'Accompagnement' },
  { value: 'fiscal', label: 'Avantage fiscal' },
] as const;

// Project types
export const PROJECT_TYPES = [
  { value: 'innovation', label: 'Innovation / R&D' },
  { value: 'export', label: 'Export / International' },
  { value: 'transition-eco', label: 'Transition écologique' },
  { value: 'numerique', label: 'Transformation numérique' },
  { value: 'emploi', label: 'Emploi / Formation' },
  { value: 'creation', label: 'Création / Reprise' },
  { value: 'investissement', label: 'Investissement' },
  { value: 'tresorerie', label: 'Trésorerie' },
] as const;

// Business sectors
export const BUSINESS_SECTORS = [
  { value: 'agriculture', label: 'Agriculture / Agroalimentaire' },
  { value: 'industrie', label: 'Industrie / Manufacturing' },
  { value: 'construction', label: 'Construction / BTP' },
  { value: 'commerce', label: 'Commerce / Distribution' },
  { value: 'transport', label: 'Transport / Logistique' },
  { value: 'tourisme', label: 'Tourisme / Hôtellerie / Restauration' },
  { value: 'sante', label: 'Santé / Médical' },
  { value: 'tech', label: 'Tech / Numérique / IT' },
  { value: 'services', label: 'Services aux entreprises' },
  { value: 'finance', label: 'Finance / Assurance' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'culture', label: 'Culture / Médias / Communication' },
  { value: 'education', label: 'Éducation / Formation' },
  { value: 'environnement', label: 'Environnement / Énergie' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'autre', label: 'Autre' },
] as const;

// Document categories
export const DOCUMENT_CATEGORIES = [
  { value: 'identity', label: 'Document d\'identité' },
  { value: 'financial', label: 'Document financier' },
  { value: 'legal', label: 'Document juridique' },
  { value: 'business', label: 'Document commercial' },
  { value: 'other', label: 'Autre' },
] as const;

// Helper to check if a legal form is an association-type entity
export function isAssociationType(legalForm: string | null): boolean {
  if (!legalForm) return false;
  const associationForms = ['ASSO', 'COOP', 'FONDATION'];
  return associationForms.includes(legalForm.toUpperCase());
}

// Helper to get entity type from legal form
export function getEntityTypeFromLegalForm(legalForm: string | null): 'association' | 'entreprise' | null {
  if (!legalForm) return null;
  if (isAssociationType(legalForm)) return 'association';
  return 'entreprise';
}

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
