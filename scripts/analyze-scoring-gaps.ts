/**
 * Analyze why specific subsidies scored lower than expected
 */

import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
};

// France Bamboo profile (same as test)
const PROFILE = {
  sector: 'Agriculture',
  sizeCategory: 'PME',
  region: 'Occitanie',
  searchTerms: [
    'culture', 'plantes', 'boissons', 'épices', 'aromatiques', 'médicinales',
    'agriculture', 'innovation', 'développement durable', 'export',
    'agriculture biologique', 'bio', 'biologique', 'hve', 'haute valeur environnementale',
    'bambou', 'construction', 'alimentation', 'transformation', 'durable', 'écologique',
    'culture de bambou', 'transformation bois', 'matériaux construction', 'bois', 'matériaux',
    'carbone neutre', 'zéro déchet',
  ],
  thematicKeywords: [
    'agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole',
    'agroalimentaire', 'pac', 'feader', 'biomasse', 'rural',
    'biologique', 'bio', 'label bio', 'conversion bio', 'certification environnementale',
    'construction', 'bâtiment', 'btp', 'écologique', 'durable', 'environnement', 'vert',
    'transformation', 'valorisation', 'filière',
    'environnement', 'transition écologique', 'rse', 'carbone', 'décarbonation',
    'neutralité carbone', 'climat', 'économie circulaire', 'biodiversité',
    'bois', 'filière bois', 'forestier', 'biosourcé', 'matériaux',
    'innovation', 'r&d', 'recherche', 'développement', 'innovant',
  ],
};

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

function getTitle(s: any): string {
  if (!s.title) return 'N/A';
  if (typeof s.title === 'object') return s.title.fr || s.title.en || 'N/A';
  return s.title;
}

function getDescription(s: any): string {
  if (!s.description) return '';
  if (typeof s.description === 'object') return s.description.fr || '';
  return s.description;
}

function analyzeScore(subsidy: any): { score: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let score = 0;

  const title = getTitle(subsidy).toLowerCase();
  const desc = getDescription(subsidy).toLowerCase();
  const fullText = `${title} ${desc}`;

  // Region scoring
  const regions = subsidy.region || [];
  if (regions.includes('Occitanie')) {
    score += 30;
    breakdown.push('Region Occitanie: +30');
  } else if (regions.includes('National')) {
    score += 25;
    breakdown.push('National: +25');
  } else if (regions.length === 0) {
    score += 20;
    breakdown.push('No region (universal): +20');
  } else {
    breakdown.push(`Other region (${regions[0]}): +0`);
  }

  // Sector scoring
  const sector = subsidy.primary_sector?.toLowerCase() || '';
  if (sector.includes('agri')) {
    score += 25;
    breakdown.push(`Sector match (${subsidy.primary_sector}): +25`);
  } else if (subsidy.is_universal_sector) {
    score += 15;
    breakdown.push('Universal sector: +15');
  } else if (!sector) {
    score += 10;
    breakdown.push('No sector (might be universal): +10');
  } else {
    breakdown.push(`Different sector (${subsidy.primary_sector}): +0`);
  }

  // Search term matches
  const matchedTerms = PROFILE.searchTerms.filter(term => fullText.includes(term));
  if (matchedTerms.length >= 5) {
    score += 25;
    breakdown.push(`Search terms (${matchedTerms.length}): +25 [${matchedTerms.slice(0, 5).join(', ')}...]`);
  } else if (matchedTerms.length >= 3) {
    score += 20;
    breakdown.push(`Search terms (${matchedTerms.length}): +20 [${matchedTerms.join(', ')}]`);
  } else if (matchedTerms.length >= 1) {
    score += matchedTerms.length * 7;
    breakdown.push(`Search terms (${matchedTerms.length}): +${matchedTerms.length * 7} [${matchedTerms.join(', ')}]`);
  } else {
    breakdown.push('Search terms: +0 (no matches)');
  }

  // Thematic matches
  const thematicMatches = PROFILE.thematicKeywords.filter(kw => fullText.includes(kw.toLowerCase()));
  if (thematicMatches.length > 0) {
    const pts = Math.min(15, thematicMatches.length * 5);
    score += pts;
    breakdown.push(`Thematic (${thematicMatches.length}): +${pts} [${thematicMatches.slice(0, 4).join(', ')}...]`);
  } else {
    breakdown.push('Thematic: +0 (no matches)');
  }

  // Amount boost
  const amount = subsidy.amount_max;
  if (amount) {
    if (amount >= 10000000) {
      score += 12;
      breakdown.push(`Amount ${(amount/1000000).toFixed(0)}M€: +12`);
    } else if (amount >= 1000000) {
      score += 8;
      breakdown.push(`Amount ${(amount/1000000).toFixed(1)}M€: +8`);
    } else if (amount >= 500000) {
      score += 5;
      breakdown.push(`Amount ${(amount/1000).toFixed(0)}k€: +5`);
    } else if (amount >= 100000) {
      score += 3;
      breakdown.push(`Amount ${(amount/1000).toFixed(0)}k€: +3`);
    }
  }

  return { score: Math.min(100, score), breakdown };
}

async function main() {
  console.log('═'.repeat(100));
  console.log('DETAILED SCORING ANALYSIS FOR POTENTIALLY MISSED SUBSIDIES');
  console.log('═'.repeat(100));

  // Subsidies to analyze in detail
  const subsidyTitles = [
    'LIFE - Projets stratégiques',
    'Prêt Industrie Verte',
    'Prêt Vert',
    'Prêt participatif filière bois',
    'France 2030 - Accélérateur',
    'DÉTER - DÉcarboner',
    'APR GRAINE',
  ];

  for (const titleSearch of subsidyTitles) {
    const query = `
      SELECT id, title, description, primary_sector, region, amount_max, is_universal_sector, keywords
      FROM subsidies
      WHERE is_active = true
        AND is_business_relevant = true
        AND LOWER(title::text) LIKE '%${titleSearch.toLowerCase()}%'
      LIMIT 1
    `;

    const results = await runQuery(query);
    if (results && results.length > 0) {
      const s = results[0];
      const title = getTitle(s);
      const { score, breakdown } = analyzeScore(s);

      console.log(`\n${'─'.repeat(100)}`);
      console.log(`📊 ${title.substring(0, 80)}`);
      console.log(`   Amount: ${s.amount_max ? `${(s.amount_max/1000).toFixed(0)}k€` : 'N/A'} | Region: ${JSON.stringify(s.region)} | Sector: ${s.primary_sector || 'None'}`);
      console.log(`   Universal: ${s.is_universal_sector}`);
      console.log(`\n   SCORING BREAKDOWN (Total: ${score}pts):`);
      for (const line of breakdown) {
        console.log(`      • ${line}`);
      }

      // Check what keywords would help
      const desc = getDescription(s).toLowerCase();
      const missingHighValue = ['agricole', 'agriculture', 'bio', 'bois', 'construction', 'matériaux', 'écologique', 'durable'];
      const present = missingHighValue.filter(kw => desc.includes(kw) || title.toLowerCase().includes(kw));
      const missing = missingHighValue.filter(kw => !desc.includes(kw) && !title.toLowerCase().includes(kw));

      if (present.length > 0) {
        console.log(`\n   ✅ Keywords present: ${present.join(', ')}`);
      }
      if (missing.length > 0) {
        console.log(`   ❌ Keywords missing: ${missing.join(', ')}`);
      }
    }
  }

  // Now check what's IN our top 20 vs what SHOULD be there
  console.log('\n\n' + '═'.repeat(100));
  console.log('COMPARISON: EXPECTED HIGH-VALUE SUBSIDIES VS ACTUAL RANKING');
  console.log('═'.repeat(100));

  // Get all high-value national subsidies
  const highValueQuery = `
    SELECT id, title, description, primary_sector, region, amount_max, is_universal_sector
    FROM subsidies
    WHERE is_active = true
      AND is_business_relevant = true
      AND amount_max >= 1000000
      AND (region @> '["National"]' OR region IS NULL)
    ORDER BY amount_max DESC
    LIMIT 30
  `;

  const highValue = await runQuery(highValueQuery);
  if (highValue && Array.isArray(highValue)) {
    console.log('\nHigh-value National subsidies (≥1M€) with scores:\n');

    const scored = highValue.map(s => ({
      ...s,
      ...analyzeScore(s)
    })).sort((a, b) => b.score - a.score);

    for (const s of scored) {
      const title = getTitle(s);
      const amount = s.amount_max ? `${(s.amount_max/1000000).toFixed(0)}M€` : 'N/A';
      const status = s.score >= 70 ? '✅' : s.score >= 60 ? '⚠️' : '❌';
      console.log(`   ${status} ${s.score.toString().padStart(2)}pts │ ${amount.padStart(6)} │ ${title.substring(0, 65)}`);
    }
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
