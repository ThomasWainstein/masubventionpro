/**
 * List masubventionpro profiles
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
  console.log('═'.repeat(100));
  console.log('MASUBVENTIONPRO COMPANY PROFILES');
  console.log('═'.repeat(100));

  const query = `
    SELECT *
    FROM masubventionpro_profiles
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 20
  `;

  const profiles = await runQuery(query);

  if (!Array.isArray(profiles)) {
    console.log('Error:', profiles);
    return;
  }

  console.log(`\nFound ${profiles.length} profiles:\n`);

  // Find profiles with good data completeness
  const profilesWithScores = profiles.map(p => {
    let score = 0;
    if (p.company_name) score++;
    if (p.siret) score++;
    if (p.naf_code) score++;
    if (p.sector) score++;
    if (p.region) score++;
    if (p.employees) score++;
    if (p.annual_turnover) score++;
    if (p.project_types?.length) score++;
    if (p.certifications?.length) score++;
    if (p.description) score++;
    if (p.website_intelligence) score += 2;
    return { ...p, completeness: score };
  }).sort((a, b) => b.completeness - a.completeness);

  for (const p of profilesWithScores) {
    console.log('─'.repeat(100));
    console.log(`📊 ${p.company_name || 'Unnamed'} (Completeness: ${p.completeness}/12)`);
    console.log(`   ID: ${p.id}`);
    console.log(`   SIRET: ${p.siret || 'N/A'}`);
    console.log(`   NAF: ${p.naf_code || 'N/A'} - ${p.naf_label?.substring(0, 50) || 'N/A'}`);
    console.log(`   Sector: ${p.sector || 'N/A'} / ${p.sub_sector || 'N/A'}`);
    console.log(`   Region: ${p.region || 'N/A'} (${p.department || 'N/A'})`);
    console.log(`   Size: ${p.employees || 'N/A'} employees | ${p.annual_turnover ? `${p.annual_turnover.toLocaleString()}€` : 'N/A'} turnover`);
    console.log(`   Created: ${p.year_created || 'N/A'} | Legal form: ${p.legal_form || 'N/A'}`);
    console.log(`   Project types: ${p.project_types?.join(', ') || 'N/A'}`);
    console.log(`   Certifications: ${p.certifications?.join(', ') || 'N/A'}`);
    console.log(`   Description: ${p.description?.substring(0, 100) || 'N/A'}...`);

    // Check website intelligence
    const wi = p.website_intelligence;
    if (wi && typeof wi === 'object') {
      console.log(`   Website Intelligence:`);
      if (wi.companyDescription) console.log(`      - Description: ${wi.companyDescription.substring(0, 60)}...`);
      if (wi.businessActivities?.length) console.log(`      - Activities: ${wi.businessActivities.slice(0, 3).join(', ')}`);
      if (wi.innovations?.score) console.log(`      - Innovation score: ${wi.innovations.score}/100`);
      if (wi.sustainability?.score) console.log(`      - Sustainability score: ${wi.sustainability.score}/100`);
      if (wi.export?.score) console.log(`      - Export score: ${wi.export.score}/100`);
      if (wi.digital?.score) console.log(`      - Digital score: ${wi.digital.score}/100`);
    } else {
      console.log(`   Website Intelligence: None`);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(100));
  console.log('SUMMARY');
  console.log('─'.repeat(100));

  const withSector = profilesWithScores.filter(p => p.sector).length;
  const withRegion = profilesWithScores.filter(p => p.region).length;
  const withNaf = profilesWithScores.filter(p => p.naf_code).length;
  const withWI = profilesWithScores.filter(p => p.website_intelligence).length;
  const complete = profilesWithScores.filter(p => p.completeness >= 8).length;

  console.log(`   With sector:              ${withSector}/${profiles.length}`);
  console.log(`   With region:              ${withRegion}/${profiles.length}`);
  console.log(`   With NAF code:            ${withNaf}/${profiles.length}`);
  console.log(`   With website intelligence: ${withWI}/${profiles.length}`);
  console.log(`   High completeness (≥8):   ${complete}/${profiles.length}`);

  // Best profiles for testing
  const testable = profilesWithScores.filter(p => p.completeness >= 6);
  if (testable.length > 0) {
    console.log('\n' + '─'.repeat(100));
    console.log('BEST PROFILES FOR TESTING:');
    for (const p of testable.slice(0, 5)) {
      console.log(`   • ${p.company_name} (${p.sector || 'Unknown sector'}, ${p.region || 'Unknown region'}) - Score: ${p.completeness}/12`);
    }
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
