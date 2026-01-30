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
  // First try to find user
  console.log('Looking for user with email thomas@subvention360.com...\n');

  const users = await runQuery(`
    SELECT id, email, created_at
    FROM auth.users
    WHERE email ILIKE '%thomas%subvention%' OR email ILIKE '%subvention360%'
    LIMIT 10
  `);

  console.log('Users found:', JSON.stringify(users, null, 2));

  // Also search profiles by name containing subvention360
  console.log('\n\nSearching profiles by name...');
  const profilesByName = await runQuery(`
    SELECT id, profile_name, user_id,
           profile_data->>'companyName' as company_name,
           profile_data->>'email' as email
    FROM applicant_profiles
    WHERE profile_name ILIKE '%subvention360%'
       OR profile_data::text ILIKE '%subvention360%'
    LIMIT 10
  `);

  console.log('Profiles by name:', JSON.stringify(profilesByName, null, 2));

  // Get all profiles with completion > 60%
  console.log('\n\nAll complete profiles:');
  const allProfiles = await runQuery(`
    SELECT id, profile_name, user_id, completion_percentage,
           profile_data->>'companyName' as company_name,
           profile_data->>'region' as region,
           profile_data->>'sector' as sector
    FROM applicant_profiles
    WHERE completion_percentage >= 60
    ORDER BY completion_percentage DESC
    LIMIT 15
  `);

  console.log(JSON.stringify(allProfiles, null, 2));
}

main().catch(console.error);
