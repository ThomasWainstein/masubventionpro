/**
 * Fix Unclear Subsidies Script
 *
 * Re-analyzes subsidies that got "unclear classification" during the initial cleanup
 * with smarter prompts and chain-of-thought reasoning.
 *
 * Strategy:
 * 1. Find subsidies with no eligibility that weren't classified
 * 2. Use enhanced prompts with examples of well-classified subsidies
 * 3. Ask AI to explain reasoning step-by-step
 * 4. Lower confidence threshold for associations (many are legitimate business subsidies)
 *
 * Usage:
 *   npx tsx scripts/fix-unclear-subsidies.ts --batch=20 --dry-run
 *   npx tsx scripts/fix-unclear-subsidies.ts --batch=50
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: 'sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  BATCH_SIZE: 20,
  DELAY_BETWEEN_REQUESTS_MS: 1000,
};

interface Subsidy {
  id: string;
  title: { fr?: string } | string;
  description: { fr?: string } | string;
  agency: string;
  source_url: string;
  region: string[];
  funding_type: string;
}

interface SubsidyAnalysis {
  classification: 'business' | 'individual' | 'municipality' | 'association' | 'mixed' | 'unclear';
  is_business_relevant: boolean;
  eligibility_criteria_fr: string | null;
  target_entities: string[];
  confidence: number;
  reasoning: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : CONFIG.BATCH_SIZE;

console.log('=== Fix Unclear Subsidies Script ===');
console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
console.log(`Batch size: ${batchSize}`);
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

async function fetchUnclearSubsidies(limit: number): Promise<Subsidy[]> {
  // Find business-relevant subsidies that still lack eligibility criteria
  const sql = `
    SELECT id, title, description, agency, source_url, region, funding_type
    FROM subsidies
    WHERE is_active = true
    AND is_business_relevant = true
    AND source_url IS NOT NULL
    AND source_url != ''
    AND (eligibility_criteria IS NULL OR eligibility_criteria = '{}')
    ORDER BY agency, title
    LIMIT ${limit}
  `;

  return runQuery(sql);
}

async function fetchWebpage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return extractTextFromHtml(html);
  } finally {
    clearTimeout(timeout);
  }
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

  text = text.replace(/<[^>]+>/g, ' ');

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/g, '€')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'");

  return text.replace(/\s+/g, ' ').trim();
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

async function analyzeWithDeepSeek(
  subsidy: Subsidy,
  pageContent: string
): Promise<SubsidyAnalysis> {
  const title = getTitle(subsidy);
  const description = getDescription(subsidy);

  // Enhanced prompt with examples and chain-of-thought
  const prompt = `Tu es un expert en aides publiques françaises. Analyse cette aide/subvention et détermine précisément qui peut en bénéficier.

EXEMPLES DE CLASSIFICATION:

1. ENTREPRISE (business):
   - "Aide à l'investissement des PME" → business
   - "Prêt croissance TPE" → business
   - "Subvention transformation numérique entreprises" → business

2. PARTICULIER (individual):
   - "Bourse étudiante" → individual
   - "Aide au permis de conduire" → individual
   - "Allocation logement" → individual

3. COLLECTIVITÉ (municipality):
   - "Aide aux communes pour équipements sportifs" → municipality
   - "Soutien aux EPCI" → municipality
   - "Dotation d'équipement des territoires ruraux" → municipality

4. ASSOCIATION (association) - SOUVENT BUSINESS RELEVANT:
   - "Subvention aux associations sportives" → association (business_relevant si structure employeuse)
   - "Aide aux associations culturelles" → association (business_relevant si activité économique)
   - "Soutien aux clubs sportifs" → association (business_relevant)

5. MIXTE (mixed) - Plusieurs bénéficiaires possibles:
   - "Aide à la rénovation énergétique" (particuliers ET entreprises) → mixed, business_relevant=true
   - "Soutien aux acteurs culturels" (assos ET entreprises) → mixed, business_relevant=true

AIDE À ANALYSER:

TITRE: ${title}
ORGANISME: ${subsidy.agency}
TYPE: ${subsidy.funding_type || 'Non spécifié'}
DESCRIPTION: ${description || 'Non disponible'}
URL: ${subsidy.source_url}

CONTENU DE LA PAGE (extrait):
${pageContent.substring(0, 8000)}

INSTRUCTIONS:
1. Lis attentivement le contenu
2. Identifie les bénéficiaires mentionnés
3. Raisonne étape par étape
4. Choisis la classification appropriée

IMPORTANT:
- Les associations avec activité économique (employeurs, prestations de service) sont BUSINESS RELEVANT
- Les aides "mixtes" accessibles aux entreprises sont BUSINESS RELEVANT
- En cas de doute entre association et business, choisis association avec business_relevant=true

Réponds UNIQUEMENT avec un JSON valide:
{
  "classification": "business" | "individual" | "municipality" | "association" | "mixed" | "unclear",
  "is_business_relevant": true ou false,
  "eligibility_criteria_fr": "Description détaillée des critères d'éligibilité en français",
  "target_entities": ["entreprise", "PME", "association", "collectivite", "particulier", etc.],
  "confidence": 0-100,
  "reasoning": "Explication de ton raisonnement en 2-3 phrases"
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
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '{}';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON in response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function updateSubsidy(id: string, analysis: SubsidyAnalysis): Promise<void> {
  const escapeSql = (str: string | null) => str ? str.replace(/'/g, "''") : null;

  // Always update is_business_relevant based on analysis
  const isBusinessRelevant = analysis.is_business_relevant;
  const criteria = escapeSql(analysis.eligibility_criteria_fr);

  let sql: string;

  if (analysis.classification === 'unclear' || analysis.confidence < 50) {
    // Still unclear - just mark for manual review
    sql = `
      UPDATE subsidies SET
        archive_reason = 'Needs manual review - AI confidence: ${analysis.confidence}%'
      WHERE id = '${id}'
    `;
  } else {
    sql = `
      UPDATE subsidies SET
        is_business_relevant = ${isBusinessRelevant}
        ${criteria ? `, eligibility_criteria = '{"fr": "${criteria}"}'` : ''}
      WHERE id = '${id}'
    `;
  }

  await runQuery(sql);
}

async function main() {
  if (!CONFIG.DEEPSEEK_API_KEY) {
    console.error('ERROR: DEEPSEEK_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('Fetching unclear subsidies...');
  const subsidies = await fetchUnclearSubsidies(batchSize);
  console.log(`Found ${subsidies.length} unclear subsidies to process\n`);

  if (subsidies.length === 0) {
    console.log('No unclear subsidies to process!');
    return;
  }

  const results = {
    business: 0,
    individual: 0,
    municipality: 0,
    association: 0,
    mixed: 0,
    unclear: 0,
    errors: 0,
  };

  let processed = 0;

  for (const subsidy of subsidies) {
    processed++;
    const title = getTitle(subsidy);
    console.log(`[${processed}/${subsidies.length}] Processing: ${title.substring(0, 50)}...`);

    try {
      // Fetch webpage
      console.log(`  Fetching URL...`);
      const pageContent = await fetchWebpage(subsidy.source_url);

      if (pageContent.length < 100) {
        console.log(`  ⚠️  Skipped: content too short`);
        results.errors++;
        continue;
      }

      // Analyze with DeepSeek
      console.log(`  Analyzing with enhanced prompt...`);
      const analysis = await analyzeWithDeepSeek(subsidy, pageContent);

      // Log result
      const icon = {
        business: '✅',
        individual: '👤',
        municipality: '🏛️',
        association: '🏢',
        mixed: '🔀',
        unclear: '❓',
      }[analysis.classification] || '❓';

      console.log(`  ${icon} ${analysis.classification} (confidence: ${analysis.confidence}%)`);
      console.log(`     Business relevant: ${analysis.is_business_relevant}`);
      console.log(`     Reasoning: ${analysis.reasoning.substring(0, 80)}...`);

      results[analysis.classification]++;

      // Update database if not dry run
      if (!dryRun && analysis.classification !== 'unclear') {
        await updateSubsidy(subsidy.id, analysis);
        console.log(`  💾 Database updated`);
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      results.errors++;
    }

    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS_MS));
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Business subsidies: ${results.business}`);
  console.log(`Individual aids: ${results.individual}`);
  console.log(`Municipality aids: ${results.municipality}`);
  console.log(`Association aids: ${results.association}`);
  console.log(`Mixed (multi-target): ${results.mixed}`);
  console.log(`Still unclear: ${results.unclear}`);
  console.log(`Errors: ${results.errors}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database');
  }
}

main().catch(console.error);
