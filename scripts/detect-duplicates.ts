/**
 * Duplicate Subsidy Detection Script
 *
 * Finds potential duplicate subsidies using multiple strategies:
 * 1. Exact title + agency match
 * 2. Fuzzy title matching (Levenshtein distance)
 * 3. Same source_url
 *
 * Usage:
 *   npx tsx scripts/detect-duplicates.ts --analyze
 *   npx tsx scripts/detect-duplicates.ts --merge --dry-run
 *   npx tsx scripts/detect-duplicates.ts --merge
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  SUPABASE_PROJECT_ID: 'gvfgvbztagafjykncwto',
  SUPABASE_ACCESS_TOKEN: 'sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4',
};

interface Subsidy {
  id: string;
  title: { fr?: string } | string;
  agency: string;
  source_url: string;
  region: string[];
  funding_type: string;
  is_active: boolean;
  amount_min: number | null;
  amount_max: number | null;
  eligibility_criteria: any;
  created_at: string;
}

interface DuplicateGroup {
  reason: string;
  subsidies: Subsidy[];
  recommended_keep: string;
}

async function runQuery(sql: string): Promise<any[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${CONFIG.SUPABASE_PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Database query failed: ${error}`);
  }

  return response.json();
}

function getTitle(subsidy: Subsidy): string {
  if (typeof subsidy.title === 'object' && subsidy.title?.fr) {
    return subsidy.title.fr;
  }
  return String(subsidy.title || '');
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function chooseSubsidyToKeep(subsidies: Subsidy[]): string {
  // Prefer: active > has eligibility > has amounts > newer
  const scored = subsidies.map(s => {
    let score = 0;
    if (s.is_active) score += 100;
    if (s.eligibility_criteria && Object.keys(s.eligibility_criteria).length > 0) score += 50;
    if (s.amount_max) score += 20;
    if (s.amount_min) score += 10;
    // Newer is better (more likely to be up to date)
    score += new Date(s.created_at).getTime() / 1e15;
    return { id: s.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

function findExactDuplicates(subsidies: Subsidy[]): DuplicateGroup[] {
  const groups: Map<string, Subsidy[]> = new Map();

  for (const subsidy of subsidies) {
    const title = normalizeTitle(getTitle(subsidy));
    const agency = subsidy.agency?.toLowerCase() || '';
    const key = `${title}|||${agency}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(subsidy);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [, subs] of groups) {
    if (subs.length > 1) {
      duplicates.push({
        reason: 'exact_title_agency',
        subsidies: subs,
        recommended_keep: chooseSubsidyToKeep(subs),
      });
    }
  }

  return duplicates;
}

function findFuzzyDuplicates(subsidies: Subsidy[], threshold = 0.9): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];
  const processed = new Set<string>();

  // Group by agency first to reduce comparisons
  const byAgency: Map<string, Subsidy[]> = new Map();
  for (const s of subsidies) {
    const agency = s.agency?.toLowerCase() || 'unknown';
    if (!byAgency.has(agency)) byAgency.set(agency, []);
    byAgency.get(agency)!.push(s);
  }

  for (const [, agencySubs] of byAgency) {
    for (let i = 0; i < agencySubs.length; i++) {
      if (processed.has(agencySubs[i].id)) continue;

      const group: Subsidy[] = [agencySubs[i]];
      const titleA = normalizeTitle(getTitle(agencySubs[i]));

      for (let j = i + 1; j < agencySubs.length; j++) {
        if (processed.has(agencySubs[j].id)) continue;

        const titleB = normalizeTitle(getTitle(agencySubs[j]));
        const sim = similarity(titleA, titleB);

        if (sim >= threshold && sim < 1) { // Not exact match (handled separately)
          group.push(agencySubs[j]);
          processed.add(agencySubs[j].id);
        }
      }

      if (group.length > 1) {
        processed.add(agencySubs[i].id);
        duplicates.push({
          reason: 'fuzzy_title_match',
          subsidies: group,
          recommended_keep: chooseSubsidyToKeep(group),
        });
      }
    }
  }

  return duplicates;
}

function findSameSourceDuplicates(subsidies: Subsidy[]): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];

  // Group by source URL
  const byUrl: Map<string, Subsidy[]> = new Map();
  for (const s of subsidies) {
    if (!s.source_url) continue;
    const url = s.source_url.toLowerCase().replace(/\/$/, '');
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url)!.push(s);
  }

  for (const [, subs] of byUrl) {
    if (subs.length > 1) {
      duplicates.push({
        reason: 'same_source_url',
        subsidies: subs,
        recommended_keep: chooseSubsidyToKeep(subs),
      });
    }
  }

  return duplicates;
}

async function main() {
  const args = process.argv.slice(2);
  const analyzeMode = args.includes('--analyze');
  const mergeMode = args.includes('--merge');
  const dryRun = args.includes('--dry-run');

  console.log('=== Duplicate Subsidy Detection ===\n');

  // Fetch all subsidies
  console.log('Fetching subsidies...');
  const sql = `
    SELECT id, title, agency, source_url, region, funding_type,
           is_active, amount_min, amount_max, eligibility_criteria, created_at
    FROM subsidies
    ORDER BY agency, title
  `;
  const subsidies = await runQuery(sql) as Subsidy[];
  console.log(`Total subsidies: ${subsidies.length}\n`);

  // Find duplicates
  console.log('Finding exact duplicates (same title + agency)...');
  const exactDupes = findExactDuplicates(subsidies);
  console.log(`Found ${exactDupes.length} groups of exact duplicates\n`);

  console.log('Finding fuzzy duplicates (similar titles, same agency)...');
  const fuzzyDupes = findFuzzyDuplicates(subsidies);
  console.log(`Found ${fuzzyDupes.length} groups of fuzzy duplicates\n`);

  console.log('Finding same-URL duplicates...');
  const urlDupes = findSameSourceDuplicates(subsidies);
  console.log(`Found ${urlDupes.length} groups with same source URL\n`);

  // Combine and deduplicate groups
  const allDupes = [...exactDupes, ...fuzzyDupes, ...urlDupes];

  // Count totals
  let totalDuplicateSubsidies = 0;
  let totalToRemove = 0;

  for (const group of allDupes) {
    totalDuplicateSubsidies += group.subsidies.length;
    totalToRemove += group.subsidies.length - 1;
  }

  console.log('=== SUMMARY ===');
  console.log(`Total duplicate groups: ${allDupes.length}`);
  console.log(`Total subsidies in duplicate groups: ${totalDuplicateSubsidies}`);
  console.log(`Subsidies to potentially remove: ${totalToRemove}`);
  console.log('');

  // Show details
  if (analyzeMode || (!mergeMode)) {
    console.log('=== DUPLICATE DETAILS ===\n');

    // Show exact duplicates
    if (exactDupes.length > 0) {
      console.log('--- EXACT DUPLICATES (same title + agency) ---\n');
      for (const group of exactDupes.slice(0, 20)) {
        console.log(`Agency: ${group.subsidies[0].agency}`);
        console.log(`Title: ${getTitle(group.subsidies[0])}`);
        console.log(`Count: ${group.subsidies.length}`);
        console.log(`IDs: ${group.subsidies.map(s => s.id).join(', ')}`);
        console.log(`Keep: ${group.recommended_keep}`);
        console.log('');
      }
      if (exactDupes.length > 20) {
        console.log(`... and ${exactDupes.length - 20} more exact duplicate groups\n`);
      }
    }

    // Show URL duplicates
    if (urlDupes.length > 0) {
      console.log('--- SAME URL DUPLICATES ---\n');
      for (const group of urlDupes.slice(0, 10)) {
        console.log(`URL: ${group.subsidies[0].source_url}`);
        console.log(`Titles:`);
        for (const s of group.subsidies) {
          console.log(`  - ${getTitle(s)} (${s.is_active ? 'active' : 'inactive'})`);
        }
        console.log(`Keep: ${group.recommended_keep}`);
        console.log('');
      }
      if (urlDupes.length > 10) {
        console.log(`... and ${urlDupes.length - 10} more URL duplicate groups\n`);
      }
    }

    // Show fuzzy duplicates
    if (fuzzyDupes.length > 0) {
      console.log('--- FUZZY DUPLICATES (similar titles) ---\n');
      for (const group of fuzzyDupes.slice(0, 10)) {
        console.log(`Agency: ${group.subsidies[0].agency}`);
        console.log(`Titles:`);
        for (const s of group.subsidies) {
          console.log(`  - ${getTitle(s)}`);
        }
        console.log(`Keep: ${group.recommended_keep}`);
        console.log('');
      }
      if (fuzzyDupes.length > 10) {
        console.log(`... and ${fuzzyDupes.length - 10} more fuzzy duplicate groups\n`);
      }
    }
  }

  // Merge mode
  if (mergeMode) {
    console.log('\n=== MERGING DUPLICATES ===\n');

    if (dryRun) {
      console.log('DRY RUN - no changes will be made\n');
    }

    let merged = 0;
    let deactivated = 0;

    for (const group of allDupes) {
      const keepId = group.recommended_keep;
      const removeIds = group.subsidies
        .filter(s => s.id !== keepId)
        .map(s => s.id);

      if (removeIds.length === 0) continue;

      console.log(`[${group.reason}] Keeping: ${keepId}`);
      console.log(`  Deactivating: ${removeIds.join(', ')}`);

      if (!dryRun) {
        // Deactivate duplicates (don't delete, just mark inactive)
        const deactivateSql = `
          UPDATE subsidies
          SET is_active = false,
              archive_reason = 'Duplicate of ${keepId}'
          WHERE id IN (${removeIds.map(id => `'${id}'`).join(',')})
        `;
        await runQuery(deactivateSql);
        deactivated += removeIds.length;
      }

      merged++;
    }

    console.log(`\nProcessed ${merged} duplicate groups`);
    console.log(`Deactivated ${deactivated} duplicate subsidies`);

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - no changes were made');
    }
  }
}

main().catch(console.error);
