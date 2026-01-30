/**
 * Analyze Subsidy Counts
 *
 * Get total counts and breakdowns by region, sector, amount
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  console.log('═'.repeat(80));
  console.log('SUBSIDY DATABASE ANALYSIS');
  console.log('═'.repeat(80));

  // Fetch all subsidies (paginated to handle large datasets)
  let allSubsidies = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('subsidies')
      .select('id, is_active, region, primary_sector, amount_min, amount_max, legal_entities')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching subsidies:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allSubsidies = allSubsidies.concat(data);
    page++;

    if (data.length < pageSize) break;
  }

  console.log(`\n📊 TOTAL SUBSIDIES: ${allSubsidies.length}`);

  // Active subsidies
  const activeSubsidies = allSubsidies.filter(s => s.is_active === true);
  console.log(`   Active: ${activeSubsidies.length}`);

  // Business-relevant (excluding particuliers)
  const businessSubsidies = activeSubsidies.filter(s => {
    const entities = s.legal_entities || [];
    // Include if not ONLY for Particuliers
    return !entities.includes('Particuliers') || entities.length > 1;
  });
  console.log(`   Business-relevant (incl. multi-target): ${businessSubsidies.length}`);

  // By region
  console.log('\n\n📍 BY REGION:\n');

  const regionCounts = {};
  for (const s of activeSubsidies) {
    const regions = s.region || ['Non spécifié'];
    for (const r of regions) {
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    }
  }

  const sortedRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1]);

  for (const [region, count] of sortedRegions.slice(0, 20)) {
    console.log(`   ${region.padEnd(35)} ${String(count).padStart(5)}`);
  }
  if (sortedRegions.length > 20) {
    console.log(`   ... and ${sortedRegions.length - 20} more regions`);
  }

  // By sector
  console.log('\n\n🏭 BY SECTOR:\n');

  const sectorCounts = {};
  for (const s of activeSubsidies) {
    const sector = s.primary_sector || 'Non spécifié';
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  }

  const sortedSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1]);

  for (const [sector, count] of sortedSectors.slice(0, 25)) {
    console.log(`   ${sector.padEnd(40)} ${String(count).padStart(5)}`);
  }
  if (sortedSectors.length > 25) {
    console.log(`   ... and ${sortedSectors.length - 25} more sectors`);
  }

  // By amount range
  console.log('\n\n💰 BY AMOUNT RANGE:\n');

  const amountRanges = {
    'Non spécifié': 0,
    '< 10k€': 0,
    '10k - 50k€': 0,
    '50k - 200k€': 0,
    '200k - 1M€': 0,
    '1M - 10M€': 0,
    '> 10M€': 0,
  };

  for (const s of activeSubsidies) {
    const max = s.amount_max;
    if (!max) {
      amountRanges['Non spécifié']++;
    } else if (max < 10000) {
      amountRanges['< 10k€']++;
    } else if (max < 50000) {
      amountRanges['10k - 50k€']++;
    } else if (max < 200000) {
      amountRanges['50k - 200k€']++;
    } else if (max < 1000000) {
      amountRanges['200k - 1M€']++;
    } else if (max < 10000000) {
      amountRanges['1M - 10M€']++;
    } else {
      amountRanges['> 10M€']++;
    }
  }

  for (const [range, count] of Object.entries(amountRanges)) {
    console.log(`   ${range.padEnd(20)} ${String(count).padStart(5)}`);
  }

  // By legal entity type
  console.log('\n\n🏢 BY LEGAL ENTITY TYPE:\n');

  const entityCounts = {};
  for (const s of activeSubsidies) {
    const entities = s.legal_entities || ['Non spécifié'];
    for (const e of entities) {
      entityCounts[e] = (entityCounts[e] || 0) + 1;
    }
  }

  const sortedEntities = Object.entries(entityCounts)
    .sort((a, b) => b[1] - a[1]);

  for (const [entity, count] of sortedEntities.slice(0, 15)) {
    console.log(`   ${entity.padEnd(30)} ${String(count).padStart(5)}`);
  }

  console.log('\n' + '═'.repeat(80));
}

analyze().catch(console.error);
