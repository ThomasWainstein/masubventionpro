/**
 * Similarity Matching Script
 *
 * Finds subsidies that are similar to well-classified ones and suggests
 * inheriting eligibility criteria.
 *
 * Strategy:
 * 1. Find subsidies with complete eligibility data (templates)
 * 2. For subsidies missing eligibility, find similar templates
 * 3. Use AI to validate and adapt the inherited criteria
 *
 * Similarity is based on (core weights + bonuses):
 * - Same agency (0.35) - strongest signal for eligibility inheritance
 * - Similar title (0.25) - Levenshtein + Jaccard
 * - Same funding_type (0.10)
 * - Same region (0.10)
 * - Same primary_sector (0.10 bonus) - like profile matcher
 * - Categories overlap (0.05 bonus)
 * - Legal entities overlap (0.10 bonus) - eligibility alignment
 * - Description similarity (0.10 bonus)
 *
 * Usage:
 *   npx tsx scripts/similarity-matching.ts --analyze
 *   npx tsx scripts/similarity-matching.ts --inherit --dry-run
 *   npx tsx scripts/similarity-matching.ts --inherit --batch=50
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: 'sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  SIMILARITY_THRESHOLD: 0.6,
  BATCH_SIZE: 20,
};

interface Subsidy {
  id: string;
  title: { fr?: string } | string;
  description: { fr?: string } | string;
  agency: string;
  funding_type: string;
  region: string[];
  eligibility_criteria: { fr?: string } | null;
  legal_entities: string[] | null;
  primary_sector: string | null;
  categories: string[] | null;
}

interface SimilarityMatch {
  source: Subsidy;
  template: Subsidy;
  score: number;
  reasons: string[];
}

// Parse command line arguments
const args = process.argv.slice(2);
const analyzeMode = args.includes('--analyze');
const inheritMode = args.includes('--inherit');
const dryRun = args.includes('--dry-run');
const batchArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : CONFIG.BATCH_SIZE;

console.log('=== Similarity Matching Script ===');
console.log(`Mode: ${analyzeMode ? 'ANALYZE' : inheritMode ? (dryRun ? 'INHERIT (DRY RUN)' : 'INHERIT (LIVE)') : 'ANALYZE'}`);
console.log('');

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
    throw new Error(`Database query failed: ${error}`);
  }

  return response.json();
}

function getTitle(subsidy: Subsidy): string {
  if (typeof subsidy.title === 'object' && subsidy.title?.fr) {
    return subsidy.title.fr;
  }
  return String(subsidy.title || '');
}

function getDescription(subsidy: Subsidy): string {
  if (typeof subsidy.description === 'object' && subsidy.description?.fr) {
    return subsidy.description.fr;
  }
  return String(subsidy.description || '');
}

function getEligibility(subsidy: Subsidy): string {
  if (typeof subsidy.eligibility_criteria === 'object' && subsidy.eligibility_criteria?.fr) {
    return subsidy.eligibility_criteria.fr;
  }
  return '';
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return 1 - matrix[b.length][a.length] / maxLen;
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normalizeText(b).split(' ').filter(w => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

function calculateSimilarity(source: Subsidy, template: Subsidy): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Same agency is a strong signal (0.35 weight) - most important for eligibility inheritance
  if (source.agency === template.agency) {
    score += 0.35;
    reasons.push('same_agency');
  }

  // Title similarity (0.25 weight)
  const titleA = normalizeText(getTitle(source));
  const titleB = normalizeText(getTitle(template));
  const titleSim = Math.max(
    levenshteinSimilarity(titleA, titleB),
    jaccardSimilarity(titleA, titleB)
  );
  if (titleSim > 0.4) {
    score += titleSim * 0.25;
    reasons.push(`title_sim:${(titleSim * 100).toFixed(0)}%`);
  }

  // Same funding type (0.10 weight)
  if (source.funding_type && source.funding_type === template.funding_type) {
    score += 0.10;
    reasons.push('same_funding_type');
  }

  // Region overlap (0.10 weight)
  if (source.region && template.region) {
    const regionOverlap = source.region.some(r => template.region.includes(r));
    if (regionOverlap) {
      score += 0.10;
      reasons.push('region_overlap');
    }
  }

  // Same primary sector (0.10 weight bonus) - like our profile matcher
  if (source.primary_sector && template.primary_sector) {
    if (source.primary_sector === template.primary_sector) {
      score += 0.10;
      reasons.push('same_sector');
    }
  }

  // Categories overlap (0.05 weight bonus)
  if (source.categories && template.categories && source.categories.length > 0 && template.categories.length > 0) {
    const categoryOverlap = source.categories.some(c => template.categories!.includes(c));
    if (categoryOverlap) {
      score += 0.05;
      reasons.push('category_overlap');
    }
  }

  // Legal entities overlap (0.10 weight bonus) - eligibility alignment
  if (source.legal_entities && template.legal_entities && source.legal_entities.length > 0 && template.legal_entities.length > 0) {
    const commonEntities = source.legal_entities.filter(e => template.legal_entities!.includes(e));
    if (commonEntities.length > 0) {
      const overlapRatio = commonEntities.length / Math.max(source.legal_entities.length, template.legal_entities.length);
      score += overlapRatio * 0.10;
      reasons.push(`legal_entities:${(overlapRatio * 100).toFixed(0)}%`);
    }
  }

  // Description similarity as fallback/boost (bonus up to 0.10)
  const descA = normalizeText(getDescription(source));
  const descB = normalizeText(getDescription(template));
  if (descA.length > 20 && descB.length > 20) {
    const descSim = jaccardSimilarity(descA, descB);
    if (descSim > 0.25) {
      score += descSim * 0.10;
      reasons.push(`desc_sim:${(descSim * 100).toFixed(0)}%`);
    }
  }

  return { score, reasons };
}

async function fetchTemplates(): Promise<Subsidy[]> {
  // Fetch subsidies with complete eligibility data to use as templates
  const sql = `
    SELECT id, title, description, agency, funding_type, region, eligibility_criteria, legal_entities, primary_sector, categories
    FROM subsidies
    WHERE is_active = true
    AND is_business_relevant = true
    AND eligibility_criteria IS NOT NULL
    AND eligibility_criteria != '{}'
    AND eligibility_criteria->>'fr' IS NOT NULL
    AND length(eligibility_criteria->>'fr') > 50
    ORDER BY agency
  `;

  return runQuery(sql);
}

async function fetchIncomplete(limit: number): Promise<Subsidy[]> {
  // Fetch subsidies missing eligibility
  const sql = `
    SELECT id, title, description, agency, funding_type, region, eligibility_criteria, legal_entities, primary_sector, categories
    FROM subsidies
    WHERE is_active = true
    AND is_business_relevant = true
    AND (eligibility_criteria IS NULL OR eligibility_criteria = '{}')
    ORDER BY agency, title
    LIMIT ${limit}
  `;

  return runQuery(sql);
}

function findBestMatch(source: Subsidy, templates: Subsidy[]): SimilarityMatch | null {
  let bestMatch: SimilarityMatch | null = null;

  for (const template of templates) {
    if (source.id === template.id) continue;

    const { score, reasons } = calculateSimilarity(source, template);

    if (score >= CONFIG.SIMILARITY_THRESHOLD) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { source, template, score, reasons };
      }
    }
  }

  return bestMatch;
}

async function validateWithAI(match: SimilarityMatch): Promise<{ valid: boolean; adapted_criteria: string | null; reason: string; confidence?: number }> {
  const sourceTitle = getTitle(match.source);
  const sourceDesc = getDescription(match.source);
  const templateTitle = getTitle(match.template);
  const templateDesc = getDescription(match.template);
  const templateEligibility = getEligibility(match.template);

  const prompt = `Tu es un expert en aides publiques françaises. Évalue si les critères d'éligibilité d'une subvention peuvent être transférés à une autre.

SUBVENTION SOURCE (manque les critères d'éligibilité):
- Titre: ${sourceTitle}
- Description: ${sourceDesc || 'Non disponible'}
- Organisme: ${match.source.agency}
- Type: ${match.source.funding_type || 'Non spécifié'}
- Secteur: ${match.source.primary_sector || 'Non spécifié'}
- Régions: ${match.source.region?.join(', ') || 'National'}

SUBVENTION TEMPLATE (a des critères d'éligibilité):
- Titre: ${templateTitle}
- Description: ${templateDesc || 'Non disponible'}
- Organisme: ${match.template.agency}
- Type: ${match.template.funding_type || 'Non spécifié'}
- Secteur: ${match.template.primary_sector || 'Non spécifié'}
- Critères d'éligibilité existants: ${templateEligibility}

RAISONS DU MATCHING (score: ${(match.score * 100).toFixed(0)}%):
${match.reasons.join(', ')}

EXEMPLES DE DÉCISION:

✅ VALID - Transférer les critères:
- Même organisme + même type d'aide + bénéficiaires similaires
- Ex: "Aide PME innovation" et "Aide TPE innovation" du même organisme

❌ INVALID - Ne PAS transférer:
- Bénéficiaires différents (entreprises vs collectivités vs particuliers)
- Secteurs incompatibles (agriculture vs industrie)
- Objectifs différents (investissement vs étude vs formation)
- Ex: "Aide aux ports" ne peut pas hériter de "Aide à la R&D"

QUESTION: Les critères du TEMPLATE peuvent-ils s'appliquer à la SOURCE?

RÈGLES STRICTES:
1. valid=true UNIQUEMENT si les bénéficiaires cibles sont identiques ou très proches
2. Si valid=true, adapted_criteria doit être basé UNIQUEMENT sur le texte du TEMPLATE (ne pas inventer)
3. Adapter le texte au contexte de la SOURCE mais garder la substance du TEMPLATE
4. En cas de doute, valid=false (mieux vaut ne pas transférer que transférer à tort)

Réponds UNIQUEMENT avec un JSON valide:
{
  "valid": true ou false,
  "confidence": 0-100,
  "adapted_criteria": "Critères adaptés basés sur le TEMPLATE (ou null si invalid)",
  "reason": "Explication en 1-2 phrases"
}`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '{}';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { valid: false, adapted_criteria: null, reason: 'Failed to parse AI response', confidence: 0 };
  }

  const result = JSON.parse(jsonMatch[0]);

  // Reject low confidence validations
  if (result.valid && result.confidence < 70) {
    return {
      valid: false,
      adapted_criteria: null,
      reason: `Low confidence (${result.confidence}%): ${result.reason}`,
      confidence: result.confidence
    };
  }

  return result;
}

async function updateSubsidy(id: string, eligibility: string): Promise<void> {
  const escaped = eligibility.replace(/'/g, "''");
  const sql = `
    UPDATE subsidies
    SET eligibility_criteria = '{"fr": "${escaped}"}'
    WHERE id = '${id}'
  `;
  await runQuery(sql);
}

async function main() {
  console.log('Fetching template subsidies (with complete eligibility)...');
  const templates = await fetchTemplates();
  console.log(`Found ${templates.length} template subsidies\n`);

  if (templates.length === 0) {
    console.log('No templates found. Run fix-unclear-subsidies.ts first to create templates.');
    return;
  }

  // Group templates by agency for faster lookup
  const templatesByAgency = new Map<string, Subsidy[]>();
  for (const t of templates) {
    if (!templatesByAgency.has(t.agency)) {
      templatesByAgency.set(t.agency, []);
    }
    templatesByAgency.get(t.agency)!.push(t);
  }

  console.log(`Templates span ${templatesByAgency.size} agencies\n`);

  if (analyzeMode || !inheritMode) {
    // Analyze potential matches
    console.log('=== ANALYZING POTENTIAL MATCHES ===\n');

    const incomplete = await fetchIncomplete(500);
    console.log(`Analyzing ${incomplete.length} incomplete subsidies...\n`);

    let matchCount = 0;
    const matchesByAgency = new Map<string, number>();

    for (const source of incomplete) {
      // Prioritize templates from same agency
      const agencyTemplates = templatesByAgency.get(source.agency) || [];
      const allTemplates = [...agencyTemplates, ...templates.filter(t => t.agency !== source.agency)];

      const match = findBestMatch(source, allTemplates);
      if (match) {
        matchCount++;
        const agency = source.agency;
        matchesByAgency.set(agency, (matchesByAgency.get(agency) || 0) + 1);
      }
    }

    console.log(`Found ${matchCount} potential matches out of ${incomplete.length} incomplete subsidies`);
    console.log(`Match rate: ${(matchCount / incomplete.length * 100).toFixed(1)}%\n`);

    console.log('Top agencies with matchable subsidies:');
    const sortedAgencies = [...matchesByAgency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [agency, count] of sortedAgencies) {
      console.log(`  ${agency}: ${count} matches`);
    }
  }

  if (inheritMode) {
    console.log('\n=== INHERITING ELIGIBILITY CRITERIA ===\n');

    if (!CONFIG.DEEPSEEK_API_KEY) {
      console.error('ERROR: DEEPSEEK_API_KEY not found in .env');
      process.exit(1);
    }

    const incomplete = await fetchIncomplete(batchSize);
    console.log(`Processing ${incomplete.length} incomplete subsidies...\n`);

    let inherited = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < incomplete.length; i++) {
      const source = incomplete[i];
      const title = getTitle(source).substring(0, 50);
      console.log(`[${i + 1}/${incomplete.length}] ${title}...`);

      try {
        // Find best match
        const agencyTemplates = templatesByAgency.get(source.agency) || [];
        const allTemplates = [...agencyTemplates, ...templates.filter(t => t.agency !== source.agency)];
        const match = findBestMatch(source, allTemplates);

        if (!match) {
          console.log(`  ⚠️  No similar template found`);
          skipped++;
          continue;
        }

        console.log(`  Found match: ${getTitle(match.template).substring(0, 40)}... (score: ${(match.score * 100).toFixed(0)}%)`);
        console.log(`  Reasons: ${match.reasons.join(', ')}`);

        // Validate with AI
        console.log(`  Validating with AI...`);
        const validation = await validateWithAI(match);

        if (!validation.valid) {
          console.log(`  ❌ Not valid (conf: ${validation.confidence || '?'}%): ${validation.reason}`);
          skipped++;
          continue;
        }

        console.log(`  ✅ Valid (conf: ${validation.confidence || '?'}%): ${validation.reason}`);

        if (!dryRun && validation.adapted_criteria) {
          await updateSubsidy(source.id, validation.adapted_criteria);
          console.log(`  💾 Database updated`);
        }

        inherited++;

      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
        errors++;
      }

      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Inherited: ${inherited}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made');
    }
  }
}

main().catch(console.error);
