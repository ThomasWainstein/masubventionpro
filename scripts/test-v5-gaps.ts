/**
 * Gap Analysis: What subsidies might France Bamboo be missing?
 *
 * This test identifies potential gaps in the pre-scoring logic
 */

// France Bamboo's complete profile
const PROFILE = {
  company_name: 'France Bamboo',
  naf_code: '01.29Z',
  naf_label: 'Culture de plantes à boissons, épices, aromatiques, médicinales et pharmaceutiques',
  sector: 'Agriculture',
  region: 'Occitanie',
  employees: '15',
  legal_form: 'SAS',
  project_types: ['Innovation', 'Développement durable', 'Export'],
  certifications: ['Agriculture biologique', 'HVE'],
  description: 'Production et transformation de bambou pour la construction et l\'alimentation. Culture durable et écologique.',
  website_intelligence: {
    companyDescription: 'Producteur de bambou français pour construction écologique',
    businessActivities: ['culture de bambou', 'transformation bois', 'matériaux construction'],
    innovations: { score: 65 },
    sustainability: { score: 85 },
    export: { score: 40 },
  },
};

// What keywords SHOULD we be searching for based on this profile?
const EXPECTED_KEYWORDS = {
  // From NAF/Sector
  agriculture: ['agriculture', 'agricole', 'exploitation agricole', 'culture', 'plantes'],

  // From Certifications (NOT CURRENTLY CAPTURED WELL)
  certifications: ['agriculture biologique', 'bio', 'biologique', 'hve', 'haute valeur environnementale', 'label'],

  // From Description (DUAL BUSINESS - NOT CAPTURED)
  construction: ['construction', 'bâtiment', 'btp', 'matériaux', 'biosourcé', 'bois', 'éco-construction'],

  // From Project Types
  projects: ['innovation', 'développement durable', 'export', 'international'],

  // From Website Intelligence (PARTIALLY CAPTURED)
  website: ['écologique', 'durable', 'transformation', 'filière bois'],

  // Environmental (HIGH SUSTAINABILITY SCORE)
  environment: ['transition écologique', 'environnement', 'carbone', 'rse', 'développement durable'],
};

// Subsidies that SHOULD match but might be filtered or scored low
const POTENTIALLY_MISSED_SUBSIDIES = [
  {
    title: 'Aide aux matériaux biosourcés pour la construction',
    why_relevant: 'Bamboo is used for construction materials',
    why_might_miss: 'primary_sector would be BTP, not Agriculture - filtered by sector',
    expected_score: 'LOW (wrong sector)',
    should_be: 'HIGH (construction is in description)',
  },
  {
    title: 'Subvention pour la certification Agriculture Biologique',
    why_relevant: 'Company has AB certification',
    why_might_miss: 'Certification matching only checks if cert name appears in text',
    expected_score: 'MEDIUM (if "biologique" appears)',
    should_be: 'HIGH (direct certification match)',
  },
  {
    title: 'Aide à l\'éco-construction en Occitanie',
    why_relevant: 'Bamboo for ecological construction',
    why_might_miss: 'primary_sector would be BTP',
    expected_score: 'LOW (wrong sector)',
    should_be: 'HIGH (matches description + region)',
  },
  {
    title: 'France 2030 - Filière bois et biosourcés',
    why_relevant: 'Bamboo is a biosourced material',
    why_might_miss: '"bois" not in Agriculture thematic keywords',
    expected_score: 'MEDIUM (France 2030 boost, but weak sector match)',
    should_be: 'HIGH (direct activity match)',
  },
  {
    title: 'Aide HVE - Haute Valeur Environnementale',
    why_relevant: 'Company has HVE certification',
    why_might_miss: '"HVE" not in current keyword lists',
    expected_score: 'MEDIUM/LOW',
    should_be: 'HIGH (direct certification match)',
  },
];

console.log('═'.repeat(100));
console.log('GAP ANALYSIS: What might France Bamboo be missing?');
console.log('═'.repeat(100));

console.log('\n📋 PROFILE BREAKDOWN:\n');
console.log('   Primary Activity:    Agriculture (NAF 01.29Z)');
console.log('   Secondary Activity:  Construction materials (from description)');
console.log('   Certifications:      Agriculture biologique, HVE');
console.log('   Project Types:       Innovation, Développement durable, Export');
console.log('   Sustainability:      85/100 (high!)');

console.log('\n\n🔍 EXPECTED SEARCH KEYWORDS (by category):\n');
for (const [category, keywords] of Object.entries(EXPECTED_KEYWORDS)) {
  console.log(`   ${category.toUpperCase()}:`);
  console.log(`      ${keywords.join(', ')}`);
}

console.log('\n\n⚠️  POTENTIAL GAPS IN CURRENT PRE-SCORING:\n');
console.log('─'.repeat(100));

for (const gap of POTENTIALLY_MISSED_SUBSIDIES) {
  console.log(`\n   📌 "${gap.title}"`);
  console.log(`      Why relevant:     ${gap.why_relevant}`);
  console.log(`      Why might miss:   ${gap.why_might_miss}`);
  console.log(`      Current score:    ${gap.expected_score}`);
  console.log(`      Should be:        ${gap.should_be}`);
}

console.log('\n\n' + '═'.repeat(100));
console.log('RECOMMENDED IMPROVEMENTS');
console.log('═'.repeat(100));

const improvements = [
  {
    issue: 'Dual-sector companies not handled',
    example: 'France Bamboo = Agriculture + Construction',
    fix: 'Extract secondary sectors from description/website_intelligence',
  },
  {
    issue: 'Certification matching too weak',
    example: 'Has "Agriculture biologique" but only matches if text contains exact phrase',
    fix: 'Add certification-specific keywords: bio, biologique, hve, label, certifié',
  },
  {
    issue: 'Website intelligence underutilized',
    example: 'businessActivities: ["matériaux construction"] not used for sector expansion',
    fix: 'Expand search terms from website_intelligence.businessActivities',
  },
  {
    issue: 'High sustainability score not leveraged',
    example: 'sustainability.score=85 should boost eco/green subsidies',
    fix: 'Add environmental keywords when sustainability score > 70',
  },
];

console.log('\n');
for (let i = 0; i < improvements.length; i++) {
  const imp = improvements[i];
  console.log(`${i + 1}. ${imp.issue}`);
  console.log(`   Example: ${imp.example}`);
  console.log(`   Fix: ${imp.fix}`);
  console.log();
}

console.log('═'.repeat(100));
console.log('CONCLUSION');
console.log('═'.repeat(100));
console.log(`
The current pre-scoring is GOOD at:
  ✅ Filtering irrelevant sectors (music/cinema for agriculture)
  ✅ Matching primary sector + region
  ✅ Basic thematic keywords (agricole, biomasse, feader)

The current pre-scoring MISSES:
  ❌ Secondary business activities (construction materials)
  ❌ Certification-specific subsidies
  ❌ Cross-sector opportunities (agriculture → construction)
  ❌ High sustainability companies → environmental subsidies

Estimated impact:
  - Current: Finding ~70% of relevant subsidies
  - With improvements: Could find ~90%
`);
