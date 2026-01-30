import 'dotenv/config';

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN!,
};

async function main() {
  const query = `
    SELECT id, title, description
    FROM subsidies
    WHERE is_active = true
      AND LOWER(title::text) LIKE '%industrie verte%'
    LIMIT 3
  `;

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

  const results = await response.json();
  console.log('Found:', Array.isArray(results) ? results.length : 0, 'subsidies with "industrie verte" in title\n');

  if (!Array.isArray(results)) {
    console.log('Error:', results);
    return;
  }

  for (const s of results) {
    const title = typeof s.title === 'object' ? s.title.fr : s.title;
    const desc = typeof s.description === 'object' ? (s.description?.fr || '').substring(0, 300) : (s.description || '').substring(0, 300);
    console.log('Title:', title);
    console.log('Desc:', desc || '(no description)');

    // Check what keywords match
    const text = (title + ' ' + desc).toLowerCase();
    const keywords = ['industrie verte', 'prêt vert', 'vert', 'industrie', 'écologique', 'transition', 'décarbonation'];
    console.log('\nMatching keywords from France Bamboo profile:');
    for (const kw of keywords) {
      if (text.includes(kw)) {
        console.log('  ✓', kw);
      } else {
        console.log('  ✗', kw);
      }
    }
    console.log('\n---\n');
  }

  // Now check "Prêt Vert" and "LIFE"
  console.log('\n=== Checking other key subsidies ===\n');

  for (const searchTerm of ['prêt vert', 'life - projets']) {
    const q2 = `
      SELECT id, title, description
      FROM subsidies
      WHERE is_active = true
        AND LOWER(title::text) LIKE '%${searchTerm}%'
      LIMIT 1
    `;

    const r2 = await fetch(
      `https://api.supabase.com/v1/projects/${CONFIG.SUPABASE_PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: q2 }),
      }
    );

    const results2 = await r2.json();
    if (Array.isArray(results2) && results2.length > 0) {
      const s = results2[0];
      const title = typeof s.title === 'object' ? s.title.fr : s.title;
      const desc = typeof s.description === 'object' ? (s.description?.fr || '').substring(0, 400) : (s.description || '').substring(0, 400);
      console.log('Title:', title);
      console.log('Desc:', desc || '(no description)');

      const text = (title + ' ' + desc).toLowerCase();
      const keywords = ['prêt vert', 'vert', 'bio', 'écologique', 'durable', 'environnement', 'économie circulaire', 'biodiversité'];
      console.log('\nMatching France Bamboo keywords:');
      for (const kw of keywords) {
        if (text.includes(kw)) {
          console.log('  ✓', kw);
        }
      }
      console.log('\n---\n');
    }
  }
}

main().catch(console.error);
