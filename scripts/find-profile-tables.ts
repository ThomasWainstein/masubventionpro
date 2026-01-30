/**
 * Find tables that might contain company profiles
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
  // List all tables
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  const tables = await runQuery(query);

  if (!Array.isArray(tables)) {
    console.log('Error:', tables);
    return;
  }

  console.log('Tables in database:');
  for (const t of tables) {
    console.log(`  - ${t.table_name}`);
  }

  // Check for profile-related tables
  const profileTables = tables.filter(t =>
    t.table_name.includes('profile') ||
    t.table_name.includes('company') ||
    t.table_name.includes('business') ||
    t.table_name.includes('user')
  );

  if (profileTables.length > 0) {
    console.log('\nProfile-related tables:');
    for (const t of profileTables) {
      console.log(`  - ${t.table_name}`);

      // Get columns
      const colQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${t.table_name}'
        ORDER BY ordinal_position
      `;
      const cols = await runQuery(colQuery);
      if (Array.isArray(cols)) {
        for (const c of cols.slice(0, 15)) {
          console.log(`      ${c.column_name}: ${c.data_type}`);
        }
        if (cols.length > 15) console.log(`      ... and ${cols.length - 15} more columns`);
      }
    }
  }
}

main().catch(console.error);
