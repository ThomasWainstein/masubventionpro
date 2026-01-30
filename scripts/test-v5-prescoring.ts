/**
 * Local Test Script for V5 Pre-Scoring Logic
 *
 * Tests the matching logic with France Bamboo profile (Agriculture company)
 * Run with: npx ts-node scripts/test-v5-prescoring.ts
 */

// ============================================================================
// INLINE MATCHING LOGIC (copy from matching.ts for Node.js compatibility)
// ============================================================================

interface ProfileInput {
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
  website_intelligence?: Record<string, any>;
}

interface SubsidyCandidate {
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
  eligibility_criteria?: string | { fr?: string };
  legal_entities?: string[];
  is_universal_sector?: boolean;
}

interface AnalyzedProfile {
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

interface PreScoreResult {
  subsidy: SubsidyCandidate;
  preScore: number;
  hardFiltered: boolean;
  filterReason?: string;
  preReasons: string[];
}

// NAF to Sector mapping
const NAF_SECTOR_MAP: Record<string, string> = {
  '01': 'Agriculture',
  '02': 'Sylviculture',
  '10': 'Agroalimentaire',
  '62': 'Numérique',
  '90': 'Culture',
};

// Sector exclusions
const SECTOR_EXCLUSIONS: Record<string, string[]> = {
  'Agriculture': ['musique', 'musical', 'cinéma', 'audiovisuel', 'film', 'spectacle', 'théâtre', 'danse', 'musicale'],
  'Industrie': ['musique', 'musical', 'spectacle', 'théâtre', 'danse', 'artistique'],
};

// Sector indicator keywords
const SECTOR_INDICATOR_KEYWORDS: Record<string, string[]> = {
  'Agriculture': ['agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole', 'agroalimentaire', 'pac', 'feader', 'biomasse'],
};

function getSectorFromNafCode(nafCode: string): string | null {
  if (!nafCode) return null;
  const prefix = nafCode.substring(0, 2);
  return NAF_SECTOR_MAP[prefix] || null;
}

function getCompanySizeCategory(employees: string | undefined): 'TPE' | 'PME' | 'ETI' | 'GE' {
  const count = parseInt(employees || '0');
  if (count < 10) return 'TPE';
  if (count < 250) return 'PME';
  if (count < 5000) return 'ETI';
  return 'GE';
}

function extractSearchTerms(profile: ProfileInput): string[] {
  const terms: string[] = [];
  if (profile.naf_label) {
    const words = profile.naf_label.toLowerCase()
      .split(/[\s,;]+/)
      .filter(w => w.length > 3 && !['pour', 'avec', 'dans', 'sans', 'autre'].includes(w));
    terms.push(...words);
  }
  if (profile.sector) terms.push(profile.sector.toLowerCase());
  if (profile.project_types?.length) {
    terms.push(...profile.project_types.map(p => p.toLowerCase()));
  }
  return [...new Set(terms)].slice(0, 15);
}

function extractThematicKeywords(profile: ProfileInput): string[] {
  const keywords: string[] = [];
  const sector = profile.sector || getSectorFromNafCode(profile.naf_code || '');
  if (sector && SECTOR_INDICATOR_KEYWORDS[sector]) {
    keywords.push(...SECTOR_INDICATOR_KEYWORDS[sector]);
  }
  return [...new Set(keywords)];
}

function analyzeProfile(profile: ProfileInput): AnalyzedProfile {
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

function getTitle(subsidy: SubsidyCandidate): string {
  if (typeof subsidy.title === 'object') {
    return subsidy.title?.fr || subsidy.title?.en || '';
  }
  return subsidy.title || '';
}

function getDescription(subsidy: SubsidyCandidate): string {
  if (!subsidy.description) return '';
  if (typeof subsidy.description === 'object') {
    return subsidy.description?.fr || '';
  }
  return subsidy.description;
}

function getSubsidyText(subsidy: SubsidyCandidate): string {
  return `${getTitle(subsidy)} ${getDescription(subsidy)}`.toLowerCase();
}

function calculatePreScore(
  subsidy: SubsidyCandidate,
  analyzedProfile: AnalyzedProfile
): PreScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const subsidyText = getSubsidyText(subsidy);

  // HARD FILTERS - Sector exclusions
  for (const exclusion of analyzedProfile.exclusionKeywords) {
    if (subsidyText.includes(exclusion)) {
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

  // SOFT SCORING - Region
  if (subsidy.region && subsidy.region.length > 0) {
    if (analyzedProfile.region && subsidy.region.includes(analyzedProfile.region)) {
      score += 30;
      reasons.push(`Région: ${analyzedProfile.region}`);
    } else if (subsidy.region.includes('National')) {
      score += 20;
      reasons.push('Programme national');
    }
  } else {
    score += 15;
    reasons.push('Région non spécifiée');
  }

  // Sector match
  if (subsidy.primary_sector && analyzedProfile.sector) {
    const subsidySectorLower = subsidy.primary_sector.toLowerCase();
    const profileSectorLower = analyzedProfile.sector.toLowerCase();
    if (subsidySectorLower.includes(profileSectorLower) || profileSectorLower.includes(subsidySectorLower)) {
      score += 25;
      reasons.push(`Secteur: ${subsidy.primary_sector}`);
    } else if (subsidy.is_universal_sector) {
      score += 15;
      reasons.push('Multi-secteurs');
    }
  } else if (subsidy.is_universal_sector) {
    score += 15;
    reasons.push('Secteur universel');
  }

  // Text match
  const matchedTerms = analyzedProfile.searchTerms.filter(term => subsidyText.includes(term));
  if (matchedTerms.length >= 3) {
    score += 20;
    reasons.push(`Mots-clés: ${matchedTerms.slice(0, 3).join(', ')}`);
  } else if (matchedTerms.length >= 1) {
    score += matchedTerms.length * 7;
    reasons.push(`Texte: ${matchedTerms.join(', ')}`);
  }

  // Thematic keywords
  const thematicMatches = analyzedProfile.thematicKeywords.filter(kw => subsidyText.includes(kw.toLowerCase()));
  if (thematicMatches.length > 0) {
    score += Math.min(15, thematicMatches.length * 5);
    reasons.push(`Thématique: ${thematicMatches.slice(0, 2).join(', ')}`);
  }

  return {
    subsidy,
    preScore: Math.min(100, Math.max(-100, score)),
    hardFiltered: false,
    preReasons: reasons,
  };
}

// ============================================================================
// TEST DATA
// ============================================================================

// France Bamboo - Agriculture company in Occitanie
const FRANCE_BAMBOO_PROFILE: ProfileInput = {
  id: 'test-france-bamboo',
  company_name: 'France Bamboo',
  siret: '12345678900001',
  naf_code: '01.29Z', // Culture de plantes à boissons, épices, aromatiques, médicinales
  naf_label: 'Culture de plantes à boissons, épices, aromatiques, médicinales et pharmaceutiques',
  sector: 'Agriculture',
  sub_sector: 'Culture de plantes',
  region: 'Occitanie',
  department: '34', // Hérault
  employees: '15',
  annual_turnover: 500000,
  year_created: 2018,
  legal_form: 'SAS',
  company_category: 'PME',
  project_types: ['Innovation', 'Développement durable', 'Export'],
  certifications: ['Agriculture biologique', 'HVE'],
  description: 'Production et transformation de bambou pour la construction et l\'alimentation. Culture durable et écologique.',
  website_intelligence: {
    companyDescription: 'Producteur de bambou français pour construction écologique',
    businessActivities: ['culture de bambou', 'transformation bois', 'matériaux construction'],
    innovations: { score: 65, indicators: ['matériau innovant', 'procédé breveté'] },
    sustainability: { score: 85, initiatives: ['agriculture bio', 'carbone neutre'] },
    export: { score: 40, markets: ['Espagne', 'Italie'] },
  },
};

// Test subsidies - mix of relevant and irrelevant
const TEST_SUBSIDIES: SubsidyCandidate[] = [
  {
    id: 'sub-1',
    title: 'Aide à la filière musicale - Soutien aux producteurs',
    description: 'Subvention pour les entreprises du secteur musical et de la production phonographique',
    agency: 'CNM',
    region: ['National'],
    primary_sector: 'Culture',
    keywords: ['musique', 'phonographique', 'spectacle'],
    legal_entities: ['PME', 'TPE'],
    is_universal_sector: false,
  },
  {
    id: 'sub-2',
    title: 'ADEME - Aide à la biomasse et valorisation des déchets verts',
    description: 'Soutien aux projets de valorisation de la biomasse agricole et forestière pour la production d\'énergie',
    agency: 'ADEME',
    region: ['National'],
    primary_sector: 'Agriculture',
    keywords: ['biomasse', 'énergie', 'agriculture', 'environnement'],
    amount_max: 500000,
    legal_entities: ['PME', 'ETI', 'GE'],
    is_universal_sector: false,
  },
  {
    id: 'sub-3',
    title: 'Aide au cinéma et à l\'audiovisuel - Production',
    description: 'Soutien à la production cinématographique et audiovisuelle française',
    agency: 'CNC',
    region: ['National'],
    primary_sector: 'Audiovisuel',
    keywords: ['cinéma', 'film', 'audiovisuel'],
    legal_entities: ['PME', 'TPE'],
    is_universal_sector: false,
  },
  {
    id: 'sub-4',
    title: 'FranceAgriMer - Aide aux investissements agricoles',
    description: 'Soutien aux exploitations agricoles pour la modernisation des équipements et des pratiques culturales',
    agency: 'FranceAgriMer',
    region: ['National'],
    primary_sector: 'Agriculture',
    keywords: ['agriculture', 'exploitation', 'investissement'],
    amount_max: 200000,
    legal_entities: ['PME', 'TPE'],
    is_universal_sector: false,
  },
  {
    id: 'sub-5',
    title: 'Région Occitanie - Aide à l\'innovation agricole',
    description: 'Soutien régional aux projets innovants dans le secteur agricole et agroalimentaire en Occitanie',
    agency: 'Région Occitanie',
    region: ['Occitanie'],
    primary_sector: 'Agriculture',
    keywords: ['innovation', 'agriculture', 'agroalimentaire'],
    amount_max: 100000,
    legal_entities: ['PME', 'TPE'],
    is_universal_sector: false,
  },
  {
    id: 'sub-6',
    title: 'Aide à la danse et au spectacle vivant',
    description: 'Subvention pour les compagnies de danse et de théâtre',
    agency: 'DRAC',
    region: ['National'],
    primary_sector: 'Culture',
    keywords: ['danse', 'spectacle', 'théâtre'],
    legal_entities: ['Association', 'PME'],
    is_universal_sector: false,
  },
  {
    id: 'sub-7',
    title: 'Bpifrance - Prêt vert pour la transition écologique',
    description: 'Financement des investissements en faveur de la transition écologique des entreprises',
    agency: 'Bpifrance',
    region: ['National'],
    primary_sector: null, // Universal
    keywords: ['transition écologique', 'environnement', 'développement durable'],
    amount_max: 1000000,
    legal_entities: ['PME', 'ETI'],
    is_universal_sector: true,
  },
  {
    id: 'sub-8',
    title: 'Aide à l\'export pour les PME agroalimentaires',
    description: 'Soutien aux entreprises agroalimentaires pour le développement à l\'international',
    agency: 'Business France',
    region: ['National'],
    primary_sector: 'Agroalimentaire',
    keywords: ['export', 'international', 'agroalimentaire'],
    amount_max: 50000,
    legal_entities: ['PME'],
    is_universal_sector: false,
  },
  {
    id: 'sub-9',
    title: 'Subvention théâtre et arts de la scène',
    description: 'Aide à la création théâtrale et aux arts de la scène',
    agency: 'Ministère de la Culture',
    region: ['National'],
    primary_sector: 'Culture',
    keywords: ['théâtre', 'scène', 'spectacle'],
    legal_entities: ['Association'],
    is_universal_sector: false,
  },
  {
    id: 'sub-10',
    title: 'FEADER - Programme de développement rural Occitanie',
    description: 'Fonds européen pour le développement rural en région Occitanie. Soutien aux exploitations agricoles.',
    agency: 'Commission européenne',
    region: ['Occitanie'],
    primary_sector: 'Agriculture',
    keywords: ['feader', 'rural', 'agriculture', 'développement'],
    amount_max: 300000,
    legal_entities: ['PME', 'TPE', 'Exploitation agricole'],
    is_universal_sector: false,
  },
];

// ============================================================================
// RUN TEST
// ============================================================================

console.log('='.repeat(80));
console.log('V5 PRE-SCORING TEST - France Bamboo (Agriculture, Occitanie)');
console.log('='.repeat(80));
console.log();

// Analyze profile
const analyzedProfile = analyzeProfile(FRANCE_BAMBOO_PROFILE);

console.log('PROFILE ANALYSIS:');
console.log(`  Sector: ${analyzedProfile.sector}`);
console.log(`  Size: ${analyzedProfile.sizeCategory}`);
console.log(`  Region: ${analyzedProfile.region}`);
console.log(`  Search terms: ${analyzedProfile.searchTerms.join(', ')}`);
console.log(`  Thematic keywords: ${analyzedProfile.thematicKeywords.join(', ')}`);
console.log(`  Exclusion keywords: ${analyzedProfile.exclusionKeywords.join(', ')}`);
console.log();

// Score each subsidy
console.log('PRE-SCORING RESULTS:');
console.log('-'.repeat(80));

const results: PreScoreResult[] = [];

for (const subsidy of TEST_SUBSIDIES) {
  const result = calculatePreScore(subsidy, analyzedProfile);
  results.push(result);

  const status = result.hardFiltered ? '❌ FILTERED' :
                 result.preScore >= 50 ? '✅ HIGH' :
                 result.preScore >= 25 ? '⚠️  MEDIUM' : '⬜ LOW';

  console.log(`${status} | Score: ${result.preScore.toString().padStart(3)} | ${getTitle(subsidy).substring(0, 50)}`);

  if (result.hardFiltered) {
    console.log(`         | Reason: ${result.filterReason}`);
  } else {
    console.log(`         | Reasons: ${result.preReasons.join(', ')}`);
  }
  console.log();
}

// Summary
console.log('='.repeat(80));
console.log('SUMMARY:');
console.log('-'.repeat(80));

const filtered = results.filter(r => r.hardFiltered);
const passed = results.filter(r => !r.hardFiltered);
const high = passed.filter(r => r.preScore >= 50);
const medium = passed.filter(r => r.preScore >= 25 && r.preScore < 50);
const low = passed.filter(r => r.preScore < 25);

console.log(`Total subsidies tested: ${results.length}`);
console.log(`❌ Filtered (irrelevant): ${filtered.length}`);
console.log(`✅ High score (≥50): ${high.length}`);
console.log(`⚠️  Medium score (25-49): ${medium.length}`);
console.log(`⬜ Low score (<25): ${low.length}`);
console.log();

console.log('FILTERED SUBSIDIES (should be Culture/Music/Cinema):');
for (const r of filtered) {
  console.log(`  - ${getTitle(r.subsidy)} [${r.filterReason}]`);
}
console.log();

console.log('TOP MATCHES (should be Agriculture/Occitanie):');
const sorted = passed.sort((a, b) => b.preScore - a.preScore);
for (const r of sorted.slice(0, 5)) {
  console.log(`  ${r.preScore}pts: ${getTitle(r.subsidy)}`);
}

console.log();
console.log('='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
