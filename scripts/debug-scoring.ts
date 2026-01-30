/**
 * Debug why Prêt Industrie Verte isn't scoring higher
 */

import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
};

// EXACT profile from test script
const PROFILE = {
  searchTerms: [
    'culture', 'plantes', 'boissons', 'épices', 'aromatiques', 'médicinales',
    'agriculture', 'innovation', 'développement durable', 'export',
    'agriculture biologique', 'bio', 'biologique', 'hve', 'haute valeur environnementale',
    'bambou', 'construction', 'alimentation', 'transformation', 'durable', 'écologique',
    'culture de bambou', 'transformation bois', 'matériaux construction', 'bois', 'matériaux',
    'carbone neutre', 'zéro déchet',
  ],
  thematicKeywords: [
    'agricole', 'agriculture', 'élevage', 'exploitation agricole', 'filière agricole', 'agroalimentaire', 'pac', 'feader', 'biomasse', 'rural',
    'biologique', 'bio', 'label bio', 'conversion bio', 'certification environnementale',
    'construction', 'bâtiment', 'btp', 'écologique', 'durable', 'environnement', 'vert', 'transformation', 'valorisation', 'filière',
    'environnement', 'transition écologique', 'rse', 'carbone', 'décarbonation', 'neutralité carbone', 'climat', 'économie circulaire', 'biodiversité',
    'prêt vert', 'financement vert', 'éco-prêt',
    'industrie verte', 'transition industrielle', 'décarboner',
    'bois', 'filière bois', 'forestier', 'biosourcé', 'matériaux',
    'matériaux biosourcés', 'bois-construction', 'éco-matériaux',
    'innovation', 'r&d', 'recherche', 'développement', 'innovant',
  ],
};

async function main() {
  const query = `
    SELECT id, title, description, region, amount_max, primary_sector, is_universal_sector
    FROM subsidies
    WHERE is_active = true
      AND LOWER(title::text) LIKE '%prêt industrie verte%'
    LIMIT 1
  `;

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

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    console.log('No results found');
    return;
  }

  const s = results[0];
  const title = typeof s.title === 'object' ? s.title.fr : s.title;
  const desc = typeof s.description === 'object' ? (s.description?.fr || '') : (s.description || '');
  const fullText = (title + ' ' + desc).toLowerCase();

  console.log('═'.repeat(80));
  console.log('DEBUGGING SCORE FOR: Prêt Industrie Verte');
  console.log('═'.repeat(80));
  console.log('\nTitle:', title);
  console.log('Description:', desc);
  console.log('Region:', JSON.stringify(s.region));
  console.log('Amount:', s.amount_max ? `${(s.amount_max/1000).toFixed(0)}k€` : 'N/A');
  console.log('Sector:', s.primary_sector || 'None');
  console.log('Universal:', s.is_universal_sector);

  console.log('\n' + '─'.repeat(80));
  console.log('SCORING BREAKDOWN');
  console.log('─'.repeat(80));

  let score = 0;

  // Region
  const regions = s.region || [];
  if (regions.includes('National')) {
    score += 25;
    console.log('\n✓ Region National: +25');
  }

  // Sector
  if (!s.primary_sector) {
    score += 10;
    console.log('✓ No sector (potentially universal): +10');
  }

  // Search terms
  const matchedTerms = PROFILE.searchTerms.filter(term => fullText.includes(term));
  console.log('\n📝 Search Term Matches:');
  for (const t of matchedTerms) {
    console.log(`   ✓ "${t}"`);
  }
  if (matchedTerms.length >= 5) {
    score += 25;
    console.log(`   → ${matchedTerms.length} matches ≥5: +25`);
  } else if (matchedTerms.length >= 3) {
    score += 20;
    console.log(`   → ${matchedTerms.length} matches ≥3: +20`);
  } else if (matchedTerms.length >= 1) {
    const pts = matchedTerms.length * 7;
    score += pts;
    console.log(`   → ${matchedTerms.length} matches: +${pts}`);
  } else {
    console.log('   → 0 matches: +0');
  }

  // Thematic keywords
  const thematicMatches = PROFILE.thematicKeywords.filter(kw => fullText.includes(kw.toLowerCase()));
  console.log('\n🏷️ Thematic Keyword Matches:');
  for (const t of thematicMatches) {
    console.log(`   ✓ "${t}"`);
  }
  const thematicPts = Math.min(15, thematicMatches.length * 5);
  score += thematicPts;
  console.log(`   → ${thematicMatches.length} matches × 5 = ${thematicMatches.length * 5}, capped at 15: +${thematicPts}`);

  // Amount boost
  if (s.amount_max) {
    let amountBoost = 0;
    if (s.amount_max >= 10000000) amountBoost = 12;
    else if (s.amount_max >= 1000000) amountBoost = 8;
    else if (s.amount_max >= 500000) amountBoost = 5;
    else if (s.amount_max >= 100000) amountBoost = 3;

    if (amountBoost > 0) {
      score += amountBoost;
      console.log(`\n💰 Amount ${(s.amount_max/1000000).toFixed(0)}M€: +${amountBoost}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`TOTAL SCORE: ${score} pts`);
  console.log('═'.repeat(80));

  // What's missing?
  if (score < 70) {
    console.log('\n⚠️ Score is below 70. To reach top 20:');
    console.log('   Need:', 70 - score, 'more points');

    // Check what additional keywords COULD match
    const potentialKeywords = ['transition', 'industrielle', 'financement', 'pme', 'eti'];
    const foundInText = potentialKeywords.filter(kw => fullText.includes(kw));
    if (foundInText.length > 0) {
      console.log('\n   Keywords in subsidy text we could add to profile:');
      for (const kw of foundInText) {
        console.log(`      - "${kw}"`);
      }
    }
  }
}

main().catch(console.error);
