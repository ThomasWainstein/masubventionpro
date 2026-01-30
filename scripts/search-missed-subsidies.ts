/**
 * Search for potentially missed subsidies
 * Checks if France Bamboo's keywords appear in subsidies we might have missed
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

  const result = await response.json();
  return result;
}

async function searchByKeyword(keyword: string): Promise<any[]> {
  const query = `
    SELECT id, title, primary_sector, region, amount_max, is_universal_sector
    FROM subsidies
    WHERE is_active = true
      AND is_business_relevant = true
      AND (
        LOWER(title::text) LIKE '%${keyword.toLowerCase()}%'
        OR LOWER(description::text) LIKE '%${keyword.toLowerCase()}%'
      )
    ORDER BY amount_max DESC NULLS LAST
    LIMIT 10
  `;
  return runQuery(query);
}

async function getTopOccitanieSubsidies(): Promise<any[]> {
  const query = `
    SELECT id, title, primary_sector, region, amount_max, keywords
    FROM subsidies
    WHERE is_active = true
      AND is_business_relevant = true
      AND region @> '["Occitanie"]'
    ORDER BY amount_max DESC NULLS LAST
    LIMIT 20
  `;
  return runQuery(query);
}

async function getTopAgricultureSubsidies(): Promise<any[]> {
  const query = `
    SELECT id, title, primary_sector, region, amount_max
    FROM subsidies
    WHERE is_active = true
      AND is_business_relevant = true
      AND (
        LOWER(primary_sector) LIKE '%agri%'
        OR LOWER(title::text) LIKE '%agricol%'
        OR LOWER(title::text) LIKE '%bio%'
      )
    ORDER BY amount_max DESC NULLS LAST
    LIMIT 20
  `;
  return runQuery(query);
}

async function getTopInnovationSubsidies(): Promise<any[]> {
  const query = `
    SELECT id, title, primary_sector, region, amount_max
    FROM subsidies
    WHERE is_active = true
      AND is_business_relevant = true
      AND (
        LOWER(title::text) LIKE '%innov%'
        OR LOWER(title::text) LIKE '%france 2030%'
        OR LOWER(title::text) LIKE '%r&d%'
      )
    ORDER BY amount_max DESC NULLS LAST
    LIMIT 20
  `;
  return runQuery(query);
}

function getTitle(s: any): string {
  if (!s.title) return 'N/A';
  if (typeof s.title === 'object') return s.title.fr || s.title.en || 'N/A';
  return s.title;
}

async function main() {
  console.log('═'.repeat(100));
  console.log('SEARCHING FOR POTENTIALLY MISSED SUBSIDIES FOR FRANCE BAMBOO');
  console.log('═'.repeat(100));

  // Search by specific keywords France Bamboo should match
  const keywords = [
    'biosourcé',
    'bambou',
    'bois',
    'matériaux',
    'construction durable',
    'filière bois',
    'agriculture bio',
    'conversion bio',
    'économie circulaire',
    'décarbonation',
    'transition écologique',
    'carbone',
  ];

  console.log('\n📋 KEYWORD SEARCHES:\n');

  for (const kw of keywords) {
    const results = await searchByKeyword(kw);
    if (results && results.length > 0) {
      console.log(`\n🔍 "${kw}" - Found ${results.length} subsidies:`);
      for (const s of results.slice(0, 3)) {
        const title = getTitle(s);
        const amount = s.amount_max ? `${(s.amount_max/1000).toFixed(0)}k€` : 'N/A';
        const region = Array.isArray(s.region) ? s.region[0] : (s.region || 'N/A');
        const sector = s.primary_sector || 'Universal';
        console.log(`   • ${title.substring(0, 55).padEnd(55)} | ${amount.padStart(10)} | ${region.substring(0, 12).padEnd(12)} | ${sector}`);
      }
    }
  }

  // Get top Occitanie subsidies
  console.log('\n\n' + '═'.repeat(100));
  console.log('TOP OCCITANIE SUBSIDIES (by amount)');
  console.log('═'.repeat(100) + '\n');

  const occitanie = await getTopOccitanieSubsidies();
  for (const s of occitanie.slice(0, 15)) {
    const title = getTitle(s);
    const amount = s.amount_max ? `${(s.amount_max/1000).toFixed(0)}k€` : 'N/A';
    const sector = s.primary_sector || 'Universal';
    console.log(`   ${amount.padStart(10)} | ${title.substring(0, 65).padEnd(65)} | ${sector}`);
  }

  // Get top agriculture subsidies
  console.log('\n\n' + '═'.repeat(100));
  console.log('TOP AGRICULTURE/BIO SUBSIDIES (by amount)');
  console.log('═'.repeat(100) + '\n');

  const agri = await getTopAgricultureSubsidies();
  for (const s of agri.slice(0, 15)) {
    const title = getTitle(s);
    const amount = s.amount_max ? `${(s.amount_max/1000).toFixed(0)}k€` : 'N/A';
    const region = Array.isArray(s.region) ? s.region[0] : (s.region || 'N/A');
    console.log(`   ${amount.padStart(10)} | ${title.substring(0, 55).padEnd(55)} | ${region}`);
  }

  // Get top innovation subsidies
  console.log('\n\n' + '═'.repeat(100));
  console.log('TOP INNOVATION/FRANCE 2030 SUBSIDIES (by amount)');
  console.log('═'.repeat(100) + '\n');

  const innov = await getTopInnovationSubsidies();
  for (const s of innov.slice(0, 15)) {
    const title = getTitle(s);
    const amount = s.amount_max ? `${(s.amount_max/1000).toFixed(0)}k€` : 'N/A';
    const region = Array.isArray(s.region) ? s.region[0] : (s.region || 'N/A');
    console.log(`   ${amount.padStart(10)} | ${title.substring(0, 55).padEnd(55)} | ${region}`);
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
