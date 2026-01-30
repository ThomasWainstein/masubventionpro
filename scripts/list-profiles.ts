/**
 * List company profiles in the database
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
  console.log('COMPANY PROFILES IN DATABASE');
  console.log('═'.repeat(100));

  // Get profiles with the most complete data
  const query = `
    SELECT
      id,
      company_name,
      siret,
      naf_code,
      naf_label,
      sector,
      sub_sector,
      region,
      department,
      employees,
      annual_turnover,
      year_created,
      legal_form,
      company_category,
      project_types,
      certifications,
      description,
      website_intelligence
    FROM company_profiles
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 20
  `;

  const profiles = await runQuery(query);

  if (!Array.isArray(profiles)) {
    console.log('Error:', profiles);
    return;
  }

  console.log(`\nFound ${profiles.length} profiles:\n`);

  for (const p of profiles) {
    console.log('─'.repeat(100));
    console.log(`📊 ${p.company_name || 'Unnamed'}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   SIRET: ${p.siret || 'N/A'}`);
    console.log(`   NAF: ${p.naf_code || 'N/A'} - ${p.naf_label?.substring(0, 50) || 'N/A'}`);
    console.log(`   Sector: ${p.sector || 'N/A'} / ${p.sub_sector || 'N/A'}`);
    console.log(`   Region: ${p.region || 'N/A'} (${p.department || 'N/A'})`);
    console.log(`   Size: ${p.employees || 'N/A'} employees | ${p.annual_turnover ? `${p.annual_turnover.toLocaleString()}€` : 'N/A'} turnover`);
    console.log(`   Created: ${p.year_created || 'N/A'} | Legal form: ${p.legal_form || 'N/A'}`);
    console.log(`   Project types: ${p.project_types?.join(', ') || 'N/A'}`);
    console.log(`   Certifications: ${p.certifications?.join(', ') || 'N/A'}`);
    console.log(`   Description: ${p.description?.substring(0, 80) || 'N/A'}...`);

    // Check website intelligence
    const wi = p.website_intelligence;
    if (wi) {
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

    // Data completeness score
    let completeness = 0;
    if (p.company_name) completeness++;
    if (p.siret) completeness++;
    if (p.naf_code) completeness++;
    if (p.sector) completeness++;
    if (p.region) completeness++;
    if (p.employees) completeness++;
    if (p.annual_turnover) completeness++;
    if (p.project_types?.length) completeness++;
    if (p.certifications?.length) completeness++;
    if (p.description) completeness++;
    if (wi) completeness += 2;

    console.log(`   Data completeness: ${completeness}/12 fields`);
  }

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
