# Funding Sources Documentation

> Documentation for all European and French funding data sources.

---

## Quick Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [**MASTER-SOURCES-INVENTORY.md**](MASTER-SOURCES-INVENTORY.md) | Single source of truth | Primary reference for all sources |
| [urls-checklist.md](urls-checklist.md) | URL validation tracking | When verifying URLs are live |
| [source-improvements.md](source-improvements.md) | Gap analysis & recommendations | When planning new integrations |

---

## Document Structure

```
docs/funding-sources/
├── README.md                      # This file
├── MASTER-SOURCES-INVENTORY.md    # ⭐ Primary document
├── urls-checklist.md              # URL validation checklist
├── source-improvements.md         # Improvement recommendations
├── eu-grants-directory.md         # Original EU grants reference
└── comparison-subvention360.md    # Cross-project comparison
```

---

## Key Findings Summary

### What's Implemented (subvention360)

| Category | Count | Status |
|----------|-------|--------|
| French Regional Scrapers | 15 | ✅ Live |
| National APIs | 2 | ✅ Live |
| National Scrapers | 5 | 🟢 Implemented |
| Fiscal Sources | 2 | 🟢 Implemented |

### What's Not Implemented

| Category | Count | Priority |
|----------|-------|----------|
| EU Central Portals | 3 | HIGH |
| Horizon Europe (CORDIS) | 1 | HIGH |
| ANR (French Research) | 1 | HIGH |
| Kohesio API | 1 | MEDIUM |
| EU Sector Programs | 4 | LOW |

---

## Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Live in production |
| 🟢 | Implemented (manual run) |
| 🟡 | Partial implementation |
| 📄 | Documented only |
| 📋 | Planned |
| ⬜ | Not needed (covered elsewhere) |

---

## Maintenance

### URL Validation

Run periodic validation using [urls-checklist.md](urls-checklist.md):

1. Check each URL manually or via script
2. Update status checkboxes
3. Log any issues in the Validation Notes table
4. Update `Last Validated` date

### Adding New Sources

1. Add to [MASTER-SOURCES-INVENTORY.md](MASTER-SOURCES-INVENTORY.md)
2. Include: URL, Status, API availability, Priority
3. If implementing, reference the scraper/integration file path

---

## Related Files (subvention360)

| Purpose | Path |
|---------|------|
| Regional scraper config | `scripts/lib/regional-scraper-factory.cjs` |
| API sync functions | `supabase/functions/sync-*/` |
| Scraper scripts | `scripts/*-scraper.cjs` |

---

*Last updated: 2026-01-25*
