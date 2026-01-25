# Database Statistics

Get quick stats on key database tables.

## Usage
`/project:db-stats`

## Command
```bash
SUPABASE_URL="https://gvfgvbztagafjykncwto.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SECRET_KEY_DATA_PROCESSING" \
node -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const tables = ['subsidies', 'applicant_profiles', 'profile_subsidy_matches', 'organizations', 'company_success_profiles'];
  console.log('=== DATABASE STATS ===');
  for (const t of tables) {
    const { count } = await s.from(t).select('*', { count: 'exact', head: true });
    console.log(t + ': ' + (count || 0).toLocaleString());
  }
})();
"
```
