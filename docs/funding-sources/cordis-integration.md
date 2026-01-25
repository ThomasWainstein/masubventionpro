# CORDIS Integration Documentation

> Integration guide for CORDIS Horizon Europe data in the subsidies database.

---

## Overview

CORDIS (Community Research and Development Information Service) is the European Commission's primary source of results from EU-funded research and innovation projects.

### Data Source

| Attribute | Value |
|-----------|-------|
| **Source URL** | https://cordis.europa.eu/data/cordis-HORIZONprojects.csv |
| **Format** | CSV (semicolon-delimited) |
| **Update Frequency** | Monthly |
| **Records** | ~8,500 Horizon Europe projects |
| **Authentication** | None required (public data) |

---

## Architecture

### Shared Package

Location: `packages/cordis-sync/`

```
packages/cordis-sync/
├── src/
│   ├── index.ts         # Main exports
│   ├── types.ts         # TypeScript interfaces
│   ├── fetcher.ts       # CSV download
│   ├── parser.ts        # CSV parsing
│   ├── transformer.ts   # Schema mapping
│   └── classifier.ts    # 36-type taxonomy
├── package.json
├── tsconfig.json
└── README.md
```

### Supabase Functions (subvention360)

| Function | Purpose | Schedule |
|----------|---------|----------|
| `sync-cordis` | Main sync function | On-demand |
| `cordis-scheduler` | Cron orchestrator | Weekly (Sunday 3 AM UTC) |

---

## Data Mapping

### CORDIS → Subsidies Table

| CORDIS Field | Subsidies Field | Notes |
|--------------|-----------------|-------|
| id | external_id | Unique project ID |
| title | title | JSON `{"fr": ..., "en": ...}` |
| objective | description | JSON `{"fr": ..., "en": ...}` |
| ecMaxContribution | amount_max | EC funding amount |
| totalCost | amount_min | Total project cost |
| endDate | deadline | Project end date |
| status | is_active | SIGNED = active |
| fundingScheme | funding_type | Mapped to taxonomy |
| topics | categories | Extracted from topic codes |

### Funding Type Mapping

| CORDIS fundingScheme | Our funding_type |
|---------------------|------------------|
| RIA | subvention |
| IA | subvention |
| CSA | accompagnement |
| MSCA | subvention |
| ERC (all variants) | subvention |
| EIC | subvention |

### Category Extraction

Topics are parsed to extract categories:

| Topic Code Contains | Category |
|--------------------|----------|
| DIGITAL | Digital & Technology |
| HEALTH | Health |
| CLIMATE, GREEN | Climate & Environment |
| ENERGY | Energy |
| FOOD, AGRI | Agriculture & Food |
| ERC | Frontier Research |
| MSCA | Researcher Mobility |
| EIC | Innovation & Startups |

---

## Usage

### Manual Sync

```bash
# Test with dry run
curl -X POST https://your-project.supabase.co/functions/v1/sync-cordis \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 10, "dry_run": true}'

# Full sync
curl -X POST https://your-project.supabase.co/functions/v1/sync-cordis \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 500, "max_records": 10000}'
```

### Using the Shared Package

```typescript
import { syncCordisData } from '@packages/cordis-sync';

const result = await syncCordisData({
  maxProjects: 100,
  onProgress: (current, total, phase) => {
    console.log(`${phase}: ${current}/${total}`);
  },
});

console.log(`Transformed ${result.stats.totalTransformed} projects`);
```

---

## Verification

### Check CORDIS Count

```sql
SELECT COUNT(*) FROM subsidies WHERE source = 'cordis';
```

### Sample CORDIS Records

```sql
SELECT
  id,
  title->>'en' as title,
  amount_max,
  deadline,
  funding_type,
  source_url
FROM subsidies
WHERE source = 'cordis'
ORDER BY last_synced_at DESC
LIMIT 10;
```

### Check Sync Logs

```sql
SELECT
  id,
  api_source,
  sync_type,
  status,
  records_processed,
  records_inserted,
  error_count,
  created_at
FROM api_sync_logs
WHERE api_source = 'cordis'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| CSV fetch timeout | Increase `timeout_ms` in fetcher options |
| Parse errors | Check for CSV format changes |
| Duplicate key errors | Verify external_id uniqueness |
| Lock timeout | Another sync may be running |

### Logs

Check function logs in Supabase Dashboard:
- Edge Functions → sync-cordis → Logs
- Edge Functions → cordis-scheduler → Logs

---

## Maintenance

### Weekly Tasks

- [ ] Verify scheduler ran successfully
- [ ] Check sync logs for errors
- [ ] Monitor record count growth

### Monthly Tasks

- [ ] Review classification accuracy
- [ ] Check for CSV format changes
- [ ] Update funding scheme mappings if needed

---

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| Shared package | `packages/cordis-sync/` | Reusable sync logic |
| Sync function | `subvention360/supabase/functions/sync-cordis/` | Supabase Edge Function |
| Scheduler | `subvention360/supabase/functions/cordis-scheduler/` | Cron orchestrator |
| Migration | `subvention360/supabase/migrations/20260125_cordis_sync_setup.sql` | DB setup |

---

*Last updated: 2026-01-25*
