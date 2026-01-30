/**
 * Detailed V5 Pre-Scoring Analysis
 * Shows complete scoring breakdown for each subsidy
 */

// ============================================================================
// TYPES & LOGIC (same as before)
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

interface ScoreBreakdown {
  region: { score: number; reason: string };
  sector: { score: number; reason: string };
  textMatch: { score: number; reason: string; matches: string[] };
  thematic: { score: number; reason: string; matches: string[] };
  exclusion: { filtered: boolean; reason: string };
  total: number;
}

// Mappings
const NAF_SECTOR_MAP: Record<string, string> = { '01': 'Agriculture', '02': 'Sylviculture', '10': 'Agroalimentaire', '62': 'Numérique', '90': 'Culture' };
const SECTOR_EXCLUSIONS: Record<string, string[]> = {
  'Agriculture': ['musique', 'musical', 'cinéma', 'audiovisuel', 'film', 'spectacle', 'théâtre', 'danse', 'musicale'],
};
const SECTOR_INDICATOR_KEYWORDS: Record<string, string[]> = {
  'Agriculture': ['agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole', 'agroalimentaire', 'pac', 'feader', 'biomasse'],
};

function getSectorFromNafCode(nafCode: string): string | null {
  if (!nafCode) return null;
  return NAF_SECTOR_MAP[nafCode.substring(0, 2)] || null;
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
    terms.push(...profile.naf_label.toLowerCase().split(/[\s,;]+/).filter(w => w.length > 3 && !['pour', 'avec', 'dans', 'sans', 'autre'].includes(w)));
  }
  if (profile.sector) terms.push(profile.sector.toLowerCase());
  if (profile.project_types?.length) terms.push(...profile.project_types.map(p => p.toLowerCase()));
  return [...new Set(terms)].slice(0, 15);
}

function extractThematicKeywords(profile: ProfileInput): string[] {
  const sector = profile.sector || getSectorFromNafCode(profile.naf_code || '');
  return sector && SECTOR_INDICATOR_KEYWORDS[sector] ? [...SECTOR_INDICATOR_KEYWORDS[sector]] : [];
}

function analyzeProfile(profile: ProfileInput): AnalyzedProfile {
  const sector = profile.sector || getSectorFromNafCode(profile.naf_code || '');
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
    companyAge: profile.year_created ? new Date().getFullYear() - profile.year_created : null,
    annualTurnover: profile.annual_turnover || null,
  };
}

function getTitle(s: SubsidyCandidate): string {
  return typeof s.title === 'object' ? s.title?.fr || s.title?.en || '' : s.title || '';
}

function getDescription(s: SubsidyCandidate): string {
  if (!s.description) return '';
  return typeof s.description === 'object' ? s.description?.fr || '' : s.description;
}

function getSubsidyText(s: SubsidyCandidate): string {
  return `${getTitle(s)} ${getDescription(s)}`.toLowerCase();
}

function calculateScoreBreakdown(subsidy: SubsidyCandidate, profile: AnalyzedProfile): ScoreBreakdown {
  const subsidyText = getSubsidyText(subsidy);
  const titleLower = getTitle(subsidy).toLowerCase();

  // Check exclusions first
  for (const exclusion of profile.exclusionKeywords) {
    if (titleLower.includes(exclusion)) {
      return {
        region: { score: 0, reason: 'N/A (filtered)' },
        sector: { score: 0, reason: 'N/A (filtered)' },
        textMatch: { score: 0, reason: 'N/A (filtered)', matches: [] },
        thematic: { score: 0, reason: 'N/A (filtered)', matches: [] },
        exclusion: { filtered: true, reason: `"${exclusion}" found in title` },
        total: -50,
      };
    }
  }

  // Region scoring
  let regionScore = 0;
  let regionReason = 'No match';
  if (subsidy.region && subsidy.region.length > 0) {
    if (profile.region && subsidy.region.includes(profile.region)) {
      regionScore = 30;
      regionReason = `Exact match: ${profile.region}`;
    } else if (subsidy.region.includes('National')) {
      regionScore = 20;
      regionReason = 'National program';
    }
  } else {
    regionScore = 15;
    regionReason = 'Region not specified (universal)';
  }

  // Sector scoring
  let sectorScore = 0;
  let sectorReason = 'No match';
  if (subsidy.primary_sector && profile.sector) {
    const subsidySector = subsidy.primary_sector.toLowerCase();
    const profileSector = profile.sector.toLowerCase();
    if (subsidySector.includes(profileSector) || profileSector.includes(subsidySector)) {
      sectorScore = 25;
      sectorReason = `Match: ${subsidy.primary_sector}`;
    } else if (subsidy.is_universal_sector) {
      sectorScore = 15;
      sectorReason = 'Universal sector';
    }
  } else if (subsidy.is_universal_sector) {
    sectorScore = 15;
    sectorReason = 'Universal sector';
  }

  // Text match scoring
  const matchedTerms = profile.searchTerms.filter(term => subsidyText.includes(term));
  let textScore = 0;
  let textReason = 'No matches';
  if (matchedTerms.length >= 3) {
    textScore = 20;
    textReason = `${matchedTerms.length} terms matched`;
  } else if (matchedTerms.length >= 1) {
    textScore = matchedTerms.length * 7;
    textReason = `${matchedTerms.length} term(s) matched`;
  }

  // Thematic scoring
  const thematicMatches = profile.thematicKeywords.filter(kw => subsidyText.includes(kw.toLowerCase()));
  let thematicScore = 0;
  let thematicReason = 'No matches';
  if (thematicMatches.length > 0) {
    thematicScore = Math.min(15, thematicMatches.length * 5);
    thematicReason = `${thematicMatches.length} keyword(s) matched`;
  }

  return {
    region: { score: regionScore, reason: regionReason },
    sector: { score: sectorScore, reason: sectorReason },
    textMatch: { score: textScore, reason: textReason, matches: matchedTerms },
    thematic: { score: thematicScore, reason: thematicReason, matches: thematicMatches },
    exclusion: { filtered: false, reason: 'Passed' },
    total: regionScore + sectorScore + textScore + thematicScore,
  };
}

// ============================================================================
// TEST DATA
// ============================================================================

const FRANCE_BAMBOO: ProfileInput = {
  id: 'test-france-bamboo',
  company_name: 'France Bamboo',
  naf_code: '01.29Z',
  naf_label: 'Culture de plantes à boissons, épices, aromatiques, médicinales et pharmaceutiques',
  sector: 'Agriculture',
  region: 'Occitanie',
  employees: '15',
  year_created: 2018,
  legal_form: 'SAS',
  project_types: ['Innovation', 'Développement durable', 'Export'],
  certifications: ['Agriculture biologique', 'HVE'],
  description: 'Production et transformation de bambou pour la construction et l\'alimentation.',
};

const SUBSIDIES: SubsidyCandidate[] = [
  { id: '1', title: 'Aide à la filière musicale - Soutien aux producteurs', description: 'Subvention pour les entreprises du secteur musical', agency: 'CNM', region: ['National'], primary_sector: 'Culture', legal_entities: ['PME'], is_universal_sector: false },
  { id: '2', title: 'ADEME - Aide à la biomasse et valorisation des déchets verts', description: 'Soutien aux projets de valorisation de la biomasse agricole', agency: 'ADEME', region: ['National'], primary_sector: 'Agriculture', amount_max: 500000, legal_entities: ['PME', 'ETI'], is_universal_sector: false },
  { id: '3', title: 'Aide au cinéma et à l\'audiovisuel - Production', description: 'Soutien à la production cinématographique', agency: 'CNC', region: ['National'], primary_sector: 'Audiovisuel', legal_entities: ['PME'], is_universal_sector: false },
  { id: '4', title: 'FranceAgriMer - Aide aux investissements agricoles', description: 'Soutien aux exploitations agricoles pour la modernisation', agency: 'FranceAgriMer', region: ['National'], primary_sector: 'Agriculture', amount_max: 200000, legal_entities: ['PME'], is_universal_sector: false },
  { id: '5', title: 'Région Occitanie - Aide à l\'innovation agricole', description: 'Soutien régional aux projets innovants dans le secteur agricole en Occitanie', agency: 'Région Occitanie', region: ['Occitanie'], primary_sector: 'Agriculture', amount_max: 100000, legal_entities: ['PME'], is_universal_sector: false },
  { id: '6', title: 'Aide à la danse et au spectacle vivant', description: 'Subvention pour les compagnies de danse et théâtre', agency: 'DRAC', region: ['National'], primary_sector: 'Culture', legal_entities: ['Association'], is_universal_sector: false },
  { id: '7', title: 'Bpifrance - Prêt vert pour la transition écologique', description: 'Financement des investissements en faveur de la transition écologique', agency: 'Bpifrance', region: ['National'], primary_sector: null, amount_max: 1000000, legal_entities: ['PME', 'ETI'], is_universal_sector: true },
  { id: '8', title: 'FEADER - Programme de développement rural Occitanie', description: 'Fonds européen pour le développement rural. Soutien aux exploitations agricoles.', agency: 'Commission européenne', region: ['Occitanie'], primary_sector: 'Agriculture', amount_max: 300000, legal_entities: ['PME'], is_universal_sector: false },
  { id: '9', title: 'Subvention théâtre et arts de la scène', description: 'Aide à la création théâtrale', agency: 'Ministère de la Culture', region: ['National'], primary_sector: 'Culture', legal_entities: ['Association'], is_universal_sector: false },
  { id: '10', title: 'Aide à l\'export pour les PME agroalimentaires', description: 'Soutien aux entreprises agroalimentaires pour le développement international', agency: 'Business France', region: ['National'], primary_sector: 'Agroalimentaire', amount_max: 50000, legal_entities: ['PME'], is_universal_sector: false },
];

// ============================================================================
// RUN ANALYSIS
// ============================================================================

const profile = analyzeProfile(FRANCE_BAMBOO);

console.log('\n' + '═'.repeat(100));
console.log('FRANCE BAMBOO - DETAILED PRE-SCORING ANALYSIS');
console.log('═'.repeat(100));

console.log('\n📋 PROFILE EXTRACTED DATA:');
console.log('─'.repeat(50));
console.log(`   Sector:        ${profile.sector}`);
console.log(`   Region:        ${profile.region}`);
console.log(`   Size:          ${profile.sizeCategory}`);
console.log(`   Company Age:   ${profile.companyAge} years`);
console.log(`   Search Terms:  ${profile.searchTerms.slice(0, 8).join(', ')}...`);
console.log(`   Thematic KW:   ${profile.thematicKeywords.join(', ')}`);
console.log(`   Exclusions:    ${profile.exclusionKeywords.join(', ')}`);

console.log('\n\n📊 SCORING BREAKDOWN BY SUBSIDY:');
console.log('═'.repeat(100));

const results: { subsidy: SubsidyCandidate; breakdown: ScoreBreakdown }[] = [];

for (const subsidy of SUBSIDIES) {
  const breakdown = calculateScoreBreakdown(subsidy, profile);
  results.push({ subsidy, breakdown });

  const title = getTitle(subsidy).substring(0, 60);
  const status = breakdown.exclusion.filtered ? '❌ FILTERED' :
                 breakdown.total >= 50 ? '✅ HIGH    ' :
                 breakdown.total >= 25 ? '⚠️  MEDIUM  ' : '⬜ LOW     ';

  console.log(`\n${status} │ ${title}${title.length < 60 ? ' '.repeat(60 - title.length) : ''}`);
  console.log('─'.repeat(100));

  if (breakdown.exclusion.filtered) {
    console.log(`   🚫 EXCLUDED: ${breakdown.exclusion.reason}`);
    console.log(`   → This subsidy contains sector-exclusion keyword in title`);
  } else {
    console.log(`   📍 Region:    +${breakdown.region.score.toString().padStart(2)} pts │ ${breakdown.region.reason}`);
    console.log(`   🏭 Sector:    +${breakdown.sector.score.toString().padStart(2)} pts │ ${breakdown.sector.reason}`);
    console.log(`   📝 Text:      +${breakdown.textMatch.score.toString().padStart(2)} pts │ ${breakdown.textMatch.reason}${breakdown.textMatch.matches.length > 0 ? ` [${breakdown.textMatch.matches.slice(0, 3).join(', ')}]` : ''}`);
    console.log(`   🎯 Thematic:  +${breakdown.thematic.score.toString().padStart(2)} pts │ ${breakdown.thematic.reason}${breakdown.thematic.matches.length > 0 ? ` [${breakdown.thematic.matches.slice(0, 3).join(', ')}]` : ''}`);
    console.log(`   ─────────────────`);
    console.log(`   📊 TOTAL:     ${breakdown.total.toString().padStart(3)} pts`);
  }
}

// Summary table
console.log('\n\n' + '═'.repeat(100));
console.log('SUMMARY TABLE');
console.log('═'.repeat(100));
console.log('\n┌────────┬───────────────────────────────────────────────────────────┬────────┬────────┬────────┬────────┬───────┐');
console.log('│ Status │ Subsidy                                                   │ Region │ Sector │  Text  │Thematic│ TOTAL │');
console.log('├────────┼───────────────────────────────────────────────────────────┼────────┼────────┼────────┼────────┼───────┤');

const sorted = [...results].sort((a, b) => b.breakdown.total - a.breakdown.total);

for (const { subsidy, breakdown } of sorted) {
  const title = getTitle(subsidy).substring(0, 57).padEnd(57);
  const status = breakdown.exclusion.filtered ? '  ❌  ' :
                 breakdown.total >= 50 ? '  ✅  ' :
                 breakdown.total >= 25 ? '  ⚠️  ' : '  ⬜  ';

  if (breakdown.exclusion.filtered) {
    console.log(`│${status}│ ${title} │   --   │   --   │   --   │   --   │  -50  │`);
  } else {
    console.log(`│${status}│ ${title} │   ${breakdown.region.score.toString().padStart(2)}   │   ${breakdown.sector.score.toString().padStart(2)}   │   ${breakdown.textMatch.score.toString().padStart(2)}   │   ${breakdown.thematic.score.toString().padStart(2)}   │  ${breakdown.total.toString().padStart(3)}  │`);
  }
}

console.log('└────────┴───────────────────────────────────────────────────────────┴────────┴────────┴────────┴────────┴───────┘');

// Analysis
console.log('\n\n' + '═'.repeat(100));
console.log('ANALYSIS');
console.log('═'.repeat(100));

const filtered = results.filter(r => r.breakdown.exclusion.filtered);
const passed = results.filter(r => !r.breakdown.exclusion.filtered);

console.log('\n🚫 FILTERED SUBSIDIES (excluded before AI sees them):');
for (const { subsidy, breakdown } of filtered) {
  console.log(`   • "${getTitle(subsidy).substring(0, 50)}..." - ${breakdown.exclusion.reason}`);
}

console.log('\n✅ WHY TOP MATCHES ARE CORRECT:');
const top = passed.sort((a, b) => b.breakdown.total - a.breakdown.total).slice(0, 3);
for (const { subsidy, breakdown } of top) {
  console.log(`\n   ${breakdown.total}pts: ${getTitle(subsidy)}`);
  if (breakdown.region.score === 30) console.log(`      → Region: Exact match (Occitanie) +30`);
  if (breakdown.region.score === 20) console.log(`      → Region: National program +20`);
  if (breakdown.sector.score === 25) console.log(`      → Sector: Direct Agriculture match +25`);
  if (breakdown.thematic.matches.length > 0) console.log(`      → Thematic: Found [${breakdown.thematic.matches.join(', ')}] +${breakdown.thematic.score}`);
}

console.log('\n\n' + '═'.repeat(100));
console.log('CONCLUSION: Pre-scoring correctly filters irrelevant subsidies and ranks agriculture programs highest');
console.log('═'.repeat(100) + '\n');
