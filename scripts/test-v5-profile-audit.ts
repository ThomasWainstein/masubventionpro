/**
 * PROFILE DATA AUDIT
 *
 * Shows exactly what data exists in France Bamboo's profile
 * vs what we're actually using for matching
 */

// ============================================================================
// FULL FRANCE BAMBOO PROFILE (as it would come from the database)
// ============================================================================

const FULL_PROFILE = {
  // === LEGAL DATA (from SIRET/INSEE) ===
  id: 'test-france-bamboo',
  company_name: 'France Bamboo',
  siret: '12345678900001',
  naf_code: '01.29Z',
  naf_label: 'Culture de plantes à boissons, épices, aromatiques, médicinales et pharmaceutiques',
  sector: 'Agriculture',
  sub_sector: 'Culture de plantes',
  region: 'Occitanie',
  department: '34',
  employees: '15',
  annual_turnover: 500000,
  year_created: 2018,
  legal_form: 'SAS',
  company_category: 'PME',

  // === USER-ENTERED DATA ===
  project_types: ['Innovation', 'Développement durable', 'Export'],
  certifications: ['Agriculture biologique', 'HVE'],
  description: 'Production et transformation de bambou pour la construction et l\'alimentation. Culture durable et écologique.',

  // === AI-ENRICHED DATA (from website analysis) ===
  website_intelligence: {
    companyDescription: 'Producteur de bambou français pour construction écologique',
    businessActivities: ['culture de bambou', 'transformation bois', 'matériaux construction'],
    innovations: {
      score: 65,
      indicators: ['matériau innovant', 'procédé breveté'],
      technologies: ['séchage basse température', 'traitement naturel'],
    },
    sustainability: {
      score: 85,
      initiatives: ['agriculture bio', 'carbone neutre', 'zéro déchet'],
      certifications: ['ISO 14001'],
    },
    export: {
      score: 40,
      markets: ['Espagne', 'Italie'],
      multilingualSite: true,
    },
    digital: {
      score: 55,
      technologies: ['e-commerce', 'CRM'],
      ecommerce: true,
    },
    growth: {
      score: 70,
      signals: ['recrutement', 'nouveau site production'],
      recentInvestment: true,
    },
  },
};

// ============================================================================
// WHAT WE'RE CURRENTLY USING IN PRE-SCORING
// ============================================================================

const CURRENTLY_USED = {
  sector: '✅ Used for sector matching and exclusions',
  region: '✅ Used for region matching (+30 pts)',
  employees: '✅ Used for size category (PME)',
  naf_code: '✅ Used to derive sector if not set',
  naf_label: '⚠️ Partially - split into search terms',

  project_types: '⚠️ Partially - added to search terms but not weighted',
  certifications: '❌ NOT USED - just exists in profile',
  description: '❌ NOT USED - not extracted for keywords',

  // Website Intelligence
  'website_intelligence.companyDescription': '❌ NOT USED',
  'website_intelligence.businessActivities': '❌ NOT USED - could expand sector matching',
  'website_intelligence.innovations.score': '⚠️ Partially - adds generic "innovation" keyword if >50',
  'website_intelligence.innovations.indicators': '❌ NOT USED',
  'website_intelligence.innovations.technologies': '❌ NOT USED',
  'website_intelligence.sustainability.score': '⚠️ Partially - adds generic keywords if >50',
  'website_intelligence.sustainability.initiatives': '❌ NOT USED',
  'website_intelligence.sustainability.certifications': '❌ NOT USED',
  'website_intelligence.export.score': '⚠️ Partially - adds "export" keyword if >50',
  'website_intelligence.export.markets': '❌ NOT USED',
  'website_intelligence.digital.score': '❌ NOT USED',
  'website_intelligence.growth.score': '❌ NOT USED',
};

// ============================================================================
// ANALYSIS
// ============================================================================

console.log('\n' + '═'.repeat(100));
console.log('FRANCE BAMBOO PROFILE DATA AUDIT');
console.log('═'.repeat(100));

console.log('\n📋 FULL PROFILE DATA AVAILABLE:\n');

// Legal data
console.log('LEGAL DATA (from SIRET/INSEE):');
console.log('─'.repeat(50));
console.log(`   naf_code:        ${FULL_PROFILE.naf_code}`);
console.log(`   naf_label:       ${FULL_PROFILE.naf_label.substring(0, 50)}...`);
console.log(`   sector:          ${FULL_PROFILE.sector}`);
console.log(`   region:          ${FULL_PROFILE.region}`);
console.log(`   employees:       ${FULL_PROFILE.employees}`);
console.log(`   annual_turnover: ${FULL_PROFILE.annual_turnover?.toLocaleString()}€`);
console.log(`   year_created:    ${FULL_PROFILE.year_created} (${new Date().getFullYear() - FULL_PROFILE.year_created} years old)`);
console.log(`   legal_form:      ${FULL_PROFILE.legal_form}`);

// User data
console.log('\nUSER-ENTERED DATA:');
console.log('─'.repeat(50));
console.log(`   project_types:   ${FULL_PROFILE.project_types.join(', ')}`);
console.log(`   certifications:  ${FULL_PROFILE.certifications.join(', ')}`);
console.log(`   description:     ${FULL_PROFILE.description.substring(0, 60)}...`);

// AI data
console.log('\nAI-ENRICHED DATA (website_intelligence):');
console.log('─'.repeat(50));
const wi = FULL_PROFILE.website_intelligence;
console.log(`   companyDescription:  ${wi.companyDescription}`);
console.log(`   businessActivities:  ${wi.businessActivities.join(', ')}`);
console.log(`   innovations.score:   ${wi.innovations.score}/100`);
console.log(`   innovations.indicators: ${wi.innovations.indicators.join(', ')}`);
console.log(`   sustainability.score: ${wi.sustainability.score}/100`);
console.log(`   sustainability.initiatives: ${wi.sustainability.initiatives.join(', ')}`);
console.log(`   export.score:        ${wi.export.score}/100`);
console.log(`   export.markets:      ${wi.export.markets.join(', ')}`);
console.log(`   digital.score:       ${wi.digital.score}/100`);
console.log(`   growth.score:        ${wi.growth.score}/100`);
console.log(`   growth.signals:      ${wi.growth.signals.join(', ')}`);

// What we're using
console.log('\n\n' + '═'.repeat(100));
console.log('WHAT WE\'RE ACTUALLY USING IN PRE-SCORING');
console.log('═'.repeat(100));
console.log('\n');

for (const [field, status] of Object.entries(CURRENTLY_USED)) {
  const icon = status.startsWith('✅') ? '✅' : status.startsWith('⚠️') ? '⚠️' : '❌';
  const fieldPadded = field.padEnd(45);
  console.log(`   ${fieldPadded} ${status}`);
}

// Gap analysis
console.log('\n\n' + '═'.repeat(100));
console.log('CRITICAL GAPS - DATA WE HAVE BUT DON\'T USE');
console.log('═'.repeat(100));

const gaps = [
  {
    field: 'certifications',
    value: FULL_PROFILE.certifications,
    impact: 'HIGH',
    suggestion: 'Should match subsidies requiring "Agriculture biologique" or "HVE"',
    example: 'Subsidy "Aide conversion bio" mentions "biologique" - should get +15 pts',
  },
  {
    field: 'website_intelligence.businessActivities',
    value: wi.businessActivities,
    impact: 'HIGH',
    suggestion: 'Should expand sector matching - company does construction AND agriculture',
    example: '"matériaux construction" should match BTP subsidies too',
  },
  {
    field: 'description',
    value: FULL_PROFILE.description,
    impact: 'MEDIUM',
    suggestion: 'Should extract keywords: bambou, construction, alimentation, durable, écologique',
    example: '"bambou" and "construction" are unique to this company',
  },
  {
    field: 'sustainability.score (85/100)',
    value: wi.sustainability.score,
    impact: 'MEDIUM',
    suggestion: 'Very high score - should strongly boost environmental/RSE subsidies',
    example: 'Score 85 should add +10 pts to "transition écologique" subsidies',
  },
  {
    field: 'sustainability.initiatives',
    value: wi.sustainability.initiatives,
    impact: 'MEDIUM',
    suggestion: 'Specific initiatives should match subsidy keywords',
    example: '"carbone neutre" matches decarbonation subsidies',
  },
  {
    field: 'growth.signals',
    value: wi.growth.signals,
    impact: 'LOW',
    suggestion: '"recrutement" could match employment subsidies',
    example: 'Matches "aide à l\'embauche" type subsidies',
  },
];

console.log('\n');
for (const gap of gaps) {
  console.log(`\n   🔴 ${gap.field}`);
  console.log(`      Value: ${JSON.stringify(gap.value)}`);
  console.log(`      Impact: ${gap.impact}`);
  console.log(`      Suggestion: ${gap.suggestion}`);
  console.log(`      Example: ${gap.example}`);
}

// Recommended extraction
console.log('\n\n' + '═'.repeat(100));
console.log('RECOMMENDED SEARCH TERMS TO EXTRACT');
console.log('═'.repeat(100));

const recommendedTerms = {
  'From naf_label': ['culture', 'plantes', 'boissons', 'épices', 'aromatiques', 'médicinales'],
  'From sector': ['agriculture', 'agricole'],
  'From certifications': ['agriculture biologique', 'bio', 'biologique', 'hve', 'haute valeur environnementale'],
  'From description': ['bambou', 'construction', 'alimentation', 'durable', 'écologique', 'transformation'],
  'From project_types': ['innovation', 'développement durable', 'export', 'international'],
  'From businessActivities': ['culture de bambou', 'transformation bois', 'matériaux construction', 'bois', 'matériaux'],
  'From sustainability': ['carbone neutre', 'zéro déchet', 'iso 14001', 'environnement', 'rse'],
  'From innovations': ['matériau innovant', 'procédé breveté', 'r&d'],
  'From export': ['espagne', 'italie', 'europe', 'international'],
};

console.log('\n');
for (const [source, terms] of Object.entries(recommendedTerms)) {
  console.log(`   ${source}:`);
  console.log(`      ${terms.join(', ')}`);
}

// Summary
console.log('\n\n' + '═'.repeat(100));
console.log('SUMMARY');
console.log('═'.repeat(100));
console.log(`
   Currently using:     ~30% of available profile data

   Missing HIGH impact:
   - Certifications (Agriculture biologique, HVE)
   - Business activities from AI (construction, bois, matériaux)
   - Description keywords (bambou, construction)

   Missing MEDIUM impact:
   - Sustainability initiatives (carbone neutre)
   - High sustainability score (85) → should boost eco subsidies
   - Innovation indicators

   Recommendation: Expand the analyzeProfile() function to extract ALL these terms
`);

console.log('═'.repeat(100) + '\n');
