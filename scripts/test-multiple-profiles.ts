/**
 * Test V5 Pre-Scoring with Multiple Profiles
 *
 * Tests the pre-scoring algorithm against diverse company profiles
 * to validate it works across different sectors and regions.
 */

import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
};

// ============================================================================
// TYPES
// ============================================================================

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
}

// ============================================================================
// NAF CODE TO SECTOR & KEYWORDS MAPPING
// ============================================================================

const NAF_SECTOR_MAP: Record<string, { sector: string; keywords: string[]; exclusions: string[] }> = {
  '01': { sector: 'Agriculture', keywords: ['agricole', 'agriculture', 'exploitation', 'culture', 'élevage', 'pac', 'feader', 'rural'], exclusions: ['musique', 'cinéma', 'spectacle', 'film'] },
  '03': { sector: 'Pêche', keywords: ['pêche', 'aquaculture', 'maritime', 'mer', 'poisson'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '10': { sector: 'Agroalimentaire', keywords: ['agroalimentaire', 'alimentaire', 'transformation', 'produit', 'food'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '11': { sector: 'Boissons', keywords: ['boisson', 'vin', 'brasserie', 'viticulture'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '13': { sector: 'Textile', keywords: ['textile', 'confection', 'tissu', 'vêtement', 'mode'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '41': { sector: 'BTP', keywords: ['construction', 'bâtiment', 'btp', 'travaux', 'rénovation'], exclusions: ['musique', 'cinéma', 'spectacle', 'film'] },
  '47': { sector: 'Commerce', keywords: ['commerce', 'vente', 'retail', 'distribution', 'magasin'], exclusions: ['musique', 'cinéma', 'film'] },
  '49': { sector: 'Transport', keywords: ['transport', 'logistique', 'mobilité', 'fret', 'livraison'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '62': { sector: 'Numérique', keywords: ['numérique', 'digital', 'logiciel', 'informatique', 'tech', 'startup', 'innovation'], exclusions: ['agricole', 'élevage'] },
  '70': { sector: 'Conseil', keywords: ['conseil', 'consulting', 'expertise', 'services', 'accompagnement'], exclusions: ['musique', 'cinéma', 'spectacle'] },
  '74': { sector: 'Services', keywords: ['services', 'prestation', 'entreprise'], exclusions: ['musique', 'cinéma', 'spectacle'] },
};

// ============================================================================
// PROFILE BUILDING
// ============================================================================

function buildAnalyzedProfile(rawProfile: any): AnalyzedProfile {
  const data = rawProfile.profile_data || {};
  const nafCode = (data.naf_code || data.nafCode || '').substring(0, 2);
  const nafMapping = NAF_SECTOR_MAP[nafCode] || { sector: 'Services', keywords: ['entreprise'], exclusions: ['musique', 'spectacle', 'cinéma'] };

  const name = rawProfile.profile_name || data.companyName || data.company_name || 'Unknown';
  const region = data.region || 'National';
  const sector = data.sector || nafMapping.sector;

  // Build search terms from description
  const searchTerms = [...nafMapping.keywords];
  if (data.description) {
    const stopWords = ['pour', 'avec', 'dans', 'basée', 'secteur', 'business', 'activity', 'entreprise'];
    const descWords = data.description.toLowerCase()
      .split(/[\s,;.!?()-]+/)
      .filter((w: string) => w.length > 4 && !stopWords.includes(w))
      .slice(0, 10);
    searchTerms.push(...descWords);
  }

  // Build thematic keywords
  const thematicKeywords = [...nafMapping.keywords];

  // Add region-based keywords
  const regionKeywords: Record<string, string[]> = {
    'Île-de-France': ['paris', 'ile-de-france', 'grand paris'],
    'Bretagne': ['bretagne', 'breton', 'maritime', 'mer'],
    'Normandie': ['normandie', 'normand'],
    'Occitanie': ['occitanie', 'sud', 'méditerranée'],
    'Auvergne-Rhône-Alpes': ['auvergne', 'rhône', 'alpes', 'montagne'],
    'Nouvelle-Aquitaine': ['aquitaine', 'bordeaux', 'sud-ouest'],
    'Hauts-de-France': ['hauts-de-france', 'nord'],
    'Grand Est': ['grand est', 'alsace', 'lorraine'],
    'Bourgogne-Franche-Comté': ['bourgogne', 'franche-comté'],
  };
  if (regionKeywords[region]) {
    thematicKeywords.push(...regionKeywords[region]);
  }

  // Add universal business keywords
  thematicKeywords.push('développement', 'investissement', 'croissance', 'emploi', 'innovation');

  return {
    name,
    sector,
    sizeCategory: 'PME',
    region,
    searchTerms: [...new Set(searchTerms)],
    thematicKeywords: [...new Set(thematicKeywords)],
    exclusionKeywords: nafMapping.exclusions,
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

function calculatePreScore(subsidy: SubsidyCandidate, profile: AnalyzedProfile): { score: number; filtered: boolean; filterReason?: string; reasons: string[] } {
  const subsidyText = `${getTitle(subsidy)} ${getDescription(subsidy)}`.toLowerCase();
  const titleLower = getTitle(subsidy).toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Check exclusions
  for (const exclusion of profile.exclusionKeywords) {
    if (titleLower.includes(exclusion)) {
      return { score: -50, filtered: true, filterReason: `"${exclusion}" in title`, reasons: [] };
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
    reasons.push(`Thematic: ${thematicMatches.slice(0, 2).join(', ')}`);
  }

  // Amount boost
  const amount = subsidy.amount_max;
  if (amount) {
    if (amount >= 10000000) {
      score += 12;
      reasons.push(`Amount: ${(amount / 1000000).toFixed(0)}M€`);
    } else if (amount >= 1000000) {
      score += 8;
      reasons.push(`Amount: ${(amount / 1000000).toFixed(1)}M€`);
    } else if (amount >= 500000) {
      score += 5;
    } else if (amount >= 100000) {
      score += 3;
    }
  }

  return { score: Math.min(100, score), filtered: false, reasons };
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
  console.log('V5 PRE-SCORING TEST: MULTIPLE PROFILES');
  console.log('═'.repeat(100));

  // Get diverse profiles
  const profileQuery = `
    SELECT id, profile_name, profile_data, completion_percentage
    FROM applicant_profiles
    WHERE profile_data IS NOT NULL
      AND completion_percentage >= 60
    ORDER BY completion_percentage DESC
    LIMIT 10
  `;

  const rawProfiles = await runQuery(profileQuery);
  if (!Array.isArray(rawProfiles)) {
    console.log('Error fetching profiles:', rawProfiles);
    return;
  }

  // Get subsidies
  const subsidyQuery = `
    SELECT id, title, description, region, primary_sector, is_universal_sector, amount_max
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    LIMIT 7000
  `;

  const subsidies = await runQuery(subsidyQuery);
  if (!Array.isArray(subsidies)) {
    console.log('Error fetching subsidies:', subsidies);
    return;
  }

  console.log(`\nLoaded ${rawProfiles.length} profiles and ${subsidies.length} subsidies\n`);

  // Test each profile
  for (const rawProfile of rawProfiles) {
    const profile = buildAnalyzedProfile(rawProfile);

    console.log('─'.repeat(100));
    console.log(`\n📊 ${profile.name}`);
    console.log(`   Sector: ${profile.sector} | Region: ${profile.region}`);
    console.log(`   Keywords: ${profile.searchTerms.slice(0, 5).join(', ')}...`);

    // Score all subsidies
    let filtered = 0;
    let highScore = 0;
    let mediumScore = 0;
    let lowScore = 0;

    const scored: { subsidy: SubsidyCandidate; score: number; reasons: string[] }[] = [];

    for (const subsidy of subsidies) {
      const result = calculatePreScore(subsidy, profile);

      if (result.filtered) {
        filtered++;
      } else if (result.score >= 50) {
        highScore++;
        scored.push({ subsidy, score: result.score, reasons: result.reasons });
      } else if (result.score >= 25) {
        mediumScore++;
      } else {
        lowScore++;
      }
    }

    // Sort and get top 10
    scored.sort((a, b) => b.score - a.score);
    const top10 = scored.slice(0, 10);

    console.log(`\n   Results:`);
    console.log(`   ├── Filtered: ${filtered} (${(filtered / subsidies.length * 100).toFixed(1)}%)`);
    console.log(`   ├── HIGH (≥50): ${highScore}`);
    console.log(`   ├── MEDIUM (25-49): ${mediumScore}`);
    console.log(`   └── LOW (<25): ${lowScore}`);

    console.log(`\n   Top 10 Matches:`);
    for (let i = 0; i < top10.length; i++) {
      const { subsidy, score, reasons } = top10[i];
      const title = getTitle(subsidy).substring(0, 50);
      const amount = subsidy.amount_max ? `${(subsidy.amount_max / 1000).toFixed(0)}k€` : 'N/A';
      console.log(`   ${(i + 1).toString().padStart(2)}. ${score.toString().padStart(2)}pts │ ${title.padEnd(50)} │ ${amount.padStart(8)}`);
    }

    // Check sector relevance of top matches
    const sectorRelevant = top10.filter(m => {
      const sector = m.subsidy.primary_sector?.toLowerCase() || '';
      const text = `${getTitle(m.subsidy)} ${getDescription(m.subsidy)}`.toLowerCase();
      return sector.includes(profile.sector.toLowerCase()) ||
             profile.searchTerms.some(t => text.includes(t));
    }).length;

    console.log(`\n   Quality: ${sectorRelevant}/10 top matches are sector-relevant`);
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
