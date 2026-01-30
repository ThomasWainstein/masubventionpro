/**
 * Subsidy Cleanup Script
 *
 * Run locally to process subsidies with missing eligibility data:
 * 1. Fetches subsidies with no eligibility info
 * 2. Visits each source_url
 * 3. Uses DeepSeek AI to classify and extract eligibility
 * 4. Updates the database
 *
 * Usage:
 *   npx tsx scripts/cleanup-subsidies.ts --batch=10 --dry-run
 *   npx tsx scripts/cleanup-subsidies.ts --batch=50
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Configuration
const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: 'sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  BATCH_SIZE: 10,
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
  is_business_subsidy: boolean;
  is_for_individuals: boolean;
  is_for_municipalities: boolean;
  is_news_or_announcement: boolean;
  eligibility_criteria_fr: string | null;
  target_entities: string[];
  size_restrictions: string | null;
  sector_restrictions: string[];
  geographic_restrictions: string | null;
  confidence: number;
  reason: string;
}

interface ProcessResult {
  id: string;
  title: string;
  source_url: string;
  action: string;
  analysis?: SubsidyAnalysis;
  error?: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : CONFIG.BATCH_SIZE;

console.log('=== Subsidy Cleanup Script (DeepSeek AI) ===');
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

async function fetchSubsidiesWithNoEligibility(limit: number): Promise<Subsidy[]> {
  const sql = `
    SELECT id, title, description, agency, source_url, region, funding_type
    FROM subsidies
    WHERE is_active = true
    AND source_url IS NOT NULL
    AND source_url != ''
    AND (eligibility_criteria IS NULL OR eligibility_criteria = '{}')
    AND (eligibility IS NULL OR eligibility = '' OR eligibility = '{}')
    AND (legal_entities IS NULL OR array_length(legal_entities, 1) IS NULL)
    AND (targeted_audiences IS NULL OR array_length(targeted_audiences, 1) IS NULL)
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

async function analyzeWithDeepSeek(
  subsidy: Subsidy,
  pageContent: string
): Promise<SubsidyAnalysis> {
  const title = typeof subsidy.title === 'object' ? subsidy.title?.fr : subsidy.title;
  const description = typeof subsidy.description === 'object' ? subsidy.description?.fr : subsidy.description;

  const prompt = `Analyse cette page web et détermine s'il s'agit d'une aide/subvention pour les entreprises.

TITRE: ${title}
ORGANISME: ${subsidy.agency}
TYPE: ${subsidy.funding_type || 'Non spécifié'}
DESCRIPTION: ${description || 'Non disponible'}
URL: ${subsidy.source_url}

CONTENU DE LA PAGE (extrait):
${pageContent.substring(0, 6000)}

Réponds UNIQUEMENT avec un JSON valide au format suivant:
{
  "is_business_subsidy": true ou false,
  "is_for_individuals": true ou false,
  "is_for_municipalities": true ou false,
  "is_news_or_announcement": true ou false,
  "eligibility_criteria_fr": "Description des critères d'éligibilité en français ou null si non applicable",
  "target_entities": ["entreprise", "PME", "association", "collectivite", "particulier", etc.],
  "size_restrictions": "Restrictions de taille ou null",
  "sector_restrictions": ["secteurs concernés ou exclus"],
  "geographic_restrictions": "Restrictions géographiques ou null si national",
  "confidence": 0-100,
  "reason": "Brève explication de la classification"
}

Règles importantes:
- Si c'est une actualité/annonce (ouverture, événement, etc.), is_news_or_announcement = true
- Si l'aide est pour étudiants/lycéens/familles, is_for_individuals = true
- Si l'aide est uniquement pour communes/EPCI, is_for_municipalities = true
- confidence = 100 si très sûr, < 50 si incertain
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après`;

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
  // Escape single quotes for SQL
  const escapeSql = (str: string | null) => str ? str.replace(/'/g, "''") : null;

  let sql: string;

  if (analysis.is_news_or_announcement) {
    sql = `
      UPDATE subsidies SET
        is_active = false,
        is_business_relevant = false,
        archive_reason = 'AI classified as news/announcement, not a subsidy'
      WHERE id = '${id}'
    `;
  } else if (analysis.is_for_individuals && !analysis.is_business_subsidy) {
    const criteria = escapeSql(analysis.eligibility_criteria_fr);
    sql = `
      UPDATE subsidies SET
        is_business_relevant = false
        ${criteria ? `, eligibility_criteria = '{"fr": "${criteria}"}'` : ''}
      WHERE id = '${id}'
    `;
  } else if (analysis.is_for_municipalities && !analysis.is_business_subsidy) {
    const criteria = escapeSql(analysis.eligibility_criteria_fr);
    sql = `
      UPDATE subsidies SET
        is_business_relevant = false
        ${criteria ? `, eligibility_criteria = '{"fr": "${criteria}"}'` : ''}
      WHERE id = '${id}'
    `;
  } else if (analysis.is_business_subsidy && analysis.eligibility_criteria_fr) {
    const criteria = escapeSql(analysis.eligibility_criteria_fr);
    const isUniversal =
      !analysis.size_restrictions &&
      analysis.sector_restrictions.length === 0 &&
      !analysis.geographic_restrictions &&
      analysis.target_entities.includes('entreprise') &&
      analysis.confidence > 80;

    sql = `
      UPDATE subsidies SET
        is_business_relevant = true,
        eligibility_criteria = '{"fr": "${criteria}"}',
        is_universal_sector = ${isUniversal}
      WHERE id = '${id}'
    `;
  } else {
    return;
  }

  await runQuery(sql);
}

async function main() {
  if (!CONFIG.DEEPSEEK_API_KEY) {
    console.error('ERROR: DEEPSEEK_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('Fetching subsidies with no eligibility data...');
  const subsidies = await fetchSubsidiesWithNoEligibility(batchSize);
  console.log(`Found ${subsidies.length} subsidies to process\n`);

  if (subsidies.length === 0) {
    console.log('No subsidies to process!');
    return;
  }

  const results: ProcessResult[] = [];
  let processed = 0;

  for (const subsidy of subsidies) {
    processed++;
    const title = typeof subsidy.title === 'object' ? subsidy.title?.fr : subsidy.title;
    console.log(`[${processed}/${subsidies.length}] Processing: ${(title || 'Unknown').substring(0, 50)}...`);

    const result: ProcessResult = {
      id: subsidy.id,
      title: title || 'Unknown',
      source_url: subsidy.source_url,
      action: 'none',
    };

    try {
      // Fetch webpage
      console.log(`  Fetching URL...`);
      const pageContent = await fetchWebpage(subsidy.source_url);

      if (pageContent.length < 100) {
        result.action = 'skipped_no_content';
        result.error = 'Page content too short';
        console.log(`  ⚠️  Skipped: content too short`);
        results.push(result);
        continue;
      }

      // Analyze with DeepSeek
      console.log(`  Analyzing with DeepSeek AI...`);
      const analysis = await analyzeWithDeepSeek(subsidy, pageContent);
      result.analysis = analysis;

      // Determine action
      if (analysis.is_news_or_announcement) {
        result.action = 'deactivate_not_subsidy';
        console.log(`  ❌ News/announcement - will deactivate`);
      } else if (analysis.is_for_individuals && !analysis.is_business_subsidy) {
        result.action = 'mark_not_business';
        console.log(`  👤 For individuals only`);
      } else if (analysis.is_for_municipalities && !analysis.is_business_subsidy) {
        result.action = 'mark_municipalities_only';
        console.log(`  🏛️  For municipalities only`);
      } else if (analysis.is_business_subsidy) {
        result.action = 'update_eligibility';
        console.log(`  ✅ Business subsidy - confidence: ${analysis.confidence}%`);
      } else {
        result.action = 'unclear';
        console.log(`  ❓ Unclear classification`);
      }

      // Update database if not dry run
      if (!dryRun && result.action !== 'none' && result.action !== 'unclear') {
        await updateSubsidy(subsidy.id, analysis);
        console.log(`  💾 Database updated`);
      }

    } catch (error: any) {
      result.action = 'error';
      result.error = error.message;
      console.log(`  ❌ Error: ${error.message}`);
    }

    results.push(result);

    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS_MS));
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total processed: ${results.length}`);
  console.log(`Deactivated (not subsidies): ${results.filter(r => r.action === 'deactivate_not_subsidy').length}`);
  console.log(`Marked not for business: ${results.filter(r => r.action === 'mark_not_business').length}`);
  console.log(`Marked municipalities only: ${results.filter(r => r.action === 'mark_municipalities_only').length}`);
  console.log(`Updated eligibility: ${results.filter(r => r.action === 'update_eligibility').length}`);
  console.log(`Skipped/Errors: ${results.filter(r => r.action.startsWith('skip') || r.action === 'error').length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database');
  }
}

main().catch(console.error);
