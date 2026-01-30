/**
 * Verify Token Optimization
 *
 * Compares token usage before and after optimization
 */

console.log('═'.repeat(80));
console.log('TOKEN OPTIMIZATION VERIFICATION');
console.log('═'.repeat(80));

// Sample subsidy data (realistic)
const sampleSubsidy = {
  id: 'uuid-here',
  title: 'Prêt Industrie Verte - Financement de la transition écologique des entreprises',
  description: 'Ce prêt accompagne les entreprises dans leur transition vers une industrie plus verte et durable, en finançant les investissements nécessaires à la décarbonation.',
  primary_sector: 'Industrie manufacturière',
  region: ['National'],
  legal_entities: ['TPE', 'PME', 'ETI'],
  eligibility: 'Entreprises industrielles de toutes tailles ayant un projet de décarbonation. Le projet doit représenter un investissement significatif.',
  is_universal_sector: true,
  amount_min: 500000,
  amount_max: 50000000,
  preScore: 69,
  preReasons: ['Programme national', 'Secteur éco-matériaux', 'Montant élevé', 'Thématique: industrie verte'],
};

// OLD FORMAT (100 subsidies)
const oldFormat = {
  index: 0,
  id: sampleSubsidy.id,
  title: sampleSubsidy.title.substring(0, 100),
  description: sampleSubsidy.description.substring(0, 200),
  sector: sampleSubsidy.primary_sector,
  region: sampleSubsidy.region,
  legal_entities: sampleSubsidy.legal_entities,
  eligibility: sampleSubsidy.eligibility.substring(0, 300),
  is_universal: sampleSubsidy.is_universal_sector,
  amount_range: `${sampleSubsidy.amount_min}-${sampleSubsidy.amount_max}€`,
  pre_score: sampleSubsidy.preScore,
  pre_reasons: sampleSubsidy.preReasons,
};

// NEW FORMAT (30 subsidies, compact)
const newFormat = {
  i: 0,
  id: sampleSubsidy.id,
  t: sampleSubsidy.title.substring(0, 60),
  s: sampleSubsidy.primary_sector?.substring(0, 20),
  r: sampleSubsidy.region?.[0]?.substring(0, 15),
  a: `${Math.round(sampleSubsidy.amount_max / 1000)}k€`,
  p: sampleSubsidy.preScore,
  rs: sampleSubsidy.preReasons.slice(0, 2),
};

// Calculate sizes
const oldSubsidyJson = JSON.stringify(oldFormat);
const newSubsidyJson = JSON.stringify(newFormat);

const oldCharsPerSubsidy = oldSubsidyJson.length;
const newCharsPerSubsidy = newSubsidyJson.length;

// Estimate tokens (~4 chars per token)
const estimateTokens = (chars: number) => Math.ceil(chars / 4);

console.log('\n📊 PER-SUBSIDY COMPARISON:\n');
console.log('OLD FORMAT:');
console.log(oldSubsidyJson);
console.log(`   Characters: ${oldCharsPerSubsidy}`);
console.log(`   Est. tokens: ~${estimateTokens(oldCharsPerSubsidy)}`);

console.log('\nNEW FORMAT:');
console.log(newSubsidyJson);
console.log(`   Characters: ${newCharsPerSubsidy}`);
console.log(`   Est. tokens: ~${estimateTokens(newCharsPerSubsidy)}`);

const perSubsidySavings = ((oldCharsPerSubsidy - newCharsPerSubsidy) / oldCharsPerSubsidy * 100).toFixed(0);
console.log(`\n   Per-subsidy reduction: ${perSubsidySavings}%`);

// Total context comparison
console.log('\n\n📊 TOTAL CONTEXT COMPARISON:\n');

const systemPromptTokens = 500;
const oldUserPromptBase = 400;  // Longer prompt
const newUserPromptBase = 200;  // Shorter prompt

const OLD_COUNT = 100;
const NEW_COUNT = 30;

const oldTotal = systemPromptTokens + oldUserPromptBase + (estimateTokens(oldCharsPerSubsidy) * OLD_COUNT);
const newTotal = systemPromptTokens + newUserPromptBase + (estimateTokens(newCharsPerSubsidy) * NEW_COUNT);

console.log('OLD CONFIGURATION:');
console.log(`   Subsidies: ${OLD_COUNT}`);
console.log(`   System prompt: ~${systemPromptTokens} tokens`);
console.log(`   User prompt base: ~${oldUserPromptBase} tokens`);
console.log(`   Subsidies context: ~${estimateTokens(oldCharsPerSubsidy) * OLD_COUNT} tokens`);
console.log(`   TOTAL INPUT: ~${oldTotal} tokens`);

console.log('\nNEW CONFIGURATION:');
console.log(`   Subsidies: ${NEW_COUNT}`);
console.log(`   System prompt: ~${systemPromptTokens} tokens`);
console.log(`   User prompt base: ~${newUserPromptBase} tokens`);
console.log(`   Subsidies context: ~${estimateTokens(newCharsPerSubsidy) * NEW_COUNT} tokens`);
console.log(`   TOTAL INPUT: ~${newTotal} tokens`);

const totalSavings = ((oldTotal - newTotal) / oldTotal * 100).toFixed(0);
console.log(`\n   TOTAL REDUCTION: ${totalSavings}%`);
console.log(`   Tokens saved: ~${oldTotal - newTotal}`);

// Rate limit analysis
console.log('\n\n📊 RATE LIMIT IMPACT:\n');

const MISTRAL_FREE_TPM = 500_000;
const MISTRAL_FREE_RPM = 2;

const oldCallsPerMin = Math.min(MISTRAL_FREE_RPM, Math.floor(MISTRAL_FREE_TPM / (oldTotal + 2000)));
const newCallsPerMin = Math.min(MISTRAL_FREE_RPM, Math.floor(MISTRAL_FREE_TPM / (newTotal + 2000)));

console.log('Mistral Free Tier (2 RPM, 500k TPM):');
console.log(`   OLD: ${oldCallsPerMin} sustainable calls/min (blocked by RPM)`);
console.log(`   NEW: ${newCallsPerMin} sustainable calls/min`);

console.log('\n\n' + '═'.repeat(80));
console.log('SUMMARY: Token usage reduced by ~' + totalSavings + '%');
console.log('═'.repeat(80));
