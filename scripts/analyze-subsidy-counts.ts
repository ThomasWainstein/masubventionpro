/**
 * Analyze Subsidy Counts
 *
 * Get total counts and breakdowns by region, sector, amount
 */

import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
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

async function main() {
  console.log('═'.repeat(80));
  console.log('SUBSIDY DATABASE ANALYSIS');
  console.log('═'.repeat(80));

  // Total and active counts
  const countResult = await runQuery(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true) as active,
      COUNT(*) FILTER (WHERE is_active = true AND is_business_relevant = true) as business_relevant
    FROM subsidies
  `);

  if (Array.isArray(countResult) && countResult[0]) {
    console.log(`\n📊 TOTAL SUBSIDIES: ${countResult[0].total}`);
    console.log(`   Active: ${countResult[0].active}`);
    console.log(`   Business-relevant: ${countResult[0].business_relevant}`);
  }

  // By region
  console.log('\n\n📍 BY REGION:\n');
  const regionResult = await runQuery(`
    SELECT unnest(region) as region_name, COUNT(*) as count
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY region_name
    ORDER BY count DESC
    LIMIT 20
  `);

  if (Array.isArray(regionResult)) {
    for (const row of regionResult) {
      console.log(`   ${(row.region_name || 'N/A').padEnd(35)} ${String(row.count).padStart(5)}`);
    }
  }

  // By sector
  console.log('\n\n🏭 BY SECTOR:\n');
  const sectorResult = await runQuery(`
    SELECT COALESCE(primary_sector, 'Non spécifié') as sector, COUNT(*) as count
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY sector
    ORDER BY count DESC
    LIMIT 25
  `);

  if (Array.isArray(sectorResult)) {
    for (const row of sectorResult) {
      console.log(`   ${(row.sector || 'N/A').padEnd(40)} ${String(row.count).padStart(5)}`);
    }
  }

  // By amount range
  console.log('\n\n💰 BY AMOUNT RANGE:\n');
  const amountResult = await runQuery(`
    SELECT
      CASE
        WHEN amount_max IS NULL THEN 'Non spécifié'
        WHEN amount_max < 10000 THEN '< 10k€'
        WHEN amount_max < 50000 THEN '10k - 50k€'
        WHEN amount_max < 200000 THEN '50k - 200k€'
        WHEN amount_max < 1000000 THEN '200k - 1M€'
        WHEN amount_max < 10000000 THEN '1M - 10M€'
        ELSE '> 10M€'
      END as range,
      COUNT(*) as count
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY range
    ORDER BY count DESC
  `);

  if (Array.isArray(amountResult)) {
    for (const row of amountResult) {
      console.log(`   ${(row.range || 'N/A').padEnd(20)} ${String(row.count).padStart(5)}`);
    }
  }

  // By legal entity type
  console.log('\n\n🏢 BY LEGAL ENTITY TYPE:\n');
  const entityResult = await runQuery(`
    SELECT unnest(legal_entities) as entity, COUNT(*) as count
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY entity
    ORDER BY count DESC
    LIMIT 15
  `);

  if (Array.isArray(entityResult)) {
    for (const row of entityResult) {
      console.log(`   ${(row.entity || 'N/A').padEnd(30)} ${String(row.count).padStart(5)}`);
    }
  }

  // By funding type
  console.log('\n\n📋 BY FUNDING TYPE:\n');
  const fundingResult = await runQuery(`
    SELECT COALESCE(funding_type, 'Non spécifié') as funding, COUNT(*) as count
    FROM subsidies
    WHERE is_active = true AND is_business_relevant = true
    GROUP BY funding
    ORDER BY count DESC
    LIMIT 10
  `);

  if (Array.isArray(fundingResult)) {
    for (const row of fundingResult) {
      console.log(`   ${(row.funding || 'N/A').padEnd(35)} ${String(row.count).padStart(5)}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
}

main().catch(console.error);
