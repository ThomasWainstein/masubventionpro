/**
 * Missing Fields Audit Script
 *
 * Analyzes subsidies to identify which ones are missing critical fields
 * for effective matching with user profiles.
 *
 * Critical fields for matching:
 * - eligibility_criteria - detailed requirements
 * - legal_entities - who can apply
 * - primary_sector or categories - what sectors
 * - region - geographic scope
 * - amount_min/amount_max - funding amounts
 *
 * Usage:
 *   npx tsx scripts/audit-missing-fields.ts
 *   npx tsx scripts/audit-missing-fields.ts --export
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: 'sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4',
};

interface SubsidyAudit {
  id: string;
  title: string;
  agency: string;
  missing_fields: string[];
  missing_count: number;
  has_source_url: boolean;
}

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

async function main() {
  const args = process.argv.slice(2);
  const exportMode = args.includes('--export');

  console.log('=== Missing Fields Audit ===\n');

  // Get overall stats
  console.log('Fetching overall statistics...\n');

  const statsQuery = `
    SELECT
      COUNT(*) as total_active,
      SUM(CASE WHEN is_business_relevant = true THEN 1 ELSE 0 END) as business_relevant,
      SUM(CASE WHEN eligibility_criteria IS NULL OR eligibility_criteria = '{}' THEN 1 ELSE 0 END) as no_eligibility,
      SUM(CASE WHEN legal_entities IS NULL OR array_length(legal_entities, 1) IS NULL THEN 1 ELSE 0 END) as no_legal_entities,
      SUM(CASE WHEN primary_sector IS NULL OR primary_sector = '' THEN 1 ELSE 0 END) as no_primary_sector,
      SUM(CASE WHEN categories IS NULL OR array_length(categories, 1) IS NULL THEN 1 ELSE 0 END) as no_categories,
      SUM(CASE WHEN region IS NULL OR array_length(region, 1) IS NULL THEN 1 ELSE 0 END) as no_region,
      SUM(CASE WHEN amount_min IS NULL THEN 1 ELSE 0 END) as no_amount_min,
      SUM(CASE WHEN amount_max IS NULL THEN 1 ELSE 0 END) as no_amount_max,
      SUM(CASE WHEN source_url IS NULL OR source_url = '' THEN 1 ELSE 0 END) as no_source_url
    FROM subsidies
    WHERE is_active = true
  `;

  const [stats] = await runQuery(statsQuery);

  console.log('=== OVERALL STATISTICS ===\n');
  console.log(`Total active subsidies: ${stats.total_active}`);
  console.log(`Business relevant: ${stats.business_relevant}`);
  console.log('');
  console.log('Missing fields breakdown:');
  console.log(`  - No eligibility_criteria: ${stats.no_eligibility} (${(stats.no_eligibility / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No legal_entities: ${stats.no_legal_entities} (${(stats.no_legal_entities / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No primary_sector: ${stats.no_primary_sector} (${(stats.no_primary_sector / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No categories: ${stats.no_categories} (${(stats.no_categories / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No region: ${stats.no_region} (${(stats.no_region / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No amount_min: ${stats.no_amount_min} (${(stats.no_amount_min / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No amount_max: ${stats.no_amount_max} (${(stats.no_amount_max / stats.total_active * 100).toFixed(1)}%)`);
  console.log(`  - No source_url: ${stats.no_source_url} (${(stats.no_source_url / stats.total_active * 100).toFixed(1)}%)`);

  // Business relevant stats
  console.log('\n=== BUSINESS RELEVANT SUBSIDIES ===\n');

  const businessStatsQuery = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN eligibility_criteria IS NULL OR eligibility_criteria = '{}' THEN 1 ELSE 0 END) as no_eligibility,
      SUM(CASE WHEN legal_entities IS NULL OR array_length(legal_entities, 1) IS NULL THEN 1 ELSE 0 END) as no_legal_entities,
      SUM(CASE WHEN primary_sector IS NULL OR primary_sector = '' THEN 1 ELSE 0 END) as no_primary_sector,
      SUM(CASE WHEN amount_max IS NULL THEN 1 ELSE 0 END) as no_amount_max,
      SUM(CASE WHEN source_url IS NOT NULL AND source_url != '' THEN 1 ELSE 0 END) as has_source_url
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
  `;

  const [businessStats] = await runQuery(businessStatsQuery);

  console.log(`Total business relevant: ${businessStats.total}`);
  console.log(`With source_url (can be enriched): ${businessStats.has_source_url}`);
  console.log('');
  console.log('Missing critical fields:');
  console.log(`  - No eligibility_criteria: ${businessStats.no_eligibility} (${(businessStats.no_eligibility / businessStats.total * 100).toFixed(1)}%)`);
  console.log(`  - No legal_entities: ${businessStats.no_legal_entities} (${(businessStats.no_legal_entities / businessStats.total * 100).toFixed(1)}%)`);
  console.log(`  - No primary_sector: ${businessStats.no_primary_sector} (${(businessStats.no_primary_sector / businessStats.total * 100).toFixed(1)}%)`);
  console.log(`  - No amount_max: ${businessStats.no_amount_max} (${(businessStats.no_amount_max / businessStats.total * 100).toFixed(1)}%)`);

  // Subsidies by missing field count
  console.log('\n=== PRIORITY BY MISSING FIELD COUNT ===\n');

  const priorityQuery = `
    SELECT
      (CASE WHEN eligibility_criteria IS NULL OR eligibility_criteria = '{}' THEN 1 ELSE 0 END +
       CASE WHEN legal_entities IS NULL OR array_length(legal_entities, 1) IS NULL THEN 1 ELSE 0 END +
       CASE WHEN primary_sector IS NULL OR primary_sector = '' THEN 1 ELSE 0 END +
       CASE WHEN amount_max IS NULL THEN 1 ELSE 0 END) as missing_count,
      COUNT(*) as subsidy_count
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY missing_count
    ORDER BY missing_count DESC
  `;

  const priorityResults = await runQuery(priorityQuery);

  console.log('Business relevant subsidies by number of missing critical fields:');
  for (const row of priorityResults) {
    const priority = row.missing_count === 4 ? '🔴 CRITICAL' :
                     row.missing_count === 3 ? '🟠 HIGH' :
                     row.missing_count === 2 ? '🟡 MEDIUM' :
                     row.missing_count === 1 ? '🟢 LOW' : '✅ COMPLETE';
    console.log(`  ${priority}: ${row.missing_count} fields missing - ${row.subsidy_count} subsidies`);
  }

  // Top agencies with incomplete data
  console.log('\n=== TOP AGENCIES WITH INCOMPLETE DATA ===\n');

  const agencyQuery = `
    SELECT
      agency,
      COUNT(*) as total,
      SUM(CASE WHEN eligibility_criteria IS NULL OR eligibility_criteria = '{}' THEN 1 ELSE 0 END) as no_eligibility
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY agency
    HAVING SUM(CASE WHEN eligibility_criteria IS NULL OR eligibility_criteria = '{}' THEN 1 ELSE 0 END) > 10
    ORDER BY no_eligibility DESC
    LIMIT 15
  `;

  const agencyResults = await runQuery(agencyQuery);

  console.log('Agencies with most subsidies missing eligibility criteria:');
  for (const row of agencyResults) {
    const pct = (row.no_eligibility / row.total * 100).toFixed(0);
    console.log(`  ${row.agency}: ${row.no_eligibility}/${row.total} (${pct}%)`);
  }

  // Enrichable subsidies (have source_url but missing eligibility)
  console.log('\n=== ENRICHABLE SUBSIDIES ===\n');

  const enrichableQuery = `
    SELECT COUNT(*) as count
    FROM subsidies
    WHERE is_active = true
    AND is_business_relevant = true
    AND source_url IS NOT NULL
    AND source_url != ''
    AND (eligibility_criteria IS NULL OR eligibility_criteria = '{}')
  `;

  const [enrichable] = await runQuery(enrichableQuery);

  console.log(`Subsidies that can be enriched (have source_url, missing eligibility): ${enrichable.count}`);
  console.log('These can be processed with the fix-unclear-subsidies.ts script.');

  // Export detailed list if requested
  if (exportMode) {
    console.log('\n=== EXPORTING DETAILED LIST ===\n');

    const exportQuery = `
      SELECT
        id,
        title->>'fr' as title,
        agency,
        source_url,
        CASE WHEN eligibility_criteria IS NULL OR eligibility_criteria = '{}' THEN true ELSE false END as missing_eligibility,
        CASE WHEN legal_entities IS NULL OR array_length(legal_entities, 1) IS NULL THEN true ELSE false END as missing_legal_entities,
        CASE WHEN primary_sector IS NULL OR primary_sector = '' THEN true ELSE false END as missing_sector,
        CASE WHEN amount_max IS NULL THEN true ELSE false END as missing_amount
      FROM subsidies
      WHERE is_active = true AND is_business_relevant = true
      AND (
        eligibility_criteria IS NULL OR eligibility_criteria = '{}'
        OR legal_entities IS NULL OR array_length(legal_entities, 1) IS NULL
        OR primary_sector IS NULL OR primary_sector = ''
        OR amount_max IS NULL
      )
      ORDER BY agency, title
      LIMIT 500
    `;

    const exportResults = await runQuery(exportQuery);
    console.log(`Exported ${exportResults.length} subsidies with missing fields.`);
    console.log('\nFirst 10 entries:');
    for (const row of exportResults.slice(0, 10)) {
      const missing = [];
      if (row.missing_eligibility) missing.push('eligibility');
      if (row.missing_legal_entities) missing.push('legal_entities');
      if (row.missing_sector) missing.push('sector');
      if (row.missing_amount) missing.push('amount');
      console.log(`  [${row.agency}] ${row.title?.substring(0, 50)}...`);
      console.log(`    Missing: ${missing.join(', ')}`);
      console.log(`    URL: ${row.source_url || 'NONE'}`);
    }
  }

  console.log('\n=== RECOMMENDATIONS ===\n');
  console.log('1. Run fix-unclear-subsidies.ts to enrich business subsidies with eligibility criteria');
  console.log(`   ${enrichable.count} subsidies can be automatically enriched`);
  console.log('');
  console.log('2. Focus on agencies with high incomplete rates for manual review');
  console.log('');
  console.log('3. Consider using similarity-matching.ts to inherit criteria from similar subsidies');
}

main().catch(console.error);
