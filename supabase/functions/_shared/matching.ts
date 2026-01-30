/**
 * Shared Matching Utilities for V5 Hybrid Matcher
 *
 * Pre-scoring and profile analysis for subsidy matching
 * Handles NULL data gracefully - doesn't penalize missing fields
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileInput {
  id: string;
  company_name: string;
  siret?: string;
  naf_code?: string;
  naf_label?: string;
  sector?: string;
  sub_sector?: string;
  region?: string;
  department?: string;
  employees?: string;
  annual_turnover?: number;
  year_created?: number;
  legal_form?: string;
  company_category?: string;
  project_types?: string[];
  certifications?: string[];
  description?: string;
  website_intelligence?: WebsiteIntelligence;
}

export interface WebsiteIntelligence {
  companyDescription?: string;
  businessActivities?: string[];
  innovations?: { score?: number; indicators?: string[]; technologies?: string[] };
  sustainability?: { score?: number; initiatives?: string[]; certifications?: string[] };
  export?: { score?: number; markets?: string[]; multilingualSite?: boolean };
  digital?: { score?: number; technologies?: string[]; ecommerce?: boolean };
  growth?: { score?: number; signals?: string[]; recentInvestment?: boolean };
}

export interface AnalyzedProfile {
  sector: string | null;
  sizeCategory: 'TPE' | 'PME' | 'ETI' | 'GE';
  entityType: string | null;
  searchTerms: string[];
  thematicKeywords: string[];
  exclusionKeywords: string[];
  projectTypes: string[];
  certifications: string[];
  region: string | null;
  companyAge: number | null;
  annualTurnover: number | null;
}

export interface SubsidyCandidate {
  id: string;
  title: string | { fr?: string; en?: string };
  description: string | { fr?: string } | null;
  agency?: string;
  region?: string[];
  categories?: string[];
  primary_sector?: string;
  keywords?: string[];
  funding_type?: string;
  amount_min?: number;
  amount_max?: number;
  deadline?: string;
  eligibility_criteria?: string | { fr?: string };
  legal_entities?: string[];
  is_universal_sector?: boolean;
}

export interface PreScoreResult {
  subsidy: SubsidyCandidate;
  preScore: number;
  hardFiltered: boolean;
  filterReason?: string;
  preReasons: string[];
}

// ============================================================================
// NAF CODE TO SECTOR MAPPING
// More granular mapping for better subsidy matching
// ============================================================================

const NAF_SECTOR_MAP: Record<string, string> = {
  // Agriculture, sylviculture et pêche (01-03)
  '01': 'Agriculture',
  '02': 'Sylviculture',
  '03': 'Pêche',

  // Industries extractives (05-09)
  '05': 'Mines',
  '06': 'Énergie',           // Extraction hydrocarbures
  '07': 'Mines',
  '08': 'Carrières',
  '09': 'Énergie',           // Services extraction

  // Industrie manufacturière (10-33) - More specific mapping
  '10': 'Agroalimentaire',   // Industries alimentaires
  '11': 'Agroalimentaire',   // Boissons
  '12': 'Industrie',         // Tabac
  '13': 'Textile',           // Textile
  '14': 'Textile',           // Habillement
  '15': 'Cuir',              // Cuir et chaussure
  '16': 'Bois',              // Travail du bois
  '17': 'Papier',            // Papier et carton
  '18': 'Imprimerie',        // Imprimerie
  '19': 'Énergie',           // Cokéfaction et raffinage
  '20': 'Chimie',            // Industrie chimique
  '21': 'Pharmacie',         // Industrie pharmaceutique
  '22': 'Plasturgie',        // Caoutchouc et plastique
  '23': 'Matériaux',         // Produits minéraux non métalliques
  '24': 'Métallurgie',       // Métallurgie
  '25': 'Métallurgie',       // Produits métalliques
  '26': 'Électronique',      // Produits informatiques et électroniques
  '27': 'Électronique',      // Équipements électriques
  '28': 'Mécanique',         // Machines et équipements
  '29': 'Automobile',        // Industrie automobile
  '30': 'Aéronautique',      // Autres matériels de transport
  '31': 'Ameublement',       // Meubles
  '32': 'Industrie',         // Autres industries manufacturières
  '33': 'Industrie',         // Réparation et installation

  // Production et distribution d'énergie (35)
  '35': 'Énergie',

  // Eau et déchets (36-39)
  '36': 'Environnement',     // Captage et distribution d'eau
  '37': 'Environnement',     // Collecte et traitement des eaux usées
  '38': 'Environnement',     // Collecte et traitement des déchets
  '39': 'Environnement',     // Dépollution

  // Construction (41-43)
  '41': 'BTP',               // Construction de bâtiments
  '42': 'BTP',               // Génie civil
  '43': 'BTP',               // Travaux de construction spécialisés

  // Commerce (45-47)
  '45': 'Commerce',          // Commerce et réparation automobile
  '46': 'Commerce',          // Commerce de gros
  '47': 'Commerce',          // Commerce de détail

  // Transport et entreposage (49-53)
  '49': 'Transport',         // Transports terrestres
  '50': 'Transport',         // Transports par eau
  '51': 'Transport',         // Transports aériens
  '52': 'Logistique',        // Entreposage et services auxiliaires
  '53': 'Logistique',        // Activités de poste et de courrier

  // Hébergement et restauration (55-56)
  '55': 'Tourisme',          // Hébergement
  '56': 'Restauration',      // Restauration

  // Information et communication (58-63)
  '58': 'Édition',           // Édition
  '59': 'Audiovisuel',       // Production audiovisuelle
  '60': 'Audiovisuel',       // Programmation et diffusion
  '61': 'Télécommunications',// Télécommunications
  '62': 'Numérique',         // Programmation informatique
  '63': 'Numérique',         // Services d'information

  // Activités financières (64-66)
  '64': 'Finance',           // Services financiers
  '65': 'Assurance',         // Assurance
  '66': 'Finance',           // Activités auxiliaires financières

  // Immobilier (68)
  '68': 'Immobilier',

  // Activités spécialisées (69-75)
  '69': 'Services',          // Activités juridiques et comptables
  '70': 'Conseil',           // Conseil de gestion
  '71': 'Ingénierie',        // Architecture et ingénierie
  '72': 'R&D',               // Recherche-développement
  '73': 'Communication',     // Publicité et études de marché
  '74': 'Design',            // Autres activités spécialisées
  '75': 'Santé animale',     // Activités vétérinaires

  // Services administratifs (77-82)
  '77': 'Services',          // Location et location-bail
  '78': 'RH',                // Activités liées à l'emploi
  '79': 'Tourisme',          // Agences de voyage
  '80': 'Sécurité',          // Enquêtes et sécurité
  '81': 'Services',          // Services bâtiments et aménagement paysager
  '82': 'Services',          // Services de soutien aux entreprises

  // Administration publique (84)
  '84': 'Public',

  // Enseignement (85)
  '85': 'Formation',

  // Santé humaine et action sociale (86-88)
  '86': 'Santé',             // Activités pour la santé humaine
  '87': 'Social',            // Hébergement médico-social
  '88': 'Social',            // Action sociale sans hébergement

  // Arts, spectacles et activités récréatives (90-93)
  '90': 'Culture',           // Activités créatives, artistiques
  '91': 'Culture',           // Bibliothèques, musées
  '92': 'Jeux',              // Organisation de jeux de hasard
  '93': 'Sport',             // Activités sportives

  // Autres activités de services (94-96)
  '94': 'Associatif',        // Organisations associatives
  '95': 'Services',          // Réparation d'ordinateurs et biens personnels
  '96': 'Services',          // Autres services personnels
};

// ============================================================================
// SECTOR EXCLUSION KEYWORDS
// Keywords that indicate a subsidy is NOT for this sector
// Be careful: these cause HARD FILTERING when found in title
// ============================================================================

const SECTOR_EXCLUSIONS: Record<string, string[]> = {
  // Primary sectors - exclude cultural/artistic
  'Agriculture': ['musique', 'musical', 'cinéma', 'audiovisuel', 'film', 'spectacle', 'théâtre', 'danse', 'jeux vidéo'],
  'Sylviculture': ['musique', 'cinéma', 'audiovisuel', 'spectacle', 'théâtre'],
  'Pêche': ['musique', 'cinéma', 'audiovisuel', 'spectacle', 'théâtre', 'agricole terrestre'],

  // Industrial sectors - exclude cultural/agricultural
  'Industrie': ['musique', 'musical', 'spectacle', 'théâtre', 'danse', 'artistique'],
  'Agroalimentaire': ['musique', 'cinéma', 'spectacle', 'numérique', 'logiciel'],
  'Textile': ['musique', 'cinéma', 'agricole', 'informatique'],
  'Bois': ['musique', 'cinéma', 'spectacle', 'numérique'],
  'Chimie': ['musique', 'cinéma', 'spectacle', 'artistique', 'agricole'],
  'Pharmacie': ['musique', 'cinéma', 'spectacle', 'agricole', 'bâtiment'],
  'Plasturgie': ['musique', 'cinéma', 'spectacle', 'agricole'],
  'Métallurgie': ['musique', 'cinéma', 'spectacle', 'agricole', 'artistique'],
  'Électronique': ['musique', 'spectacle', 'théâtre', 'agricole', 'élevage'],
  'Mécanique': ['musique', 'cinéma', 'spectacle', 'artistique'],
  'Automobile': ['musique', 'cinéma', 'spectacle', 'agricole', 'artistique'],
  'Aéronautique': ['musique', 'cinéma', 'spectacle', 'agricole', 'artistique'],

  // Construction - exclude cultural
  'BTP': ['musique', 'musical', 'cinéma', 'film', 'spectacle', 'artistique', 'agricole'],
  'Matériaux': ['musique', 'cinéma', 'spectacle', 'artistique'],

  // Services sectors
  'Commerce': ['musique', 'musical', 'cinéma', 'film', 'spectacle'],
  'Transport': ['musique', 'cinéma', 'spectacle', 'agricole'],
  'Logistique': ['musique', 'cinéma', 'spectacle', 'artistique'],
  'Tourisme': ['industrie lourde', 'métallurgie', 'chimie'],
  'Restauration': ['industrie lourde', 'métallurgie', 'chimie'],

  // Tech sectors - exclude primary industries
  'Numérique': ['agriculture', 'élevage', 'pêche', 'sylviculture', 'spectacle vivant'],
  'Télécommunications': ['agriculture', 'élevage', 'spectacle', 'cinéma'],
  'Édition': ['métallurgie', 'chimie', 'agriculture'],

  // Finance - exclude cultural/agricultural
  'Finance': ['musique', 'cinéma', 'spectacle', 'agricole', 'artisanat'],
  'Assurance': ['musique', 'cinéma', 'spectacle', 'agricole'],
  'Immobilier': ['musique', 'cinéma', 'spectacle', 'agricole'],

  // Professional services
  'Conseil': ['musique', 'cinéma', 'spectacle', 'agricole'],
  'Ingénierie': ['musique', 'cinéma', 'spectacle', 'artistique'],
  'Design': [],  // Can overlap with many sectors

  // Health & Social
  'Santé': ['musique', 'cinéma', 'spectacle', 'agricole', 'industrie lourde'],
  'Social': ['industrie', 'manufacture', 'métallurgie'],
  'Santé animale': ['musique', 'cinéma', 'spectacle', 'industrie'],

  // Environment
  'Environnement': ['spectacle', 'cinéma', 'musique'],

  // Energy
  'Énergie': ['spectacle', 'cinéma', 'musique', 'artistique'],

  // Sectors that can match almost anything (no exclusions)
  'Culture': [],
  'Audiovisuel': [],
  'R&D': [],
  'Formation': [],
  'Sport': [],
  'Associatif': [],
  'Communication': [],
  'Services': [],
  'Public': [],
};

// Keywords that indicate a subsidy IS for a specific sector
// Used for positive matching and thematic keyword extraction
const SECTOR_INDICATOR_KEYWORDS: Record<string, string[]> = {
  // Primary sectors
  'Agriculture': ['agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole', 'pac', 'feader', 'rural', 'fermier', 'paysan', 'maraîcher', 'viticulture', 'arboriculture'],
  'Sylviculture': ['forestier', 'forêt', 'bois', 'sylviculture', 'filière bois', 'exploitation forestière'],
  'Pêche': ['pêche', 'pêcheur', 'aquaculture', 'maritime', 'conchyliculture', 'ostréiculture', 'feamp'],

  // Manufacturing - specific
  'Agroalimentaire': ['agroalimentaire', 'alimentaire', 'transformation alimentaire', 'iaa', 'food', 'agro-industrie'],
  'Textile': ['textile', 'habillement', 'confection', 'mode', 'couture', 'tissu', 'vêtement'],
  'Bois': ['bois', 'menuiserie', 'charpente', 'ébénisterie', 'biosourcé', 'filière bois', 'scierie'],
  'Papier': ['papier', 'carton', 'emballage', 'imprimerie', 'édition'],
  'Chimie': ['chimie', 'chimique', 'pétrochimie', 'produits chimiques'],
  'Pharmacie': ['pharmaceutique', 'pharmacie', 'médicament', 'biotech', 'biotechnologie', 'santé humaine'],
  'Plasturgie': ['plastique', 'plasturgie', 'caoutchouc', 'polymère', 'composite'],
  'Matériaux': ['matériaux', 'verre', 'céramique', 'béton', 'ciment', 'matériaux de construction'],
  'Métallurgie': ['métallurgie', 'métal', 'sidérurgie', 'fonderie', 'forge', 'usinage', 'chaudronnerie'],
  'Électronique': ['électronique', 'électrique', 'composant', 'semi-conducteur', 'microélectronique', 'capteur'],
  'Mécanique': ['mécanique', 'machine', 'équipement', 'outillage', 'robotique', 'automatisation'],
  'Automobile': ['automobile', 'véhicule', 'constructeur', 'équipementier', 'mobilité'],
  'Aéronautique': ['aéronautique', 'aérospatial', 'aviation', 'spatial', 'défense', 'naval'],
  'Ameublement': ['meuble', 'ameublement', 'mobilier', 'agencement'],

  // Generic industry
  'Industrie': ['industriel', 'industrie', 'manufacture', 'usine', 'production industrielle', 'atelier', 'fabrication'],

  // Construction
  'BTP': ['bâtiment', 'construction', 'travaux publics', 'btp', 'chantier', 'génie civil', 'rénovation', 'maîtrise d\'ouvrage'],

  // Services sectors
  'Commerce': ['commerce', 'commercial', 'retail', 'négoce', 'distribution', 'vente', 'détail', 'gros'],
  'Transport': ['transport', 'mobilité', 'fret', 'routier', 'ferroviaire', 'maritime', 'aérien', 'multimodal'],
  'Logistique': ['logistique', 'entreposage', 'supply chain', 'stockage', 'manutention'],
  'Tourisme': ['tourisme', 'touristique', 'hébergement', 'hôtellerie', 'camping', 'loisirs', 'accueil'],
  'Restauration': ['restauration', 'restaurant', 'traiteur', 'café', 'hôtellerie-restauration'],

  // Tech & Digital
  'Numérique': ['numérique', 'digital', 'logiciel', 'informatique', 'tech', 'startup', 'saas', 'cloud', 'data', 'ia', 'intelligence artificielle'],
  'Télécommunications': ['télécom', 'télécommunications', 'réseau', 'fibre', 'mobile', '5g'],
  'Édition': ['édition', 'éditeur', 'livre', 'presse', 'média'],
  'Audiovisuel': ['audiovisuel', 'cinéma', 'film', 'production audiovisuelle', 'musique', 'musical', 'jeux vidéo', 'animation'],

  // Finance & Insurance
  'Finance': ['finance', 'financier', 'banque', 'bancaire', 'fintech', 'investissement'],
  'Assurance': ['assurance', 'assureur', 'mutuelle', 'prévoyance', 'insurtech'],
  'Immobilier': ['immobilier', 'foncier', 'promotion', 'gestion immobilière', 'proptech'],

  // Professional services
  'Conseil': ['conseil', 'consulting', 'consultant', 'expertise', 'accompagnement', 'audit'],
  'Ingénierie': ['ingénierie', 'bureau d\'études', 'conception', 'architecture', 'bet'],
  'Design': ['design', 'création', 'graphisme', 'stylisme', 'designer'],
  'Communication': ['communication', 'publicité', 'marketing', 'agence', 'média', 'événementiel'],
  'RH': ['ressources humaines', 'recrutement', 'formation professionnelle', 'emploi', 'intérim'],

  // Health & Social
  'Santé': ['santé', 'médical', 'médecine', 'hospitalier', 'soins', 'ehpad', 'clinique'],
  'Social': ['social', 'médico-social', 'aide à domicile', 'handicap', 'insertion', 'ess'],
  'Santé animale': ['vétérinaire', 'animal', 'animalier', 'élevage'],

  // Culture & Sport
  'Culture': ['culture', 'culturel', 'artistique', 'art', 'patrimoine', 'musée', 'spectacle vivant'],
  'Sport': ['sport', 'sportif', 'équipement sportif', 'club', 'fédération'],

  // Environment & Energy
  'Environnement': ['environnement', 'écologie', 'déchet', 'recyclage', 'économie circulaire', 'biodiversité', 'eau'],
  'Énergie': ['énergie', 'énergétique', 'renouvelable', 'électricité', 'gaz', 'photovoltaïque', 'éolien', 'hydrogène', 'décarbonation'],

  // R&D & Formation
  'R&D': ['recherche', 'développement', 'r&d', 'innovation', 'laboratoire', 'brevet', 'expérimentation'],
  'Formation': ['formation', 'enseignement', 'éducation', 'apprentissage', 'compétences', 'école'],

  // Other
  'Associatif': ['association', 'associatif', 'ong', 'fondation', 'bénévole'],
  'Sécurité': ['sécurité', 'surveillance', 'gardiennage', 'protection'],
  'Services': ['services', 'prestation', 'entreprise de services'],
};

// ============================================================================
// LEGAL ENTITY MAPPING
// Maps French legal forms to entity types used in subsidy eligibility
// ============================================================================

const LEGAL_FORM_TO_ENTITY: Record<string, string[]> = {
  // ===== Sociétés de capitaux =====
  'SA': ['Entreprise', 'PME', 'ETI', 'GE', 'Société', 'Société commerciale'],
  'SAS': ['Entreprise', 'PME', 'ETI', 'Startup', 'Société', 'Société commerciale'],
  'SASU': ['Entreprise', 'PME', 'TPE', 'Startup', 'Société', 'Société commerciale'],

  // ===== SARL et dérivés =====
  'SARL': ['Entreprise', 'PME', 'TPE', 'Société', 'Société commerciale'],
  'EURL': ['Entreprise', 'TPE', 'Société', 'Société commerciale'],
  'SARLU': ['Entreprise', 'TPE', 'Société', 'Société commerciale'],  // Alias EURL

  // ===== Sociétés de personnes =====
  'SNC': ['Entreprise', 'PME', 'TPE', 'Société', 'Société de personnes'],
  'SCS': ['Entreprise', 'PME', 'Société', 'Société de personnes'],  // Société en commandite simple
  'SCA': ['Entreprise', 'PME', 'ETI', 'Société', 'Société de personnes'],  // Société en commandite par actions

  // ===== Entrepreneurs individuels =====
  'EI': ['Entreprise', 'TPE', 'Indépendant', 'Entrepreneur individuel'],
  'EIRL': ['Entreprise', 'TPE', 'Indépendant', 'Entrepreneur individuel'],
  'Auto-entrepreneur': ['Entreprise', 'TPE', 'Indépendant', 'Micro-entreprise', 'Travailleur indépendant'],
  'Micro-entreprise': ['Entreprise', 'TPE', 'Indépendant', 'Micro-entreprise', 'Travailleur indépendant'],
  'Profession libérale': ['Entreprise', 'TPE', 'Indépendant', 'Profession libérale', 'Travailleur indépendant'],

  // ===== Artisans et commerçants =====
  'Artisan': ['Entreprise', 'TPE', 'Artisan', 'Indépendant', 'Métiers d\'art'],
  'Commerçant': ['Entreprise', 'TPE', 'Commerçant', 'Commerce'],

  // ===== Sociétés civiles =====
  'SCI': ['Société civile', 'Société civile immobilière', 'Immobilier'],
  'SCM': ['Société civile', 'Société civile de moyens', 'Profession libérale'],
  'SCP': ['Société civile', 'Société civile professionnelle', 'Profession libérale'],
  'SEL': ['Société', 'Société d\'exercice libéral', 'Profession libérale'],
  'SELARL': ['Société', 'Société d\'exercice libéral', 'Profession libérale'],

  // ===== Structures agricoles =====
  'GAEC': ['Entreprise agricole', 'Exploitation agricole', 'Agriculture', 'Groupement agricole'],
  'EARL': ['Entreprise agricole', 'Exploitation agricole', 'Agriculture', 'TPE', 'PME'],
  'SCEA': ['Entreprise agricole', 'Exploitation agricole', 'Agriculture', 'Société civile'],
  'Exploitant agricole': ['Entreprise agricole', 'Exploitation agricole', 'Agriculture', 'TPE', 'Indépendant'],

  // ===== Coopératives et ESS =====
  'SCOP': ['Entreprise', 'Coopérative', 'ESS', 'PME', 'Économie sociale et solidaire'],
  'SCIC': ['Entreprise', 'Coopérative', 'ESS', 'Économie sociale et solidaire', 'Intérêt collectif'],
  'Coopérative': ['Coopérative', 'ESS', 'Économie sociale et solidaire'],
  'Coopérative agricole': ['Coopérative', 'Agriculture', 'ESS', 'Coopérative agricole'],
  'CAE': ['Coopérative', 'Coopérative d\'activité et d\'emploi', 'ESS', 'Entrepreneur salarié'],

  // ===== Associations et fondations =====
  'Association': ['Association', 'Organisme à but non lucratif', 'OBNL', 'ESS'],
  'Association loi 1901': ['Association', 'Organisme à but non lucratif', 'OBNL', 'ESS'],
  'Fondation': ['Fondation', 'Organisme à but non lucratif', 'OBNL', 'Mécénat'],
  'Fonds de dotation': ['Fondation', 'Organisme à but non lucratif', 'OBNL', 'Mécénat'],

  // ===== Mutuelles et organismes de prévoyance =====
  'Mutuelle': ['Mutuelle', 'ESS', 'Organisme complémentaire', 'Économie sociale et solidaire'],

  // ===== Organismes publics et parapublics =====
  'EPIC': ['Établissement public', 'Organisme public', 'EPIC'],
  'EPA': ['Établissement public', 'Organisme public', 'EPA'],
  'SEM': ['Société d\'économie mixte', 'Organisme public', 'Collectivité'],
  'SPL': ['Société publique locale', 'Organisme public', 'Collectivité'],
  'GIP': ['Groupement d\'intérêt public', 'Organisme public'],
  'Régie': ['Organisme public', 'Collectivité', 'Régie'],

  // ===== Groupements =====
  'GIE': ['Groupement', 'GIE', 'Groupement d\'intérêt économique', 'Entreprise'],
  'GEIE': ['Groupement', 'GEIE', 'Groupement européen d\'intérêt économique'],

  // ===== Autres =====
  'Société européenne': ['Entreprise', 'Société européenne', 'PME', 'ETI', 'GE'],
  'Succursale': ['Entreprise', 'Succursale', 'Filiale'],
};

// ============================================================================
// PROFILE ANALYSIS
// ============================================================================

/**
 * Extract sector from NAF code
 */
export function getSectorFromNafCode(nafCode: string): string | null {
  if (!nafCode) return null;
  const prefix = nafCode.substring(0, 2);
  return NAF_SECTOR_MAP[prefix] || null;
}

/**
 * Get company size category from employee count
 */
export function getCompanySizeCategory(employees: string | undefined): 'TPE' | 'PME' | 'ETI' | 'GE' {
  const count = parseInt(employees || '0');
  if (count < 10) return 'TPE';
  if (count < 250) return 'PME';
  if (count < 5000) return 'ETI';
  return 'GE';
}

/**
 * Get entity types that match a legal form
 */
export function getEntityTypes(legalForm: string | undefined): string[] {
  if (!legalForm) return ['Entreprise', 'PME', 'TPE'];

  // Find matching entry
  for (const [form, types] of Object.entries(LEGAL_FORM_TO_ENTITY)) {
    if (legalForm.toUpperCase().includes(form.toUpperCase())) {
      return types;
    }
  }

  return ['Entreprise'];
}

/**
 * Extract search terms from profile for text matching
 * EXPANDED: Now extracts from certifications, description, and AI data
 */
export function extractSearchTerms(profile: ProfileInput): string[] {
  const terms: string[] = [];
  const stopWords = ['pour', 'avec', 'dans', 'sans', 'autre', 'plus', 'moins', 'très', 'être', 'avoir', 'faire', 'tout', 'tous'];

  // NAF label words
  if (profile.naf_label) {
    const words = profile.naf_label.toLowerCase()
      .split(/[\s,;]+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));
    terms.push(...words);
  }

  // Sector as term
  if (profile.sector) {
    terms.push(profile.sector.toLowerCase());
  }

  // Sub-sector
  if (profile.sub_sector) {
    terms.push(profile.sub_sector.toLowerCase());
  }

  // Project types
  if (profile.project_types?.length) {
    terms.push(...profile.project_types.map(p => p.toLowerCase()));
  }

  // === NEW: Certifications (HIGH IMPACT) ===
  if (profile.certifications?.length) {
    for (const cert of profile.certifications) {
      const certLower = cert.toLowerCase();
      terms.push(certLower);
      // Also add key parts (e.g., "Agriculture biologique" -> "bio", "biologique")
      if (certLower.includes('bio')) {
        terms.push('bio', 'biologique');
      }
      if (certLower.includes('hve')) {
        terms.push('hve', 'haute valeur environnementale');
      }
      if (certLower.includes('iso')) {
        terms.push(certLower); // Keep ISO 14001, ISO 9001, etc.
      }
      if (certLower.includes('rge')) {
        terms.push('rge', 'reconnu garant environnement');
      }
    }
  }

  // === NEW: Description keywords (MEDIUM IMPACT) ===
  if (profile.description) {
    const descWords = profile.description.toLowerCase()
      .split(/[\s,;.!?]+/)
      .filter(w => w.length > 4 && !stopWords.includes(w));
    // Take unique important words from description
    const importantWords = descWords.filter(w =>
      !['entreprise', 'société', 'activité', 'notre', 'votre', 'cette', 'leurs'].includes(w)
    );
    terms.push(...importantWords.slice(0, 10));
  }

  // === IMPROVED: Website intelligence business activities ===
  if (profile.website_intelligence?.businessActivities) {
    for (const activity of profile.website_intelligence.businessActivities) {
      // Keep full activity phrase AND individual words
      terms.push(activity.toLowerCase());
      const words = activity.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      terms.push(...words);
    }
  }

  // === NEW: Company description from AI ===
  if (profile.website_intelligence?.companyDescription) {
    const descWords = profile.website_intelligence.companyDescription.toLowerCase()
      .split(/[\s,;.]+/)
      .filter(w => w.length > 4 && !stopWords.includes(w));
    terms.push(...descWords.slice(0, 8));
  }

  // === NEW: Innovation indicators ===
  if (profile.website_intelligence?.innovations?.indicators) {
    for (const indicator of profile.website_intelligence.innovations.indicators) {
      terms.push(indicator.toLowerCase());
    }
  }

  // === NEW: Sustainability initiatives ===
  if (profile.website_intelligence?.sustainability?.initiatives) {
    for (const initiative of profile.website_intelligence.sustainability.initiatives) {
      terms.push(initiative.toLowerCase());
    }
  }

  // Dedupe and limit (increased from 15 to 25)
  return [...new Set(terms)].slice(0, 25);
}

/**
 * Extract thematic keywords based on profile characteristics
 * EXPANDED: More keywords from AI data and certifications
 */
export function extractThematicKeywords(profile: ProfileInput): string[] {
  const keywords: string[] = [];

  // From sector
  const sector = profile.sector || getSectorFromNafCode(profile.naf_code || '');
  if (sector && SECTOR_INDICATOR_KEYWORDS[sector]) {
    keywords.push(...SECTOR_INDICATOR_KEYWORDS[sector]);
  }

  // === NEW: From certifications (HIGH IMPACT) ===
  if (profile.certifications?.length) {
    for (const cert of profile.certifications) {
      const certLower = cert.toLowerCase();
      if (certLower.includes('bio') || certLower.includes('biologique')) {
        keywords.push('biologique', 'bio', 'agriculture biologique', 'conversion bio', 'label bio');
      }
      if (certLower.includes('hve')) {
        keywords.push('haute valeur environnementale', 'hve', 'certification environnementale');
      }
      if (certLower.includes('iso 14001') || certLower.includes('iso14001')) {
        keywords.push('environnement', 'management environnemental', 'certification iso');
      }
      if (certLower.includes('rge')) {
        keywords.push('rénovation énergétique', 'efficacité énergétique', 'rge');
      }
    }
  }

  // === NEW: From description keywords ===
  if (profile.description) {
    const desc = profile.description.toLowerCase();
    if (desc.includes('construction') || desc.includes('bâtiment')) {
      keywords.push('construction', 'bâtiment', 'btp', 'travaux');
    }
    if (desc.includes('écologique') || desc.includes('durable')) {
      keywords.push('écologique', 'durable', 'environnement', 'vert');
    }
    if (desc.includes('transformation')) {
      keywords.push('transformation', 'valorisation', 'filière');
    }
  }

  // From website intelligence
  const wi = profile.website_intelligence;
  if (wi) {
    // === IMPROVED: Tiered scoring based on score level ===
    if (wi.innovations?.score && wi.innovations.score >= 50) {
      keywords.push('innovation', 'r&d', 'recherche', 'développement');
      if (wi.innovations.score >= 70) {
        keywords.push('brevet', 'prototype', 'expérimentation', 'innovant');
      }
    }
    if (wi.sustainability?.score && wi.sustainability.score >= 50) {
      keywords.push('environnement', 'transition écologique', 'rse', 'développement durable');
      if (wi.sustainability.score >= 70) {
        keywords.push('carbone', 'décarbonation', 'empreinte carbone', 'neutralité carbone', 'climat');
        // Add loan-related green keywords
        keywords.push('prêt vert', 'financement vert', 'éco-prêt');
      }
      if (wi.sustainability.score >= 80) {
        keywords.push('économie circulaire', 'recyclage', 'réemploi', 'biodiversité');
        // Add industry green keywords for high sustainability
        keywords.push('industrie verte', 'transition industrielle', 'décarboner');
      }
    }
    if (wi.export?.score && wi.export.score >= 50) {
      keywords.push('export', 'international', 'développement international');
    }
    if (wi.digital?.score && wi.digital.score >= 50) {
      keywords.push('numérique', 'digital', 'transformation digitale');
    }

    // === NEW: From businessActivities - detect secondary sectors ===
    if (wi.businessActivities) {
      for (const activity of wi.businessActivities) {
        const actLower = activity.toLowerCase();
        if (actLower.includes('construction') || actLower.includes('bâtiment') || actLower.includes('matériau')) {
          keywords.push('construction', 'bâtiment', 'matériaux', 'btp');
        }
        if (actLower.includes('bois') || actLower.includes('forestier') || actLower.includes('bambou')) {
          keywords.push('bois', 'filière bois', 'forestier', 'biosourcé');
          keywords.push('matériaux biosourcés', 'bois-construction', 'éco-matériaux');
        }
        if (actLower.includes('énergie') || actLower.includes('renouvelable')) {
          keywords.push('énergie', 'renouvelable', 'transition énergétique');
        }
      }
    }

    // === NEW: From sustainability initiatives ===
    if (wi.sustainability?.initiatives) {
      for (const init of wi.sustainability.initiatives) {
        const initLower = init.toLowerCase();
        if (initLower.includes('carbone')) {
          keywords.push('carbone', 'bas carbone', 'neutralité carbone', 'décarbonation');
        }
        if (initLower.includes('déchet') || initLower.includes('zéro')) {
          keywords.push('déchets', 'économie circulaire', 'valorisation');
        }
      }
    }
  }

  // From project types
  if (profile.project_types?.length) {
    for (const pt of profile.project_types) {
      const lower = pt.toLowerCase();
      if (lower.includes('innov')) keywords.push('innovation');
      if (lower.includes('export')) keywords.push('export', 'international');
      if (lower.includes('embauche') || lower.includes('recrutement')) keywords.push('emploi', 'recrutement');
      if (lower.includes('formation')) keywords.push('formation', 'compétences');
      if (lower.includes('écolog') || lower.includes('environnement')) keywords.push('transition écologique');
    }
  }

  return [...new Set(keywords)];
}

/**
 * Analyze a profile and extract all matching-relevant data
 */
export function analyzeProfile(profile: ProfileInput): AnalyzedProfile {
  const sector = profile.sector || getSectorFromNafCode(profile.naf_code || '');
  const currentYear = new Date().getFullYear();

  return {
    sector,
    sizeCategory: getCompanySizeCategory(profile.employees),
    entityType: profile.legal_form || null,
    searchTerms: extractSearchTerms(profile),
    thematicKeywords: extractThematicKeywords(profile),
    exclusionKeywords: sector ? (SECTOR_EXCLUSIONS[sector] || []) : [],
    projectTypes: profile.project_types || [],
    certifications: profile.certifications || [],
    region: profile.region || null,
    companyAge: profile.year_created ? currentYear - profile.year_created : null,
    annualTurnover: profile.annual_turnover || null,
  };
}

// ============================================================================
// SUBSIDY TEXT HELPERS
// ============================================================================

/**
 * Extract title text from subsidy (handles multilingual objects)
 */
export function getTitle(subsidy: SubsidyCandidate): string {
  if (typeof subsidy.title === 'object') {
    return subsidy.title?.fr || subsidy.title?.en || '';
  }
  return subsidy.title || '';
}

/**
 * Extract description text from subsidy
 */
export function getDescription(subsidy: SubsidyCandidate): string {
  if (!subsidy.description) return '';
  if (typeof subsidy.description === 'object') {
    return subsidy.description?.fr || '';
  }
  return subsidy.description;
}

/**
 * Extract eligibility criteria text
 */
export function getEligibility(subsidy: SubsidyCandidate): string {
  if (!subsidy.eligibility_criteria) return '';
  if (typeof subsidy.eligibility_criteria === 'object') {
    return subsidy.eligibility_criteria?.fr || '';
  }
  return subsidy.eligibility_criteria;
}

/**
 * Get combined text for searching
 */
export function getSubsidyText(subsidy: SubsidyCandidate): string {
  return `${getTitle(subsidy)} ${getDescription(subsidy)} ${getEligibility(subsidy)}`.toLowerCase();
}

// ============================================================================
// PRE-SCORING
// ============================================================================

/**
 * Check if entity type is compatible with subsidy legal_entities
 * Returns { ok: boolean, bonus: boolean, reason?: string }
 */
function checkEntityCompatibility(
  subsidyEntities: string[] | undefined,
  analyzedProfile: AnalyzedProfile
): { ok: boolean; bonus: boolean; reason?: string } {
  // If subsidy doesn't specify legal entities, assume universal
  if (!subsidyEntities || subsidyEntities.length === 0) {
    return { ok: true, bonus: false };
  }

  const profileEntityTypes = getEntityTypes(analyzedProfile.entityType || undefined);
  const sizeCategory = analyzedProfile.sizeCategory;

  // Check if any profile entity type matches subsidy requirements
  const hasMatch = subsidyEntities.some(se => {
    const seLower = se.toLowerCase();

    // Direct size match
    if (seLower === sizeCategory.toLowerCase()) return true;
    if (seLower.includes(sizeCategory.toLowerCase())) return true;

    // Entity type match
    for (const pet of profileEntityTypes) {
      if (seLower.includes(pet.toLowerCase()) || pet.toLowerCase().includes(seLower)) {
        return true;
      }
    }

    // Generic matches
    if (seLower === 'entreprise' || seLower === 'société') return true;
    if (seLower === 'tous' || seLower === 'toutes entreprises') return true;

    return false;
  });

  if (!hasMatch) {
    return {
      ok: false,
      bonus: false,
      reason: `Entités requises: ${subsidyEntities.join(', ')} - Profil: ${sizeCategory}`
    };
  }

  // Check for exact size match (bonus)
  const exactMatch = subsidyEntities.some(se =>
    se.toLowerCase() === sizeCategory.toLowerCase()
  );

  return { ok: true, bonus: exactMatch };
}

/**
 * Check if subsidy contains negative patterns indicating exclusion
 */
function hasExclusionContext(text: string, term: string): boolean {
  const patterns = ['sauf', 'hors', 'à l\'exception', 'excepté', 'exclu', 'non éligible'];
  const termIndex = text.indexOf(term);
  if (termIndex === -1) return false;

  // Check 50 chars before the term for exclusion patterns
  const contextBefore = text.substring(Math.max(0, termIndex - 50), termIndex);
  return patterns.some(p => contextBefore.includes(p));
}

/**
 * Calculate pre-score for a subsidy against an analyzed profile
 * NULL-tolerant: missing data doesn't penalize, only positive matches add points
 */
export function calculatePreScore(
  subsidy: SubsidyCandidate,
  analyzedProfile: AnalyzedProfile
): PreScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const subsidyText = getSubsidyText(subsidy);

  // ========== HARD FILTERS ==========

  // 1. Sector EXCLUSION check (works on title/description)
  for (const exclusion of analyzedProfile.exclusionKeywords) {
    if (subsidyText.includes(exclusion) && !hasExclusionContext(subsidyText, exclusion)) {
      // Check if it's in the title (stronger signal)
      const titleLower = getTitle(subsidy).toLowerCase();
      if (titleLower.includes(exclusion)) {
        return {
          subsidy,
          preScore: -50,
          hardFiltered: true,
          filterReason: `Secteur exclu: "${exclusion}" dans le titre`,
          preReasons: [],
        };
      }
    }
  }

  // 2. Entity type - ONLY if subsidy has legal_entities defined
  if (subsidy.legal_entities && subsidy.legal_entities.length > 0) {
    const entityCheck = checkEntityCompatibility(subsidy.legal_entities, analyzedProfile);
    if (!entityCheck.ok) {
      return {
        subsidy,
        preScore: -100,
        hardFiltered: true,
        filterReason: entityCheck.reason || 'Type d\'entité incompatible',
        preReasons: [],
      };
    }
    if (entityCheck.bonus) {
      score += 10;
      reasons.push(`Taille ${analyzedProfile.sizeCategory} éligible`);
    }
  }

  // ========== SOFT SCORING ==========

  // 3. Region Match (0-30 pts)
  if (subsidy.region && subsidy.region.length > 0) {
    if (analyzedProfile.region && subsidy.region.includes(analyzedProfile.region)) {
      score += 30;
      reasons.push(`Région: ${analyzedProfile.region}`);
    } else if (subsidy.region.includes('National')) {
      score += 25;  // Increased from 20 to help national programs compete
      reasons.push('Programme national');
    } else if (subsidy.region.length === 0) {
      score += 15;
      reasons.push('Toutes régions');
    }
    // If region doesn't match, no penalty - just no bonus
  } else {
    // NULL region = assumed universal
    score += 15;
    reasons.push('Région non spécifiée');
  }

  // 4. Sector Match (0-25 pts) - only if primary_sector exists
  if (subsidy.primary_sector && analyzedProfile.sector) {
    const subsidySectorLower = subsidy.primary_sector.toLowerCase();
    const profileSectorLower = analyzedProfile.sector.toLowerCase();

    if (subsidySectorLower.includes(profileSectorLower) ||
        profileSectorLower.includes(subsidySectorLower)) {
      score += 25;
      reasons.push(`Secteur: ${subsidy.primary_sector}`);
    } else if (subsidy.is_universal_sector) {
      score += 15;
      reasons.push('Multi-secteurs');
    }
  } else if (subsidy.is_universal_sector) {
    score += 15;
    reasons.push('Secteur universel');
  } else if (!subsidy.primary_sector) {
    // No sector specified = potentially universal, give partial credit
    score += 10;
    reasons.push('Secteur non spécifié');
  }

  // 5. TEXT MATCH (0-20 pts) - ALWAYS works (title/desc always exist)
  const matchedTerms = analyzedProfile.searchTerms.filter(term =>
    subsidyText.includes(term)
  );
  if (matchedTerms.length >= 3) {
    score += 20;
    reasons.push(`Mots-clés: ${matchedTerms.slice(0, 3).join(', ')}`);
  } else if (matchedTerms.length >= 1) {
    score += matchedTerms.length * 7;
    reasons.push(`Texte: ${matchedTerms.join(', ')}`);
  }

  // 6. Thematic keyword match (0-15 pts)
  const thematicMatches = analyzedProfile.thematicKeywords.filter(kw =>
    subsidyText.includes(kw.toLowerCase())
  );
  if (thematicMatches.length > 0) {
    score += Math.min(15, thematicMatches.length * 5);
    reasons.push(`Thématique: ${thematicMatches.slice(0, 2).join(', ')}`);
  }

  // 7. Keywords/Categories overlap (0-10 pts) - only if subsidy has them
  if (subsidy.keywords && subsidy.keywords.length > 0) {
    const kwMatches = subsidy.keywords.filter(kw =>
      analyzedProfile.thematicKeywords.some(tk =>
        kw.toLowerCase().includes(tk.toLowerCase())
      ) ||
      analyzedProfile.searchTerms.some(st =>
        kw.toLowerCase().includes(st)
      )
    );
    if (kwMatches.length > 0) {
      score += Math.min(10, kwMatches.length * 3);
      reasons.push(`Keywords: ${kwMatches.length} correspondances`);
    }
  }

  // 8. Certification match (0-10 pts) - NEW
  if (analyzedProfile.certifications.length > 0) {
    for (const cert of analyzedProfile.certifications) {
      if (subsidyText.includes(cert.toLowerCase())) {
        score += 10;
        reasons.push(`Certification: ${cert}`);
        break; // Only count once
      }
    }
  }

  // 9. Website intelligence bonuses (0-15 pts) - NEW
  // Already captured in thematic keywords, but add bonus for high scores

  // 10. Company age check - only if we detect age requirements in text
  if (analyzedProfile.companyAge !== null) {
    const agePatterns = [
      { pattern: /jeune entreprise|moins de (\d+) ans|créée? depuis moins/i, maxAge: 5 },
      { pattern: /startup|jeune pousse/i, maxAge: 7 },
      { pattern: /entreprise établie|plus de (\d+) ans/i, minAge: 3 },
    ];

    for (const { pattern, maxAge, minAge } of agePatterns) {
      const match = subsidyText.match(pattern);
      if (match) {
        const yearsFromMatch = match[1] ? parseInt(match[1]) : undefined;
        if (maxAge || yearsFromMatch) {
          const limit = yearsFromMatch || maxAge || 5;
          if (analyzedProfile.companyAge <= limit) {
            score += 10;
            reasons.push(`Jeune entreprise (${analyzedProfile.companyAge} ans)`);
          } else {
            score -= 20;
            reasons.push(`Ancienneté: ${analyzedProfile.companyAge} ans > ${limit} ans requis`);
          }
        }
        if (minAge) {
          if (analyzedProfile.companyAge >= minAge) {
            score += 5;
          }
        }
        break;
      }
    }
  }

  return {
    subsidy,
    preScore: Math.min(100, Math.max(-100, score)),
    hardFiltered: false,
    preReasons: reasons,
  };
}

// ============================================================================
// BATCH PRE-SCORING
// ============================================================================

/**
 * Pre-score all candidates and return filtered, sorted results
 */
export function preScoreSubsidies(
  candidates: SubsidyCandidate[],
  analyzedProfile: AnalyzedProfile,
  options: { minScore?: number; maxResults?: number; includeUncertain?: boolean } = {}
): PreScoreResult[] {
  const { minScore = 10, maxResults = 100, includeUncertain = true } = options;

  const results = candidates
    .map(subsidy => calculatePreScore(subsidy, analyzedProfile))
    .filter(r => {
      // Always exclude hard-filtered
      if (r.hardFiltered) return false;

      // Keep if score is above minimum
      if (r.preScore >= minScore) return true;

      // Optionally keep uncertain ones (missing sector data)
      if (includeUncertain && !r.subsidy.primary_sector) return true;

      return false;
    })
    .sort((a, b) => b.preScore - a.preScore)
    .slice(0, maxResults);

  return results;
}

// ============================================================================
// AMOUNT BOOST (Sector-Aware)
// ============================================================================

/**
 * Calculate amount boost only for sector-relevant subsidies
 */
export function getSectorAwareAmountBoost(
  subsidy: SubsidyCandidate,
  analyzedProfile: AnalyzedProfile
): number {
  const subsidyText = getSubsidyText(subsidy);

  // Check if subsidy is relevant to profile's sector
  const hasSectorRelevance =
    subsidy.is_universal_sector ||
    (subsidy.primary_sector && analyzedProfile.sector &&
      subsidy.primary_sector.toLowerCase().includes(analyzedProfile.sector.toLowerCase())) ||
    analyzedProfile.thematicKeywords.some(kw => subsidyText.includes(kw.toLowerCase()));

  // NO boost for irrelevant subsidies
  if (!hasSectorRelevance) return 0;

  const amountMax = subsidy.amount_max;
  if (!amountMax) return 0;
  if (amountMax >= 10000000) return 12;  // ≥10M€: high-value national programs
  if (amountMax >= 1000000) return 8;     // ≥1M€
  if (amountMax >= 500000) return 5;      // ≥500k€
  if (amountMax >= 100000) return 3;      // ≥100k€
  return 0;
}

// ============================================================================
// AGENCY BOOST
// Boost points for prestigious/strategic funding agencies
// Higher = more strategic/impactful programs
// ============================================================================

const AGENCY_TIERS: Record<string, number> = {
  // ===== French National Strategic Agencies (Tier 1: +5) =====
  'Bpifrance': 5,
  'BPI France': 5,
  'BPI': 5,
  'ADEME': 5,
  'France 2030': 5,
  'Plan France 2030': 5,
  'ANR': 5,                           // Agence Nationale de la Recherche
  'Agence Nationale de la Recherche': 5,
  'Caisse des Dépôts': 5,
  'CDC': 5,
  'Banque des Territoires': 5,

  // ===== European Union (Tier 1: +5) =====
  'Commission européenne': 5,
  'Union européenne': 5,
  'European Commission': 5,
  'Horizon Europe': 5,
  'Horizon 2020': 5,
  'LIFE': 5,
  'FEDER': 5,                         // Fonds européen de développement régional
  'FSE': 5,                           // Fonds social européen
  'FEADER': 5,                        // Fonds européen agricole pour le développement rural
  'FEAMP': 5,                         // Fonds européen pour les affaires maritimes et la pêche
  'ERASMUS': 5,
  'Digital Europe': 5,
  'CEF': 5,                           // Connecting Europe Facility
  'EIC': 5,                           // European Innovation Council
  'EIT': 5,                           // European Institute of Innovation and Technology

  // ===== French Sectoral Agencies (Tier 2: +4) =====
  'FranceAgriMer': 4,
  'FRANCEAGRIMER': 4,
  'ASP': 4,                           // Agence de Services et de Paiement
  'Agence de l\'eau': 4,
  'AESN': 4,                          // Agence de l'eau Seine-Normandie
  'AERMC': 4,                         // Agence de l'eau Rhône Méditerranée Corse
  'Agence Bio': 4,
  'ANACT': 4,                         // Agence nationale pour l'amélioration des conditions de travail
  'ANAH': 4,                          // Agence nationale de l'habitat
  'ANIL': 4,                          // Agence nationale pour l'information sur le logement
  'AGEFIPH': 4,                       // Association de gestion du fonds pour l'insertion professionnelle des personnes handicapées
  'FIPHFP': 4,                        // Fonds pour l'insertion des personnes handicapées dans la fonction publique
  'OSÉO': 4,                          // (now part of Bpifrance)
  'Business France': 4,
  'Atout France': 4,
  'CNC': 4,                           // Centre national du cinéma
  'CNM': 4,                           // Centre national de la musique
  'IFCIC': 4,                         // Institut pour le financement du cinéma et des industries culturelles
  'INPI': 4,                          // Institut national de la propriété industrielle

  // ===== Regional Authorities (Tier 3: +3) =====
  'Région': 3,
  'Conseil Régional': 3,
  'Île-de-France': 3,
  'Nouvelle-Aquitaine': 3,
  'Auvergne-Rhône-Alpes': 3,
  'Occitanie': 3,
  'Hauts-de-France': 3,
  'Grand Est': 3,
  'Bretagne': 3,
  'Normandie': 3,
  'Pays de la Loire': 3,
  'Centre-Val de Loire': 3,
  'Bourgogne-Franche-Comté': 3,
  'PACA': 3,
  'Provence-Alpes-Côte d\'Azur': 3,
  'Corse': 3,
  'Guadeloupe': 3,
  'Martinique': 3,
  'Guyane': 3,
  'Réunion': 3,
  'Mayotte': 3,

  // ===== Local Authorities & Networks (Tier 4: +2) =====
  'Département': 2,
  'Conseil Départemental': 2,
  'Métropole': 2,
  'Communauté urbaine': 2,
  'Communauté d\'agglomération': 2,
  'CCI': 2,                           // Chambre de Commerce et d'Industrie
  'Chambre de Commerce': 2,
  'CMA': 2,                           // Chambre de Métiers et de l'Artisanat
  'Chambre des Métiers': 2,
  'Chambre d\'Agriculture': 2,
  'France Active': 2,
  'Initiative France': 2,
  'Réseau Entreprendre': 2,
  'BGE': 2,                           // Boutiques de Gestion
  'ADIE': 2,                          // Association pour le droit à l'initiative économique
  'Pôle emploi': 2,
  'France Travail': 2,
  'OPCO': 2,                          // Opérateurs de compétences
  'DIRECCTE': 2,
  'DREETS': 2,                        // Direction régionale de l'économie, de l'emploi, du travail et des solidarités
  'DDT': 2,                           // Direction départementale des territoires
  'DREAL': 2,                         // Direction régionale de l'environnement, de l'aménagement et du logement

  // ===== Local Level (Tier 5: +1) =====
  'Communauté de Communes': 1,
  'Commune': 1,
  'Mairie': 1,
  'Ville': 1,
  'EPCI': 1,                          // Établissement public de coopération intercommunale
  'Syndicat mixte': 1,
  'Pays': 1,                          // Pays (territorial organization)
  'PETR': 1,                          // Pôle d'équilibre territorial et rural
  'GAL': 1,                           // Groupe d'Action Locale (LEADER)
  'LEADER': 1,

  // ===== Innovation & Tech Ecosystem =====
  'French Tech': 3,
  'La French Tech': 3,
  'Pôle de compétitivité': 3,
  'Technopole': 2,
  'Incubateur': 2,
  'Accélérateur': 2,
  'Station F': 2,
};

export function getAgencyBoost(agency: string | undefined): number {
  if (!agency) return 0;
  for (const [pattern, boost] of Object.entries(AGENCY_TIERS)) {
    if (agency.includes(pattern)) return boost;
  }
  return 0;
}
