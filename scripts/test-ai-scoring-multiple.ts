/**
 * Test V5 AI Scoring Pipeline on Multiple Profiles
 *
 * Calls the actual v5-hybrid-calculate-matches edge function
 * to test the full pre-scoring + AI refinement pipeline.
 */

import 'dotenv/config';

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
};

// ============================================================================
// TYPES
// ============================================================================

interface ProfileInput {
  id: string;
  company_name: string;
  siret?: string;
  naf_code?: string;
  naf_label?: string;
  sector?: string;
  sub_sector?: string;
  region?: string;
  department?: string;
  employees?: string;
  annual_turnover?: number;
  year_created?: number;
  legal_form?: string;
  company_category?: string;
  project_types?: string[];
  certifications?: string[];
  description?: string;
  website_intelligence?: any;
}

interface MatchResult {
  subsidy_id: string;
  match_score: number;
  success_probability: number;
  match_reasons: string[];
  matching_criteria: string[];
  missing_criteria: string[];
}

interface MatchResponse {
  matches: MatchResult[];
  processing_time_ms: number;
  tokens_used: { input: number; output: number };
  pipeline_stats?: {
    candidates_fetched: number;
    pre_scored_count: number;
    ai_evaluated: boolean;
  };
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
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

async function callV5Matcher(profile: ProfileInput, limit: number = 15): Promise<MatchResponse> {
  const functionUrl = `${CONFIG.SUPABASE_URL}/functions/v1/v5-hybrid-calculate-matches`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile, limit }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        matches: [],
        processing_time_ms: 0,
        tokens_used: { input: 0, output: 0 },
        error: `HTTP ${response.status}: ${text.substring(0, 200)}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      matches: [],
      processing_time_ms: 0,
      tokens_used: { input: 0, output: 0 },
      error: (error as Error).message,
    };
  }
}

async function getSubsidyTitles(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const idsStr = ids.map(id => `'${id}'`).join(',');
  const query = `
    SELECT id, title
    FROM subsidies
    WHERE id IN (${idsStr})
  `;

  const results = await runQuery(query);
  const map = new Map<string, string>();

  if (Array.isArray(results)) {
    for (const r of results) {
      const title = typeof r.title === 'object' ? r.title?.fr : r.title;
      map.set(r.id, title || 'Unknown');
    }
  }

  return map;
}

function buildProfileFromApplicant(rawProfile: any): ProfileInput {
  const data = rawProfile.profile_data || {};

  return {
    id: rawProfile.id,
    company_name: rawProfile.profile_name || data.companyName || data.company_name || 'Unknown',
    siret: data.siret,
    naf_code: data.naf_code || data.nafCode,
    naf_label: data.naf_label,
    sector: data.sector || data.main_sector,
    sub_sector: data.sub_sector,
    region: data.region,
    department: data.department,
    employees: data.employees || data.employee_count,
    annual_turnover: data.annual_turnover || data.revenue,
    year_created: data.year_created,
    legal_form: data.legal_form || data.legalStatus,
    project_types: data.project_types,
    certifications: data.certifications,
    description: data.description || data.activity_description,
    website_intelligence: data.website_intelligence,
  };
}

// ============================================================================
// MAIN TEST
// ============================================================================

async function main() {
  console.log('═'.repeat(100));
  console.log('V5 AI SCORING TEST: MULTIPLE PROFILES');
  console.log('═'.repeat(100));
  console.log('\nThis test calls the actual v5-hybrid-calculate-matches edge function');
  console.log('which includes: Pre-scoring → Mistral AI evaluation → Final ranking\n');

  // Get diverse profiles
  const profileQuery = `
    SELECT id, profile_name, profile_data, completion_percentage
    FROM applicant_profiles
    WHERE profile_data IS NOT NULL
      AND completion_percentage >= 60
    ORDER BY completion_percentage DESC
    LIMIT 8
  `;

  const rawProfiles = await runQuery(profileQuery);
  if (!Array.isArray(rawProfiles)) {
    console.log('Error fetching profiles:', rawProfiles);
    return;
  }

  console.log(`Testing ${rawProfiles.length} profiles...\n`);

  const results: {
    name: string;
    sector: string;
    region: string;
    matchCount: number;
    topScore: number;
    avgScore: number;
    aiEvaluated: boolean;
    processingTime: number;
    tokensUsed: number;
    topMatches: { title: string; score: number; reasons: string[] }[];
    error?: string;
  }[] = [];

  for (const rawProfile of rawProfiles) {
    const profile = buildProfileFromApplicant(rawProfile);

    console.log('─'.repeat(100));
    console.log(`\n🔄 Testing: ${profile.company_name}`);
    console.log(`   Sector: ${profile.sector || 'Unknown'} | Region: ${profile.region || 'National'}`);
    console.log(`   NAF: ${profile.naf_code || 'N/A'} | Employees: ${profile.employees || 'N/A'}`);

    // Call the V5 matcher
    console.log('   Calling v5-hybrid-calculate-matches...');
    const startTime = Date.now();
    const response = await callV5Matcher(profile, 15);
    const totalTime = Date.now() - startTime;

    if (response.error) {
      console.log(`   ❌ Error: ${response.error}`);
      results.push({
        name: profile.company_name,
        sector: profile.sector || 'Unknown',
        region: profile.region || 'National',
        matchCount: 0,
        topScore: 0,
        avgScore: 0,
        aiEvaluated: false,
        processingTime: totalTime,
        tokensUsed: 0,
        topMatches: [],
        error: response.error,
      });
      continue;
    }

    // Get subsidy titles
    const subsidyIds = response.matches.map(m => m.subsidy_id);
    const titleMap = await getSubsidyTitles(subsidyIds);

    // Calculate stats
    const scores = response.matches.map(m => m.match_score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;

    const topMatches = response.matches.slice(0, 5).map(m => ({
      title: titleMap.get(m.subsidy_id) || 'Unknown',
      score: m.match_score,
      reasons: m.match_reasons,
    }));

    results.push({
      name: profile.company_name,
      sector: profile.sector || 'Unknown',
      region: profile.region || 'National',
      matchCount: response.matches.length,
      topScore,
      avgScore: Math.round(avgScore),
      aiEvaluated: response.pipeline_stats?.ai_evaluated || false,
      processingTime: response.processing_time_ms,
      tokensUsed: response.tokens_used.input + response.tokens_used.output,
      topMatches,
    });

    // Display results
    console.log(`   ✅ Found ${response.matches.length} matches in ${response.processing_time_ms}ms`);
    console.log(`   AI evaluated: ${response.pipeline_stats?.ai_evaluated ? 'Yes' : 'No (fallback)'}`);
    console.log(`   Tokens used: ${response.tokens_used.input} in / ${response.tokens_used.output} out`);

    if (response.pipeline_stats) {
      console.log(`   Pipeline: ${response.pipeline_stats.candidates_fetched} fetched → ${response.pipeline_stats.pre_scored_count} pre-scored → ${response.matches.length} returned`);
    }

    console.log(`\n   Top 5 Matches:`);
    for (let i = 0; i < topMatches.length; i++) {
      const m = topMatches[i];
      console.log(`   ${(i + 1).toString().padStart(2)}. ${m.score.toString().padStart(2)}pts │ ${m.title.substring(0, 55)}`);
      if (m.reasons.length > 0) {
        console.log(`       └─ ${m.reasons.slice(0, 2).join(', ')}`);
      }
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n' + '═'.repeat(100));
  console.log('SUMMARY');
  console.log('═'.repeat(100));

  console.log('\n┌─────────────────────────────────┬──────────────────┬──────────────┬─────────┬─────────┬──────────┬────────────┐');
  console.log('│ Profile                         │ Sector           │ Region       │ Matches │ Top Scr │ Avg Scr  │ AI Eval    │');
  console.log('├─────────────────────────────────┼──────────────────┼──────────────┼─────────┼─────────┼──────────┼────────────┤');

  for (const r of results) {
    const name = r.name.substring(0, 31).padEnd(31);
    const sector = (r.sector || 'Unknown').substring(0, 16).padEnd(16);
    const region = (r.region || 'National').substring(0, 12).padEnd(12);
    const matches = r.matchCount.toString().padStart(7);
    const topScr = r.topScore.toString().padStart(7);
    const avgScr = r.avgScore.toString().padStart(8);
    const aiEval = (r.aiEvaluated ? '✅ Yes' : '❌ No').padEnd(10);

    console.log(`│ ${name} │ ${sector} │ ${region} │ ${matches} │ ${topScr} │ ${avgScr} │ ${aiEval} │`);
  }

  console.log('└─────────────────────────────────┴──────────────────┴──────────────┴─────────┴─────────┴──────────┴────────────┘');

  // Performance stats
  const successfulResults = results.filter(r => !r.error);
  if (successfulResults.length > 0) {
    const avgTime = successfulResults.reduce((a, b) => a + b.processingTime, 0) / successfulResults.length;
    const avgTokens = successfulResults.reduce((a, b) => a + b.tokensUsed, 0) / successfulResults.length;
    const aiEvalCount = successfulResults.filter(r => r.aiEvaluated).length;

    console.log('\n📊 Performance Metrics:');
    console.log(`   Average processing time: ${Math.round(avgTime)}ms`);
    console.log(`   Average tokens used: ${Math.round(avgTokens)}`);
    console.log(`   AI evaluation success rate: ${aiEvalCount}/${successfulResults.length} (${Math.round(aiEvalCount / successfulResults.length * 100)}%)`);
  }

  // Quality analysis
  console.log('\n🎯 Quality Analysis:');
  for (const r of successfulResults.slice(0, 5)) {
    if (r.topMatches.length > 0) {
      console.log(`\n   ${r.name}:`);
      console.log(`   Top match: "${r.topMatches[0].title.substring(0, 50)}..." (${r.topMatches[0].score}pts)`);
      if (r.topMatches[0].reasons.length > 0) {
        console.log(`   Reasons: ${r.topMatches[0].reasons.slice(0, 3).join(', ')}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
