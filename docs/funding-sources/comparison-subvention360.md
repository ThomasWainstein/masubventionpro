# Funding Sources: Documented vs Implemented (subvention360)

> Comparison of documented EU funding sources against what's already implemented in the subvention360 codebase.

---

## Summary

| Category | Documented | Implemented in subvention360 | Gap |
|----------|------------|------------------------------|-----|
| **French Regional Portals** | 3 | 13+ (all regions) | Documented < Implemented |
| **National Aggregators** | 2 | 2 (les-aides.fr, aides-territoires) | Covered |
| **EU Central Portals** | 3 | 0 | Full Gap |
| **Horizon Europe** | 3 | 0 | Full Gap |
| **InvestEU/EIB** | 8 | 0 | Full Gap |
| **National Agencies (FR)** | 3 suggested | 2 partial (ADEME, Bpifrance refs) | Partial |
| **Fiscal/Tax Sources** | 0 | 2 (impots.gouv, bofip) | Implemented > Documented |

---

## Already Implemented in subvention360

### Primary Data Sources (API/Scraper Active)

| Source | Type | Status | Files |
|--------|------|--------|-------|
| **Aides-Territoires API** | API | Active | `sync-aides-territoires/index.ts`, `aides-territoires-scheduler/index.ts` |
| **Les-Aides.fr API** | API | Active | `sync-les-aides/index.ts`, `les-aides-scheduler/index.ts` |

### Regional Scrapers (13 French Regions)

| Region | Code | Base URL | Scraper File |
|--------|------|----------|--------------|
| Auvergne-Rhône-Alpes | aura | https://www.auvergnerhonealpes.fr | `aura-hybrid-scraper.cjs` |
| Bretagne | bretagne | https://www.bretagne.bzh | `bretagne-hybrid-scraper.cjs` |
| Bourgogne-Franche-Comté | bfc | https://www.bourgognefranchecomte.fr | `bfc-hybrid-scraper.cjs` |
| Centre-Val de Loire | cvl | https://www.centre-valdeloire.fr | `cvl-hybrid-scraper.cjs` |
| Grand Est | grandest | https://www.grandest.fr | `grandest-hybrid-scraper.cjs` |
| Hauts-de-France | hdf | https://guide-aides.hautsdefrance.fr | `hdf-hybrid-scraper.cjs` |
| Île-de-France | idf | https://www.iledefrance.fr | `regional-scraper-factory.cjs` |
| Normandie | normandie | https://www.normandie.fr | `normandie-hybrid-scraper.cjs` |
| Nouvelle-Aquitaine | na | https://les-aides.nouvelle-aquitaine.fr | `na-puppeteer-scraper.cjs` |
| Occitanie | occitanie | https://www.laregion.fr | `occitanie-hybrid-scraper.cjs` |
| Pays de la Loire | pdl | https://www.paysdelaloire.fr | `pdl-hybrid-scraper.cjs` |
| Provence-Alpes-Côte d'Azur | paca | https://www.maregionsud.fr | `paca-hybrid-scraper.cjs` |
| Corse | corse | https://www.isula.corsica | `regional-scraper-factory.cjs` |

### Overseas Territories

| Territory | Scraper |
|-----------|---------|
| Guadeloupe | `guadeloupe-hybrid-scraper.cjs` |
| Martinique | `martinique-hybrid-scraper.cjs` |

### National/Thematic Scrapers

| Source | URL | Scraper File |
|--------|-----|--------------|
| **France 2030** | Multiple sources | `france2030-master-scraper.cjs` |
| **FranceAgriMer** | franceagrimer.fr | `franceagrimer-scraper.cjs` |
| **ADEME** | ademe.fr | `ademe-live-programs-scraper.js` |
| **Impots.gouv** | impots.gouv.fr | `impots-gouv-fiscal-scraper.cjs` |
| **BOFIP** | bofip.impots.gouv.fr | `bofip-fiscal-exonerations-scraper.cjs` |

### Multi-Country (for reference)

| Country | Config Files |
|---------|--------------|
| Romania | `scrapers/romania/`, `oportunitati*.json` |
| Spain | `scrapers/spain/` |
| EU Horizon | `ec_horizon_detail.json` |

---

## NOT Yet Implemented (From Documentation)

### EU Central Portals

| Source | URL | Priority |
|--------|-----|----------|
| EU Funding & Tenders Portal | https://ec.europa.eu/info/funding-tenders/opportunities/portal/ | HIGH |
| EUFundingPortal.eu | https://eufundingportal.eu | MEDIUM |
| EuroAccess Database | https://euro-access.eu/en/calls | LOW |

### Horizon Europe

| Component | URL | Notes |
|-----------|-----|-------|
| Main Portal | https://research-and-innovation.ec.europa.eu/... | No scraper |
| Submission System | https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/programmes/horizon | API available (CORDIS) |
| ERA-LEARN | https://www.era-learn.eu | Partnerships database |

### Investment Programs

| Source | URL | Notes |
|--------|-----|-------|
| InvestEU Portal | https://investeu.europa.eu | Investment matchmaking |
| EIB Products | https://www.eib.org/en/products/ | Loan/equity products |
| Kohesio | https://kohesio.ec.europa.eu | Regional project database |

### Sector Programs

| Program | URL | Implemented? |
|---------|-----|--------------|
| LIFE Programme | https://eufundingportal.eu/programme/life/ | No |
| Erasmus+ | https://erasmus-plus.ec.europa.eu | No |
| Creative Europe | https://eufundingportal.eu/programme/creative-europe/ | No |
| Digital Europe | https://digital-strategy.ec.europa.eu/en/activities/digital-programme | No |

### National Agencies (FR) - Partial

| Agency | URL | Status |
|--------|-----|--------|
| Bpifrance | https://www.bpifrance.fr | Referenced but no dedicated scraper |
| ANR | https://www.anr.fr | Not implemented |
| France 2030 portal | https://www.gouvernement.fr/france-2030 | Covered by france2030-master-scraper |

---

## Database Stats (subvention360)

From `REFERENCES.md`:
- **Total subsidies:** 6,000+
- **Embedding coverage:** 99.9% subsidies, 91.5% profiles
- **Primary sources:** aides-territoires, les-aides.fr, regional scrapers

---

## Recommendations

### 1. Already Have (No Action Needed)

- French regional scrapers (13 regions + overseas)
- Aides-Territoires API integration
- Les-Aides.fr API integration
- France 2030 scrapers
- Fiscal sources (impots.gouv, bofip)

### 2. Consider Adding (High Value)

| Source | Why | Effort |
|--------|-----|--------|
| **CORDIS API** | Horizon Europe project data, well-documented API | Medium |
| **Kohesio API** | Regional cohesion projects, open data | Low |
| **ANR.fr** | Major French research funding | Medium |

### 3. Low Priority (Already Aggregated)

These sources are already covered via aides-territoires/les-aides.fr:
- Most EU program calls (aggregated)
- Regional aids (direct scrapers exist)
- Bpifrance programs (partially covered)

---

## Architecture Notes

### subvention360 Data Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
├─────────────────────────────────────────────────────────┤
│  APIs                    │  Scrapers                    │
│  ├─ aides-territoires    │  ├─ 13 regional hybrid       │
│  └─ les-aides.fr         │  ├─ france2030-master        │
│                          │  ├─ ademe-live-programs      │
│                          │  ├─ franceagrimer            │
│                          │  └─ fiscal (bofip/impots)    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    ENRICHMENT                            │
│  ├─ unified-pattern-enricher (36 patterns)              │
│  ├─ enhanced-ultimate-enricher                          │
│  └─ AI scoring (DeepSeek)                               │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│  ├─ subsidies table (6,000+ records)                    │
│  ├─ embeddings (OpenAI text-embedding-3-small)          │
│  └─ V4 matching algorithm                               │
└─────────────────────────────────────────────────────────┘
```

### Key Files for Reference

| Purpose | File Path |
|---------|-----------|
| Regional scraper config | `scripts/lib/regional-scraper-factory.cjs` |
| Aides-Territoires sync | `supabase/functions/sync-aides-territoires/index.ts` |
| Les-Aides sync | `supabase/functions/sync-les-aides/index.ts` |
| Enrichment patterns | `scripts/unified-pattern-enricher.cjs` |
| Database schema | `supabase/migrations/` |

---

## Conclusion

**subvention360 has comprehensive French coverage** with:
- All 13 metropolitan regions + 2 overseas
- 2 major national APIs (aides-territoires, les-aides.fr)
- Thematic scrapers (France 2030, ADEME, fiscal)

**Gaps are primarily EU-level sources:**
- Direct Horizon Europe integration (CORDIS API)
- InvestEU/EIB product databases
- Sector-specific EU programs

**For masubventionpro:**
- Can leverage same architecture patterns
- Priority: Connect to existing subvention360 database OR replicate key scrapers
- EU sources would add differentiation value
