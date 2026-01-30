import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://gvfgvbztagafjykncwto.supabase.co',
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY!,
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

// Transform stored profile_data to ProfileInput format expected by API
function transformProfile(profileId: string, profileData: any): any {
  return {
    id: profileId,
    company_name: profileData.companyName || profileData.profile_name || 'subvention360',
    naf_code: profileData.nafCode || 'TECH_DIGITAL_SERVICES',
    sector: profileData.sector || (profileData.sectors?.[0]) || 'Numérique',
    region: profileData.region || 'National',  // SaaS = national market
    employees: profileData.employees || '1-9',  // Startup
    annual_turnover: profileData.annualTurnover || 100000,
    year_created: profileData.yearCreated || 2024,
    legal_form: profileData.legalForm || 'SAS',
    company_category: profileData.companyCategory || 'Startup',
    project_types: profileData.projectTypes || ['innovation', 'digital', 'growth'],
    certifications: profileData.certifications || [],
    description: profileData.description || '',
    // Transform website intelligence if available
    website_intelligence: profileData.websiteIntelligence || {
      companyDescription: profileData.description,
      businessActivities: ['SaaS', 'B2B', 'Subsidy matching', 'AI'],
      innovations: {
        score: 85,
        indicators: ['AI-powered search', 'Pattern-based enrichment', 'Real-time scraping'],
        technologies: ['AI', 'Machine Learning', 'NLP', 'Web scraping'],
      },
      digital: {
        score: 95,
        technologies: ['SaaS', 'Cloud', 'API', 'Database'],
        ecommerce: false,
      },
      growth: {
        score: 70,
        signals: ['10,000+ subsidies indexed', 'B2B platform'],
        recentInvestment: false,
      },
    },
  };
}

async function main() {
  console.log('═'.repeat(80));
  console.log('RECALCULATE MATCHES FOR subvention360 PROFILE');
  console.log('═'.repeat(80));

  // Get the subvention360 profile
  const profiles = await runQuery(`
    SELECT id, profile_name, profile_data, user_id, completion_percentage
    FROM applicant_profiles
    WHERE profile_name = 'subvention360'
    LIMIT 1
  `);

  if (!Array.isArray(profiles) || profiles.length === 0) {
    console.error('Profile not found');
    return;
  }

  const dbProfile = profiles[0];
  console.log('\nProfile ID:', dbProfile.id);
  console.log('Profile Name:', dbProfile.profile_name);
  console.log('Completion:', dbProfile.completion_percentage + '%');

  // Transform to API format
  const profile = transformProfile(dbProfile.id, dbProfile.profile_data);
  console.log('\nTransformed Profile:');
  console.log(JSON.stringify(profile, null, 2));

  // Call the V5 matching function
  console.log('\n\n' + '─'.repeat(80));
  console.log('Calling V5 Hybrid Matching API...');
  console.log('─'.repeat(80));

  const matchingResponse = await fetch(
    `${CONFIG.SUPABASE_URL}/functions/v1/v5-hybrid-calculate-matches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile,
        limit: 10,
      }),
    }
  );

  if (!matchingResponse.ok) {
    const errorText = await matchingResponse.text();
    console.error('Matching API Error:', matchingResponse.status, errorText);
    return;
  }

  const result = await matchingResponse.json();

  console.log('\n📊 MATCHING RESULTS:');
  console.log('Processing time:', result.processing_time_ms + 'ms');
  console.log('Tokens used:', result.tokens_used);
  console.log('Pipeline stats:', result.pipeline_stats);

  console.log('\n\n🏆 TOP MATCHES:\n');

  // Get subsidy titles for display
  if (result.matches && result.matches.length > 0) {
    const subsidyIds = result.matches.map((m: any) => `'${m.subsidy_id}'`).join(',');
    const subsidies = await runQuery(`
      SELECT id, title, agency, region, amount_max, primary_sector
      FROM subsidies
      WHERE id IN (${subsidyIds})
    `);

    const subsidyMap = new Map(subsidies.map((s: any) => [s.id, s]));

    for (let i = 0; i < result.matches.length; i++) {
      const match = result.matches[i];
      const subsidy = subsidyMap.get(match.subsidy_id);
      const title = subsidy?.title?.fr || subsidy?.title || 'Unknown';

      console.log(`${i + 1}. ${title.substring(0, 70)}`);
      console.log(`   Score: ${match.match_score}pts | Success: ${match.success_probability}%`);
      console.log(`   Agency: ${subsidy?.agency || 'N/A'} | Sector: ${subsidy?.primary_sector || 'N/A'}`);
      console.log(`   Regions: ${JSON.stringify(subsidy?.region)}`);
      console.log(`   Amount: ${subsidy?.amount_max ? (subsidy.amount_max / 1000000).toFixed(1) + 'M€' : 'N/A'}`);
      console.log(`   Reasons: ${match.match_reasons?.slice(0, 3).join(', ') || 'N/A'}`);
      if (match.matching_criteria?.length > 0) {
        console.log(`   ✅ OK: ${match.matching_criteria.slice(0, 3).join(', ')}`);
      }
      if (match.missing_criteria?.length > 0) {
        console.log(`   ⚠️  Missing: ${match.missing_criteria.slice(0, 2).join(', ')}`);
      }
      console.log('');
    }
  } else {
    console.log('No matches returned');
  }

  console.log('\n' + '═'.repeat(80));
}

main().catch(console.error);
