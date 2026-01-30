/**
 * REAL DATA TEST: V5 Pre-Scoring against actual Supabase subsidies
 *
 * Run with: npx tsx scripts/test-v5-real-data.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// SUPABASE CONNECTION (using Management API)
// ============================================================================

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || 'sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4',
};

async function runQuery(sql: string): Promise<any[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${CONFIG.SUPABASE_PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

// ============================================================================
// TYPES
// ============================================================================

interface SubsidyCandidate {
  id: string;
  title: string;
  description: string | null;
  agency?: string;
  region?: string[];
  categories?: string[];
  primary_sector?: string;
  keywords?: string[];
  amount_min?: number;
  amount_max?: number;
  eligibility_criteria?: string;
  legal_entities?: string[];
  is_universal_sector?: boolean;
}

interface AnalyzedProfile {
  sector: string | null;
  sizeCategory: 'TPE' | 'PME' | 'ETI' | 'GE';
  searchTerms: string[];
  thematicKeywords: string[];
  exclusionKeywords: string[];
  region: string | null;
}

// ============================================================================
// MATCHING LOGIC
// ============================================================================

const SECTOR_EXCLUSIONS: Record<string, string[]> = {
  'Agriculture': ['musique', 'musical', 'cinéma', 'audiovisuel', 'film', 'spectacle', 'théâtre', 'danse', 'musicale', 'phonographique', 'disque', 'concert', 'opéra', 'orchestre'],
};

const SECTOR_INDICATOR_KEYWORDS: Record<string, string[]> = {
  'Agriculture': ['agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole', 'agroalimentaire', 'pac', 'feader', 'biomasse', 'rural', 'ferme', 'paysan'],
};

function getTitle(s: SubsidyCandidate): string {
  if (!s.title) return '';
  if (typeof s.title === 'object') return (s.title as any)?.fr || (s.title as any)?.en || '';
  return s.title;
}

function getDescription(s: SubsidyCandidate): string {
  if (!s.description) return '';
  if (typeof s.description === 'object') return (s.description as any)?.fr || '';
  return s.description;
}

function getSubsidyText(s: SubsidyCandidate): string {
  return `${getTitle(s)} ${getDescription(s)}`.toLowerCase();
}

function calculatePreScore(subsidy: SubsidyCandidate, profile: AnalyzedProfile): { score: number; filtered: boolean; filterReason?: string; reasons: string[] } {
  const subsidyText = getSubsidyText(subsidy);
  const titleLower = getTitle(subsidy).toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Check exclusions
  for (const exclusion of profile.exclusionKeywords) {
    if (titleLower.includes(exclusion)) {
      return { score: -50, filtered: true, filterReason: `"${exclusion}" in title`, reasons: [] };
    }
  }

  // === IMPROVED Region scoring ===
  // National programs now score closer to regional (was +20, now +25)
  if (subsidy.region && subsidy.region.length > 0) {
    if (profile.region && subsidy.region.includes(profile.region)) {
      score += 30;
      reasons.push(`Region: ${profile.region}`);
    } else if (subsidy.region.includes('National')) {
      score += 25;  // IMPROVED: was 20, now 25
      reasons.push('National');
    }
  } else {
    score += 20;  // IMPROVED: was 15, now 20 (unspecified = potentially universal)
    reasons.push('Any region');
  }

  // Sector scoring
  if (subsidy.primary_sector && profile.sector) {
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
  } else if (!subsidy.primary_sector) {
    // No sector specified = potentially universal, give partial credit
    score += 10;
    reasons.push('No sector (potentially universal)');
  }

  // Text match
  const matchedTerms = profile.searchTerms.filter(term => subsidyText.includes(term));
  if (matchedTerms.length >= 5) {
    score += 25;  // IMPROVED: Bonus for many matches
    reasons.push(`Text: ${matchedTerms.length} terms`);
  } else if (matchedTerms.length >= 3) {
    score += 20;
    reasons.push(`Text: ${matchedTerms.length} terms`);
  } else if (matchedTerms.length >= 1) {
    score += matchedTerms.length * 7;
    reasons.push(`Text: ${matchedTerms.slice(0, 3).join(', ')}`);
  }

  // Thematic keywords
  const thematicMatches = profile.thematicKeywords.filter(kw => subsidyText.includes(kw.toLowerCase()));
  if (thematicMatches.length > 0) {
    score += Math.min(15, thematicMatches.length * 5);
    reasons.push(`Thematic: ${thematicMatches.slice(0, 2).join(', ')}`);
  }

  // === NEW: Amount boost in pre-scoring ===
  // High-value subsidies get a boost (helps France 2030 compete with small regional)
  const amount = subsidy.amount_max;
  if (amount) {
    if (amount >= 10000000) {      // >= 10M€
      score += 12;
      reasons.push(`Amount: ${(amount / 1000000).toFixed(0)}M€ (+12)`);
    } else if (amount >= 1000000) { // >= 1M€
      score += 8;
      reasons.push(`Amount: ${(amount / 1000000).toFixed(1)}M€ (+8)`);
    } else if (amount >= 500000) {  // >= 500k€
      score += 5;
      reasons.push(`Amount: ${(amount / 1000).toFixed(0)}k€ (+5)`);
    } else if (amount >= 100000) {  // >= 100k€
      score += 3;
      reasons.push(`Amount: ${(amount / 1000).toFixed(0)}k€ (+3)`);
    }
  }

  return { score: Math.min(100, score), filtered: false, reasons };
}

// ============================================================================
// FRANCE BAMBOO PROFILE - FULL DATA (using all available sources)
// ============================================================================

const FRANCE_BAMBOO: AnalyzedProfile = {
  sector: 'Agriculture',
  sizeCategory: 'PME',
  region: 'Occitanie',

  // === EXPANDED SEARCH TERMS (from all sources) ===
  searchTerms: [
    // From NAF label
    'culture', 'plantes', 'boissons', 'épices', 'aromatiques', 'médicinales',
    // From sector
    'agriculture',
    // From project types
    'innovation', 'développement durable', 'export',
    // From certifications (NEW!)
    'agriculture biologique', 'bio', 'biologique', 'hve', 'haute valeur environnementale',
    // From description (NEW!)
    'bambou', 'construction', 'alimentation', 'transformation', 'durable', 'écologique',
    // From businessActivities (NEW!)
    'culture de bambou', 'transformation bois', 'matériaux construction', 'bois', 'matériaux',
    // From sustainability initiatives (NEW!)
    'carbone neutre', 'zéro déchet',
  ],

  // === EXPANDED THEMATIC KEYWORDS ===
  thematicKeywords: [
    // From Agriculture sector
    'agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole', 'agroalimentaire', 'pac', 'feader', 'biomasse', 'rural',
    // From certifications (NEW!)
    'biologique', 'bio', 'label bio', 'conversion bio', 'certification environnementale',
    // From description (NEW!)
    'construction', 'bâtiment', 'btp', 'écologique', 'durable', 'environnement', 'vert', 'transformation', 'valorisation', 'filière',
    // From high sustainability score 85 (ENHANCED!)
    'environnement', 'transition écologique', 'rse', 'carbone', 'décarbonation', 'neutralité carbone', 'climat', 'économie circulaire', 'biodiversité',
    'prêt vert', 'financement vert', 'éco-prêt',  // NEW: loan-related green keywords
    'industrie verte', 'transition industrielle', 'décarboner',  // NEW: industry green keywords
    // From businessActivities (ENHANCED!)
    'bois', 'filière bois', 'forestier', 'biosourcé', 'matériaux',
    'matériaux biosourcés', 'bois-construction', 'éco-matériaux',  // NEW: biosourced materials
    // From innovation score 65 (NEW!)
    'innovation', 'r&d', 'recherche', 'développement', 'innovant',
  ],

  // Exclusions (same)
  exclusionKeywords: ['musique', 'musical', 'cinéma', 'audiovisuel', 'film', 'spectacle', 'théâtre', 'danse', 'musicale', 'phonographique', 'opéra', 'orchestre'],
};

// ============================================================================
// MAIN TEST
// ============================================================================

async function runTest() {
  console.log('\n' + '═'.repeat(100));
  console.log('REAL DATA TEST: V5 Pre-Scoring for France Bamboo');
  console.log('═'.repeat(100));

  // Fetch ALL active subsidies
  console.log('\n📊 Fetching subsidies from database...');

  try {
    const query = `
      SELECT
        id,
        title,
        description,
        agency,
        region,
        categories,
        primary_sector,
        keywords,
        amount_min,
        amount_max,
        eligibility_criteria,
        legal_entities,
        is_universal_sector
      FROM subsidies
      WHERE is_active = true
        AND is_business_relevant = true
      ORDER BY amount_max DESC NULLS LAST
    `;

    const allSubsidies = await runQuery(query);

    console.log(`✅ Found ${allSubsidies?.length || 0} active subsidies`);

    if (!allSubsidies || allSubsidies.length === 0) {
      console.log('No subsidies found!');
      return;
    }

    // Score all subsidies
    console.log('\n🔄 Running pre-scoring on all subsidies...\n');

    const results: { subsidy: SubsidyCandidate; score: number; filtered: boolean; filterReason?: string; reasons: string[] }[] = [];

    for (const subsidy of allSubsidies) {
      const result = calculatePreScore(subsidy as SubsidyCandidate, FRANCE_BAMBOO);
      results.push({ subsidy: subsidy as SubsidyCandidate, ...result });
    }

    // Categorize results
    const filtered = results.filter(r => r.filtered);
    const passed = results.filter(r => !r.filtered);
    const high = passed.filter(r => r.score >= 50);
    const medium = passed.filter(r => r.score >= 25 && r.score < 50);
    const low = passed.filter(r => r.score < 25);

    // ============================================================================
    // RESULTS
    // ============================================================================

    console.log('═'.repeat(100));
    console.log('RESULTS SUMMARY');
    console.log('═'.repeat(100));
    console.log(`
   Total subsidies in database:  ${allSubsidies.length}
   ─────────────────────────────────────
   ❌ FILTERED (irrelevant):     ${filtered.length} (${(filtered.length / allSubsidies.length * 100).toFixed(1)}%)
   ✅ HIGH score (≥50):          ${high.length}
   ⚠️  MEDIUM score (25-49):      ${medium.length}
   ⬜ LOW score (<25):           ${low.length}
   ─────────────────────────────────────
   📤 Would send to AI:          ${Math.min(100, passed.filter(r => r.score >= 10).length)} (capped at 100)
   👁️  User would see:            20 (top matches after AI ranking)
    `);

    // Show filtered subsidies (sample)
    console.log('\n' + '─'.repeat(100));
    console.log('❌ FILTERED SUBSIDIES (sample - first 15):');
    console.log('─'.repeat(100));
    for (const r of filtered.slice(0, 15)) {
      console.log(`   • "${getTitle(r.subsidy).substring(0, 60)}..." → ${r.filterReason}`);
    }
    if (filtered.length > 15) {
      console.log(`   ... and ${filtered.length - 15} more filtered`);
    }

    // Show top matches
    console.log('\n' + '─'.repeat(100));
    console.log('✅ TOP 20 MATCHES (what user would see after AI ranking):');
    console.log('─'.repeat(100));

    const sorted = passed.sort((a, b) => b.score - a.score);
    for (let i = 0; i < Math.min(20, sorted.length); i++) {
      const r = sorted[i];
      const title = getTitle(r.subsidy).substring(0, 50);
      const region = Array.isArray(r.subsidy.region) ? r.subsidy.region.slice(0, 2).join(', ') : 'Any';
      const sector = r.subsidy.primary_sector || 'Universal';
      const amount = r.subsidy.amount_max ? `${(r.subsidy.amount_max / 1000).toFixed(0)}k€` : 'N/A';
      console.log(`   ${(i + 1).toString().padStart(2)}. ${r.score.toString().padStart(2)}pts │ ${title.padEnd(50)} │ ${amount.padStart(8)}`);
      console.log(`              │ Region: ${region.substring(0, 20)} │ Sector: ${sector.substring(0, 20)}`);
    }

    // Analyze sector distribution in top matches
    console.log('\n' + '─'.repeat(100));
    console.log('📊 SECTOR DISTRIBUTION IN TOP 50:');
    console.log('─'.repeat(100));

    const top50 = sorted.slice(0, 50);
    const sectorCounts: Record<string, number> = {};
    for (const r of top50) {
      const sector = r.subsidy.primary_sector || 'Universal/None';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    }

    const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
    for (const [sector, count] of sortedSectors.slice(0, 10)) {
      const bar = '█'.repeat(Math.round(count / 2));
      console.log(`   ${sector.substring(0, 30).padEnd(30)} ${count.toString().padStart(3)} ${bar}`);
    }

    // Check for potential misses
    console.log('\n' + '─'.repeat(100));
    console.log('🔍 POTENTIAL MISSES (subsidies with relevant keywords but score < 50):');
    console.log('─'.repeat(100));

    const potentialMisses = passed.filter(r => {
      const text = getSubsidyText(r.subsidy);
      return (
        text.includes('bio') ||
        text.includes('construction') ||
        text.includes('bambou') ||
        text.includes('biosourcé') ||
        text.includes('matériau') ||
        text.includes('écologique')
      ) && r.score < 50 && r.score >= 20;
    });

    if (potentialMisses.length === 0) {
      console.log('   None found with score 20-49 containing these keywords');
    } else {
      for (const r of potentialMisses.slice(0, 10)) {
        console.log(`   ${r.score}pts: ${getTitle(r.subsidy).substring(0, 65)}`);
        console.log(`         Sector: ${r.subsidy.primary_sector || 'None'} │ Reasons: ${r.reasons.join(', ')}`);
      }
    }

    // Show some high-amount subsidies that didn't make top 20
    console.log('\n' + '─'.repeat(100));
    console.log('💰 HIGH-VALUE SUBSIDIES (>100k€) NOT IN TOP 20:');
    console.log('─'.repeat(100));

    const highValueNotTop = sorted.slice(20).filter(r => r.subsidy.amount_max && r.subsidy.amount_max > 100000).slice(0, 10);
    for (const r of highValueNotTop) {
      const amount = r.subsidy.amount_max ? `${(r.subsidy.amount_max / 1000).toFixed(0)}k€` : 'N/A';
      console.log(`   ${r.score}pts │ ${amount.padStart(8)} │ ${getTitle(r.subsidy).substring(0, 55)}`);
      console.log(`              │ Sector: ${r.subsidy.primary_sector || 'None'} │ Why not higher: ${r.reasons.length === 0 ? 'No matches' : r.reasons.join(', ')}`);
    }

    console.log('\n' + '═'.repeat(100));
    console.log('CONCLUSION');
    console.log('═'.repeat(100));
    console.log(`
   Pre-scoring filtered ${filtered.length} irrelevant subsidies (${(filtered.length / allSubsidies.length * 100).toFixed(1)}% of total)

   Top matches are dominated by: ${sortedSectors.slice(0, 3).map(([s]) => s).join(', ')}

   ${high.length} subsidies scored ≥50 (high relevance)
   ${medium.length} subsidies scored 25-49 (medium relevance)

   Would you have found more relevant subsidies? Check the "POTENTIAL MISSES" section above.
    `);
    console.log('═'.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runTest().catch(console.error);
