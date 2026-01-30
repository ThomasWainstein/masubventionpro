/**
 * List applicant profiles with detailed business data
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
  console.log('APPLICANT PROFILES WITH BUSINESS DATA');
  console.log('═'.repeat(100));

  // First get column names
  const colQuery = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'applicant_profiles'
    ORDER BY ordinal_position
  `;
  const cols = await runQuery(colQuery);
  console.log('\nColumns in applicant_profiles:');
  if (Array.isArray(cols)) {
    console.log(cols.map(c => c.column_name).join(', '));
  }

  // Get profiles with business data
  const query = `
    SELECT
      id,
      profile_name,
      applicant_type,
      profile_data,
      completion_percentage,
      sector_ids,
      created_at
    FROM applicant_profiles
    WHERE profile_data IS NOT NULL
      AND completion_percentage > 20
    ORDER BY completion_percentage DESC, created_at DESC
    LIMIT 30
  `;

  const profiles = await runQuery(query);

  if (!Array.isArray(profiles)) {
    console.log('Error:', profiles);
    return;
  }

  console.log(`\nFound ${profiles.length} profiles with data:\n`);

  for (const p of profiles) {
    const data = p.profile_data || {};

    console.log('─'.repeat(100));
    console.log(`📊 ${p.profile_name || data.companyName || data.company_name || 'Unnamed'}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Type: ${p.applicant_type} | Completion: ${p.completion_percentage}%`);
    console.log(`   Sector IDs: ${p.sector_ids?.join(', ') || 'N/A'}`);

    // Extract business info from profile_data
    if (data) {
      // Company info
      if (data.siret) console.log(`   SIRET: ${data.siret}`);
      if (data.naf_code || data.nafCode) console.log(`   NAF: ${data.naf_code || data.nafCode}`);
      if (data.sector || data.main_sector) console.log(`   Sector: ${data.sector || data.main_sector}`);
      if (data.region) console.log(`   Region: ${data.region}`);
      if (data.employees || data.employee_count) console.log(`   Employees: ${data.employees || data.employee_count}`);
      if (data.revenue || data.annual_turnover) console.log(`   Revenue: ${data.revenue || data.annual_turnover}€`);
      if (data.legal_form || data.legalStatus) console.log(`   Legal: ${data.legal_form || data.legalStatus}`);

      // Projects
      if (data.project_types?.length) console.log(`   Projects: ${data.project_types.join(', ')}`);
      if (data.projectDescription) console.log(`   Project: ${data.projectDescription.substring(0, 80)}...`);

      // Activity description
      if (data.description || data.activity_description) {
        console.log(`   Description: ${(data.description || data.activity_description).substring(0, 100)}...`);
      }
    }
  }

  // Count totals
  const countQuery = `SELECT COUNT(*) as total FROM applicant_profiles`;
  const countResult = await runQuery(countQuery);
  const total = Array.isArray(countResult) ? countResult[0]?.total : 'unknown';
  console.log(`\n\nTotal profiles in table: ${total}`);

  console.log('\n' + '═'.repeat(100));
}

main().catch(console.error);
