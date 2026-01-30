/**
 * Local V5 AI Scoring Simulation
 *
 * Simulates the full pipeline locally without calling Mistral API:
 * 1. Profile Analysis
 * 2. Pre-scoring
 * 3. Simulated AI refinement (using heuristics)
 * 4. Final ranking with amount/agency boosts
 */

import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
};

// ============================================================================
// TYPES
// ============================================================================

interface ProfileInput {
  id: string;
  company_name: string;
  naf_code?: string;
  sector?: string;
  region?: string;
  employees?: string;
  description?: string;
}

interface AnalyzedProfile {
  name: string;
  sector: string;
  sizeCategory: string;
  region: string;
  searchTerms: string[];
  thematicKeywords: string[];
  exclusionKeywords: string[];
}

interface SubsidyCandidate {
  id: string;
  title: any;
  description: any;
  region: string[] | null;
  primary_sector: string | null;
  is_universal_sector: boolean | null;
  amount_max: number | null;
  agency?: string;
  keywords?: string[];
  eligibility_criteria?: any;
}

interface ScoredMatch {
  subsidy: SubsidyCandidate;
  preScore: number;
  aiAdjustment: number;
  finalScore: number;
  reasons: string[];
}

// ============================================================================
// NAF CODE MAPPING
// ============================================================================

const NAF_SECTOR_MAP: Record<string, { sector: string; keywords: string[]; thematic: string[]; exclusions: string[] }> = {
  '01': { sector: 'Agriculture', keywords: ['agricole', 'agriculture', 'exploitation', 'culture', 'élevage', 'ferme'], thematic: ['pac', 'feader', 'rural', 'agroalimentaire', 'bio', 'biologique'], exclusions: ['musique', 'cinéma', 'spectacle', 'film', 'théâtre'] },
  '03': { sector: 'Pêche', keywords: ['pêche', 'aquaculture', 'maritime', 'poisson'], thematic: ['mer', 'océan', 'feamp', 'littoral'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '10': { sector: 'Agroalimentaire', keywords: ['agroalimentaire', 'alimentaire', 'transformation', 'food'], thematic: ['industrie', 'production', 'qualité'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '11': { sector: 'Boissons', keywords: ['boisson', 'vin', 'brasserie', 'viticulture'], thematic: ['alcool', 'vignoble', 'terroir'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '13': { sector: 'Textile', keywords: ['textile', 'confection', 'tissu', 'vêtement', 'mode'], thematic: ['habillement', 'fashion', 'industrie'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '25': { sector: 'Métallurgie', keywords: ['métallurgie', 'métal', 'acier', 'fonderie'], thematic: ['industrie', 'transformation', 'usinage'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '41': { sector: 'BTP', keywords: ['construction', 'bâtiment', 'btp', 'travaux', 'rénovation'], thematic: ['immobilier', 'chantier', 'génie civil'], exclusions: ['musique', 'cinéma', 'spectacle', 'film'] },
  '47': { sector: 'Commerce', keywords: ['commerce', 'vente', 'retail', 'distribution', 'magasin'], thematic: ['détail', 'négoce', 'client'], exclusions: ['musique', 'cinéma', 'film'] },
  '49': { sector: 'Transport', keywords: ['transport', 'logistique', 'mobilité', 'fret', 'livraison'], thematic: ['routier', 'marchandises', 'flotte'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '62': { sector: 'Numérique', keywords: ['numérique', 'digital', 'logiciel', 'informatique', 'tech', 'startup'], thematic: ['innovation', 'développement', 'saas', 'cloud'], exclusions: ['agricole', 'élevage'] },
  '70': { sector: 'Conseil', keywords: ['conseil', 'consulting', 'expertise', 'services', 'accompagnement'], thematic: ['stratégie', 'management', 'audit'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '72': { sector: 'R&D', keywords: ['recherche', 'développement', 'r&d', 'innovation', 'laboratoire'], thematic: ['scientifique', 'brevet', 'technologie'], exclusions: ['musique', 'cinéma', 'spectacle'] },
};

// ============================================================================
// PROFILE ANALYSIS
// ============================================================================

function analyzeProfile(raw: any): AnalyzedProfile {
  const data = raw.profile_data || {};
  const nafCode = (data.naf_code || data.nafCode || '').substring(0, 2);
  const mapping = NAF_SECTOR_MAP[nafCode] || { sector: 'Services', keywords: ['entreprise', 'services'], thematic: ['développement', 'croissance'], exclusions: ['musique', 'spectacle', 'cinéma'] };

  const name = raw.profile_name || data.companyName || data.company_name || 'Unknown';
  const region = data.region || 'National';
  const sector = data.sector || mapping.sector;

  // Build search terms
  const searchTerms = [...mapping.keywords];
  if (data.description) {
    const stopWords = ['pour', 'avec', 'dans', 'basée', 'secteur', 'business', 'activity', 'entreprise', 'société'];
    const descWords = data.description.toLowerCase()
      .split(/[\s,;.!?()-]+/)
      .filter((w: string) => w.length > 4 && !stopWords.includes(w))
      .slice(0, 8);
    searchTerms.push(...descWords);
  }

  // Build thematic keywords
  const thematicKeywords = [...mapping.keywords, ...mapping.thematic];
  thematicKeywords.push('développement', 'investissement', 'croissance', 'emploi', 'innovation', 'transition', 'écologique');

  return {
    name,
    sector,
    sizeCategory: 'PME',
    region,
    searchTerms: [...new Set(searchTerms)],
    thematicKeywords: [...new Set(thematicKeywords)],
    exclusionKeywords: mapping.exclusions,
  };
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function getTitle(s: SubsidyCandidate): string {
  if (!s.title) return '';
  if (typeof s.title === 'object') return s.title?.fr || s.title?.en || '';
  return s.title;
}

function getDescription(s: SubsidyCandidate): string {
  if (!s.description) return '';
  if (typeof s.description === 'object') return s.description?.fr || '';
  return s.description;
}

function calculatePreScore(subsidy: SubsidyCandidate, profile: AnalyzedProfile): { score: number; filtered: boolean; reasons: string[] } {
  const subsidyText = `${getTitle(subsidy)} ${getDescription(subsidy)}`.toLowerCase();
  const titleLower = getTitle(subsidy).toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Check exclusions
  for (const exclusion of profile.exclusionKeywords) {
    if (titleLower.includes(exclusion)) {
      return { score: -50, filtered: true, reasons: [`Excluded: ${exclusion}`] };
    }
  }

  // Region scoring
  const regions = subsidy.region || [];
  if (regions.includes(profile.region)) {
    score += 30;
    reasons.push(`Region: ${profile.region}`);
  } else if (regions.includes('National')) {
    score += 25;
    reasons.push('National');
  } else if (regions.length === 0) {
    score += 20;
    reasons.push('Any region');
  }

  // Sector scoring
  if (subsidy.primary_sector) {
    const subsidySector = subsidy.primary_sector.toLowerCase();
    const profileSector = profile.sector.toLowerCase();
    if (subsidySector.includes(profileSector) || profileSector.includes(subsidySector)) {
      score += 25;
      reasons.push(`Sector: ${subsidy.primary_sector}`);
    } else if (subsidy.is_universal_sector) {
      score += 15;
      reasons.push('Universal sector');
    }
  } else if (subsidy.is_universal_sector) {
    score += 15;
    reasons.push('Universal sector');
  } else {
    score += 10;
    reasons.push('No sector specified');
  }

  // Text match
  const matchedTerms = profile.searchTerms.filter(term => subsidyText.includes(term));
  if (matchedTerms.length >= 5) {
    score += 25;
    reasons.push(`Text: ${matchedTerms.length} matches`);
  } else if (matchedTerms.length >= 3) {
    score += 20;
    reasons.push(`Text: ${matchedTerms.length} matches`);
  } else if (matchedTerms.length >= 1) {
    score += matchedTerms.length * 7;
    reasons.push(`Text: ${matchedTerms.slice(0, 2).join(', ')}`);
  }

  // Thematic keywords
  const thematicMatches = profile.thematicKeywords.filter(kw => subsidyText.includes(kw.toLowerCase()));
  if (thematicMatches.length > 0) {
    score += Math.min(15, thematicMatches.length * 5);
    reasons.push(`Thematic: ${thematicMatches.length} matches`);
  }

  return { score: Math.min(100, score), filtered: false, reasons };
}

function simulateAiAdjustment(subsidy: SubsidyCandidate, profile: AnalyzedProfile, preScore: number): number {
  /**
   * Simulates AI refinement by applying heuristics that the LLM would use:
   * - Exact sector match: +10
   * - Company size match: +5
   * - Eligibility criteria alignment: +5 to -10
   * - Amount appropriateness: +5 to -5
   */
  let adjustment = 0;
  const subsidyText = `${getTitle(subsidy)} ${getDescription(subsidy)}`.toLowerCase();

  // Exact sector alignment
  const sectorMatches = ['agriculture', 'numérique', 'industrie', 'transport', 'commerce', 'btp', 'textile', 'conseil'];
  for (const sm of sectorMatches) {
    if (profile.sector.toLowerCase().includes(sm) && subsidyText.includes(sm)) {
      adjustment += 8;
      break;
    }
  }

  // PME-specific subsidies
  if (subsidyText.includes('pme') || subsidyText.includes('tpe')) {
    if (profile.sizeCategory === 'PME' || profile.sizeCategory === 'TPE') {
      adjustment += 5;
    }
  }

  // Startup-specific
  if (subsidyText.includes('startup') || subsidyText.includes('jeune entreprise')) {
    if (profile.sector.toLowerCase().includes('numérique') || profile.sector.toLowerCase().includes('tech')) {
      adjustment += 5;
    } else {
      adjustment -= 3;
    }
  }

  // Innovation keywords
  if (subsidyText.includes('innovation') || subsidyText.includes('r&d')) {
    if (profile.thematicKeywords.some(k => k.includes('innovation') || k.includes('recherche'))) {
      adjustment += 5;
    }
  }

  // Environmental/sustainability
  if (subsidyText.includes('écologique') || subsidyText.includes('transition') || subsidyText.includes('vert')) {
    adjustment += 3; // Most companies can benefit
  }

  // Clamp adjustment
  return Math.max(-15, Math.min(15, adjustment));
}

function applyFinalBoosts(subsidy: SubsidyCandidate, profile: AnalyzedProfile, score: number): { finalScore: number; boostReasons: string[] } {
  let finalScore = score;
  const boostReasons: string[] = [];

  // Amount boost (sector-aware)
  const amount = subsidy.amount_max;
  if (amount) {
    // Check sector relevance first
    const subsidyText = `${getTitle(subsidy)} ${getDescription(subsidy)}`.toLowerCase();
    const hasSectorRelevance = subsidy.is_universal_sector ||
      profile.thematicKeywords.some(kw => subsidyText.includes(kw.toLowerCase()));

    if (hasSectorRelevance) {
      if (amount >= 10000000) {
        finalScore += 12;
        boostReasons.push(`Amount: ${(amount / 1000000).toFixed(0)}M€ (+12)`);
      } else if (amount >= 1000000) {
        finalScore += 8;
        boostReasons.push(`Amount: ${(amount / 1000000).toFixed(1)}M€ (+8)`);
      } else if (amount >= 500000) {
        finalScore += 5;
        boostReasons.push(`Amount: ${(amount / 1000).toFixed(0)}k€ (+5)`);
      } else if (amount >= 100000) {
        finalScore += 3;
      }
    }
  }

  // Agency boost
  const agency = subsidy.agency || '';
  if (agency.includes('Bpifrance') || agency.includes('France 2030')) {
    finalScore += 5;
    boostReasons.push('Strategic program (+5)');
  } else if (agency.includes('ADEME') || agency.includes('Commission européenne')) {
    finalScore += 5;
    boostReasons.push('Key agency (+5)');
  }

  return { finalScore: Math.min(100, finalScore), boostReasons };
}

// ============================================================================
// MAIN TEST
// ============================================================================

async function runQuery(query: string): Promise<any[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${CONFIG.SUPABASE_PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  return response.json();
}

async function main() {
  console.log('═'.repeat(100));
  console.log('LOCAL V5 AI SCORING SIMULATION');
  console.log('═'.repeat(100));
  console.log('\nSimulates full pipeline: Pre-scoring → AI adjustment → Final boosts\n');

  // Get diverse profiles
  const profileQuery = `
    SELECT id, profile_name, profile_data, completion_percentage
    FROM applicant_profiles
    WHERE profile_data IS NOT NULL
      AND completion_percentage >= 60
    ORDER BY completion_percentage DESC
    LIMIT 8
  `;

  const rawProfiles = await runQuery(profileQuery);
  if (!Array.isArray(rawProfiles)) {
    console.log('Error fetching profiles:', rawProfiles);
    return;
  }

  // Get subsidies
  const subsidyQuery = `
    SELECT id, title, description, region, primary_sector, is_universal_sector, amount_max, agency, keywords
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    LIMIT 7000
  `;

  const subsidies = await runQuery(subsidyQuery);
  if (!Array.isArray(subsidies)) {
    console.log('Error fetching subsidies:', subsidies);
    return;
  }

  console.log(`Loaded ${rawProfiles.length} profiles and ${subsidies.length} subsidies\n`);

  // Test each profile
  for (const rawProfile of rawProfiles) {
    const profile = analyzeProfile(rawProfile);

    console.log('─'.repeat(100));
    console.log(`\n📊 ${profile.name}`);
    console.log(`   Sector: ${profile.sector} | Region: ${profile.region}`);
    console.log(`   Keywords: ${profile.searchTerms.slice(0, 5).join(', ')}...`);

    // Score all subsidies
    const scored: ScoredMatch[] = [];
    let filtered = 0;

    for (const subsidy of subsidies) {
      const preResult = calculatePreScore(subsidy, profile);

      if (preResult.filtered) {
        filtered++;
        continue;
      }

      // Simulate AI adjustment
      const aiAdjustment = simulateAiAdjustment(subsidy, profile, preResult.score);
      const adjustedScore = Math.min(100, Math.max(0, preResult.score + aiAdjustment));

      // Apply final boosts
      const { finalScore, boostReasons } = applyFinalBoosts(subsidy, profile, adjustedScore);

      const allReasons = [...preResult.reasons];
      if (aiAdjustment !== 0) {
        allReasons.push(`AI: ${aiAdjustment > 0 ? '+' : ''}${aiAdjustment}`);
      }
      allReasons.push(...boostReasons);

      scored.push({
        subsidy,
        preScore: preResult.score,
        aiAdjustment,
        finalScore,
        reasons: allReasons,
      });
    }

    // Sort and get top matches
    scored.sort((a, b) => b.finalScore - a.finalScore);
    const top15 = scored.slice(0, 15);

    // Stats
    const highScore = scored.filter(s => s.finalScore >= 50).length;
    const mediumScore = scored.filter(s => s.finalScore >= 25 && s.finalScore < 50).length;

    console.log(`\n   Results:`);
    console.log(`   ├── Filtered: ${filtered} (${(filtered / subsidies.length * 100).toFixed(1)}%)`);
    console.log(`   ├── HIGH (≥50): ${highScore}`);
    console.log(`   ├── MEDIUM (25-49): ${mediumScore}`);
    console.log(`   └── Average AI adjustment: ${(scored.reduce((a, b) => a + b.aiAdjustment, 0) / scored.length).toFixed(1)}`);

    console.log(`\n   Top 15 Matches (Pre → AI → Final):`);
    for (let i = 0; i < top15.length; i++) {
      const m = top15[i];
      const title = getTitle(m.subsidy).substring(0, 45);
      const amount = m.subsidy.amount_max ? `${(m.subsidy.amount_max / 1000).toFixed(0)}k€` : 'N/A';
      const aiStr = m.aiAdjustment >= 0 ? `+${m.aiAdjustment}` : `${m.aiAdjustment}`;
      console.log(`   ${(i + 1).toString().padStart(2)}. ${m.preScore.toString().padStart(2)}→${aiStr.padStart(3)}→${m.finalScore.toString().padStart(2)} │ ${title.padEnd(45)} │ ${amount.padStart(8)}`);
    }
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
