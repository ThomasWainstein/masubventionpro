# Master Funding Sources Inventory

> **Single source of truth for all funding data sources across the platform.**
>
> Last Updated: 2026-01-25

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Status Legend](#implementation-status-legend)
3. [French National Sources](#french-national-sources)
4. [French Regional Sources](#french-regional-sources)
5. [EU Central Portals](#eu-central-portals)
6. [EU Research & Innovation](#eu-research--innovation)
7. [EU Investment & Finance](#eu-investment--finance)
8. [EU Sector Programs](#eu-sector-programs)
9. [Support Networks](#support-networks)
10. [API Availability](#api-availability)
11. [Priority Roadmap](#priority-roadmap)

---

## Overview

### Current Database Stats (subvention360)

| Metric | Value |
|--------|-------|
| Total subsidies | 6,000+ |
| Primary sources | aides-territoires, les-aides.fr |
| Regional scrapers | 13 regions + 2 overseas |
| Embedding coverage | 99.9% |

### Source Distribution

```
French Sources (Implemented)
├── APIs: 2 (aides-territoires, les-aides.fr)
├── Regional Scrapers: 15
├── National Scrapers: 5
└── Fiscal Scrapers: 2

EU Sources (Not Implemented)
├── Central Portals: 3
├── Research Programs: 5
├── Investment Programs: 4
└── Sector Programs: 4
```

---

## Implementation Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| **LIVE** | ✅ | Active in production with scheduler |
| **IMPLEMENTED** | 🟢 | Scraper exists, may need manual run |
| **PARTIAL** | 🟡 | Referenced but incomplete |
| **DOCUMENTED** | 📄 | URL documented, not implemented |
| **PLANNED** | 📋 | On roadmap |
| **NOT NEEDED** | ⬜ | Covered by other sources |

---

## French National Sources

### Primary APIs

| Source | URL | Status | Implementation | Notes |
|--------|-----|--------|----------------|-------|
| **Aides-Territoires** | https://aides-territoires.beta.gouv.fr | ✅ LIVE | `supabase/functions/sync-aides-territoires/` | Government API, daily sync |
| **Les-Aides.fr** | https://les-aides.fr | ✅ LIVE | `supabase/functions/sync-les-aides/` | API with domain filtering |

### National Agencies

| Agency | URL | Status | Implementation | Notes |
|--------|-----|--------|----------------|-------|
| **Bpifrance** | https://www.bpifrance.fr | 🟡 PARTIAL | Referenced in enrichers | No dedicated scraper |
| **ADEME** | https://www.ademe.fr | 🟢 IMPLEMENTED | `scrapers/ademe-live-programs-scraper.js` | Environment & energy |
| **ANR** | https://www.anr.fr | 📄 DOCUMENTED | - | Research agency, high priority |
| **France Travail** | https://www.francetravail.fr | ⬜ NOT NEEDED | - | Covered via aides-territoires |
| **URSSAF** | https://www.urssaf.fr | ⬜ NOT NEEDED | - | Covered via aides-territoires |

### France 2030 Program

| Source | URL | Status | Implementation |
|--------|-----|--------|----------------|
| **Master Orchestrator** | Multiple | 🟢 IMPLEMENTED | `scripts/france2030-master-scraper.cjs` |
| **Bpifrance France2030** | bpifrance.fr/france-2030 | 🟢 IMPLEMENTED | `scripts/france2030-bpifrance-scraper.cjs` |
| **DGE France2030** | entreprises.gouv.fr | 🟢 IMPLEMENTED | `scripts/france2030-dge-scraper.cjs` |
| **Data.gouv.fr** | data.gouv.fr | 🟢 IMPLEMENTED | `scripts/france2030-datagouv-scraper.cjs` |

### Fiscal Sources

| Source | URL | Status | Implementation | Notes |
|--------|-----|--------|----------------|-------|
| **Impots.gouv** | https://www.impots.gouv.fr | 🟢 IMPLEMENTED | `scripts/impots-gouv-fiscal-scraper.cjs` | Tax incentives |
| **BOFIP** | https://bofip.impots.gouv.fr | 🟢 IMPLEMENTED | `scripts/bofip-fiscal-exonerations-scraper.cjs` | Fiscal exonerations |
| **Service-Public Pro** | https://www.service-public.fr/professionnels-entreprises | ⬜ NOT NEEDED | - | Covered via fiscal scrapers |

### Agriculture

| Source | URL | Status | Implementation |
|--------|-----|--------|----------------|
| **FranceAgriMer** | https://www.franceagrimer.fr | 🟢 IMPLEMENTED | `scripts/franceagrimer-scraper.cjs` |

---

## French Regional Sources

### Metropolitan Regions (13)

| Region | Code | Portal URL | Status | Scraper File |
|--------|------|------------|--------|--------------|
| **Auvergne-Rhône-Alpes** | aura | https://www.auvergnerhonealpes.fr/aides | ✅ LIVE | `aura-hybrid-scraper.cjs` |
| **Bourgogne-Franche-Comté** | bfc | https://www.bourgognefranchecomte.fr/guide-des-aides | ✅ LIVE | `bfc-hybrid-scraper.cjs` |
| **Bretagne** | bretagne | https://www.bretagne.bzh/aides | ✅ LIVE | `bretagne-hybrid-scraper.cjs` |
| **Centre-Val de Loire** | cvl | https://www.centre-valdeloire.fr/le-guide-des-aides | ✅ LIVE | `cvl-hybrid-scraper.cjs` |
| **Corse** | corse | https://www.isula.corsica | 🟢 IMPLEMENTED | `regional-scraper-factory.cjs` |
| **Grand Est** | grandest | https://www.grandest.fr/aides | ✅ LIVE | `grandest-hybrid-scraper.cjs` |
| **Hauts-de-France** | hdf | https://guide-aides.hautsdefrance.fr | ✅ LIVE | `hdf-hybrid-scraper.cjs` |
| **Île-de-France** | idf | https://www.iledefrance.fr/aides-services | 🟢 IMPLEMENTED | `regional-scraper-factory.cjs` |
| **Normandie** | normandie | https://www.normandie.fr/aides | ✅ LIVE | `normandie-hybrid-scraper.cjs` |
| **Nouvelle-Aquitaine** | na | https://les-aides.nouvelle-aquitaine.fr | ✅ LIVE | `na-puppeteer-scraper.cjs` |
| **Occitanie** | occitanie | https://www.laregion.fr | ✅ LIVE | `occitanie-hybrid-scraper.cjs` |
| **Pays de la Loire** | pdl | https://www.paysdelaloire.fr | ✅ LIVE | `pdl-hybrid-scraper.cjs` |
| **Provence-Alpes-Côte d'Azur** | paca | https://www.maregionsud.fr | ✅ LIVE | `paca-hybrid-scraper.cjs` |

### Overseas Territories (5)

| Territory | Code | Portal URL | Status | Scraper File |
|-----------|------|------------|--------|--------------|
| **Guadeloupe** | guadeloupe | https://www.regionguadeloupe.fr | ✅ LIVE | `guadeloupe-hybrid-scraper.cjs` |
| **Martinique** | martinique | https://www.collectivitedemartinique.mq | ✅ LIVE | `martinique-hybrid-scraper.cjs` |
| **Guyane** | guyane | https://www.ctguyane.fr | 📄 DOCUMENTED | - |
| **La Réunion** | reunion | https://www.regionreunion.com | 📄 DOCUMENTED | - |
| **Mayotte** | mayotte | https://www.cg976.fr | 📄 DOCUMENTED | - |

### Departmental Coverage

| Status | Details |
|--------|---------|
| Factory Available | `scripts/lib/departmental-scraper-factory.cjs` |
| Coverage | Configurable per department |

---

## EU Central Portals

| Portal | URL | Status | API Available | Priority |
|--------|-----|--------|---------------|----------|
| **EU Funding & Tenders Portal** | https://ec.europa.eu/info/funding-tenders/opportunities/portal/ | 📄 DOCUMENTED | Yes (partial) | HIGH |
| **EUFundingPortal.eu** | https://eufundingportal.eu | 📄 DOCUMENTED | Unknown | MEDIUM |
| **EuroAccess Database** | https://euro-access.eu/en/calls | 📄 DOCUMENTED | Unknown | LOW |

### Portal Features

| Feature | EU F&T Portal | EUFundingPortal | EuroAccess |
|---------|---------------|-----------------|------------|
| Open calls | ✓ | ✓ | ✓ |
| Partner search | ✓ | ✓ | ✗ |
| Project database | ✓ | ✓ | ✓ |
| Multi-language | ✓ | ✓ | ✓ |

---

## EU Research & Innovation

### Horizon Europe (€93.5B, 2021-2027)

| Component | URL | Status | API | Priority |
|-----------|-----|--------|-----|----------|
| **Main Portal** | https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe/ | 📄 DOCUMENTED | - | HIGH |
| **Calls Portal** | https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/programmes/horizon | 📄 DOCUMENTED | Partial | HIGH |
| **CORDIS** | https://cordis.europa.eu | 📄 DOCUMENTED | **Yes** | HIGH |
| **Grant Management (REA)** | https://rea.ec.europa.eu | 📄 DOCUMENTED | - | LOW |

**CORDIS API Details:**
- Endpoint: https://cordis.europa.eu/datalab
- Data: Projects, organizations, publications
- Format: XML, JSON
- Access: Open

### European Innovation Council (EIC)

| Stream | URL | Funding | Status |
|--------|-----|---------|--------|
| **EIC Pathfinder** | Via Horizon portal | €3-4M | 📄 DOCUMENTED |
| **EIC Transition** | Via Horizon portal | €2.5M | 📄 DOCUMENTED |
| **EIC Accelerator** | Via Horizon portal | €2.5M + €15M equity | 📄 DOCUMENTED |

### European Partnerships

| Resource | URL | Status |
|----------|-----|--------|
| **Partnerships Overview** | https://research-and-innovation.ec.europa.eu/.../european-partnerships-horizon-europe_en | 📄 DOCUMENTED |
| **ERA-LEARN** | https://www.era-learn.eu | 📄 DOCUMENTED |

### EUREKA Network

| Component | URL | Status |
|-----------|-----|--------|
| **Network Hub** | https://eurekanetwork.org | 📄 DOCUMENTED |
| **Funding Opportunities** | https://eufundingportal.eu/programme/eureka/ | 📄 DOCUMENTED |

---

## EU Investment & Finance

### InvestEU (€26.2B guarantee → €372B investment)

| Component | URL | Status | Priority |
|-----------|-----|--------|----------|
| **Main Programme** | https://investeu.europa.eu/investeu-programme_en | 📄 DOCUMENTED | MEDIUM |
| **Portal** | https://investeu.europa.eu/index_en | 📄 DOCUMENTED | MEDIUM |
| **EIB Implementation** | https://www.eib.org/en/products/mandates-partnerships/investeu/index | 📄 DOCUMENTED | LOW |

### European Investment Bank (EIB)

| Resource | URL | Status |
|----------|-----|--------|
| **Main Website** | https://www.eib.org | 📄 DOCUMENTED |
| **PPP Expertise (EPEC)** | https://www.eib.org/en/products/advisory-services/epec/index | 📄 DOCUMENTED |
| **Access to Finance** | https://www.eib.org/en/products/access-to-finance/index | 📄 DOCUMENTED |
| **Publications** | https://www.eib.org/en/publications/ | 📄 DOCUMENTED |

### Regional Development

| Source | URL | Status | API | Priority |
|--------|-----|--------|-----|----------|
| **ERDF Portal** | https://commission.europa.eu/.../european-regional-development-fund-erdf_en | 📄 DOCUMENTED | - | LOW |
| **Kohesio** | https://kohesio.ec.europa.eu | 📄 DOCUMENTED | **Yes** | MEDIUM |

**Kohesio API Details:**
- Data: EU cohesion projects by region
- Format: Linked open data
- Access: Open

---

## EU Sector Programs

### Environment & Climate

| Program | URL | Budget | Status |
|---------|-----|--------|--------|
| **LIFE Programme** | https://eufundingportal.eu/programme/life/ | €5.43B | 📄 DOCUMENTED |
| Sub: Nature & Biodiversity | Via LIFE portal | - | 📄 DOCUMENTED |
| Sub: Circular Economy | Via LIFE portal | - | 📄 DOCUMENTED |
| Sub: Climate Mitigation | Via LIFE portal | - | 📄 DOCUMENTED |
| Sub: Clean Energy Transition | Via LIFE portal | - | 📄 DOCUMENTED |

### Education & Training

| Program | URL | Budget | Status |
|---------|-----|--------|--------|
| **Erasmus+** | https://erasmus-plus.ec.europa.eu | €26.2B | 📄 DOCUMENTED |
| **Funding Calls** | https://erasmus-plus.ec.europa.eu/funding-calls | - | 📄 DOCUMENTED |

### Digital Transformation

| Program | URL | Budget | Status |
|---------|-----|--------|--------|
| **Digital Europe** | https://digital-strategy.ec.europa.eu/en/activities/digital-programme | €7.5B | 📄 DOCUMENTED |
| **Calls Portal** | https://eufundingportal.eu/programme/digital-europe/ | - | 📄 DOCUMENTED |

### Culture & Media

| Program | URL | Budget | Status |
|---------|-----|--------|--------|
| **Creative Europe** | https://eufundingportal.eu/programme/creative-europe/ | €2.44B | 📄 DOCUMENTED |
| Culture Strand | Via Creative Europe | - | 📄 DOCUMENTED |
| Media Strand | Via Creative Europe | - | 📄 DOCUMENTED |

---

## Support Networks

### National Contact Points (NCPs)

| Resource | URL | Status |
|----------|-----|--------|
| **NCP Directory** | https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/support/ncp | 📄 DOCUMENTED |
| **Digital NCPs** | https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/support/digital-ncp | 📄 DOCUMENTED |
| **Guidance** | https://westernbalkans-infohub.eu/glossary/national-contact-points/ | 📄 DOCUMENTED |

### EU Executive Agencies

| Agency | URL | Programs | Status |
|--------|-----|----------|--------|
| **CINEA** | https://cinea.ec.europa.eu | CEF, LIFE, Horizon (climate) | 📄 DOCUMENTED |
| **HADEA** | https://hadea.ec.europa.eu | Health, Digital Europe, EIC | 📄 DOCUMENTED |
| **EACEA** | https://eacea.ec.europa.eu | Erasmus+, Creative Europe | 📄 DOCUMENTED |
| **REA** | https://rea.ec.europa.eu | Horizon Europe (MSCA, ERC) | 📄 DOCUMENTED |
| **ERCEA** | https://erc.europa.eu | ERC grants | 📄 DOCUMENTED |

### Other Networks

| Network | URL | Status |
|---------|-----|--------|
| **Enterprise Europe Network** | https://een.ec.europa.eu | 📄 DOCUMENTED |
| **Digital Innovation Hubs** | https://digital-strategy.ec.europa.eu | 📄 DOCUMENTED |

---

## API Availability

### APIs with Open Access

| Source | API Endpoint | Data Format | Documentation |
|--------|--------------|-------------|---------------|
| **Aides-Territoires** | https://aides-territoires.beta.gouv.fr/api/ | JSON | ✅ Used |
| **Les-Aides.fr** | https://api.les-aides.fr/ | JSON | ✅ Used |
| **CORDIS** | https://cordis.europa.eu/datalab | XML/JSON | 📄 Available |
| **Kohesio** | https://kohesio.ec.europa.eu/en/developers | Linked Data | 📄 Available |

### APIs Requiring Registration

| Source | Registration | Notes |
|--------|--------------|-------|
| **EU F&T Portal** | EU Login | Partial API access |
| **EUREKA** | Contact required | Project database |

### No API (Scraping Required)

| Source | Scraping Complexity | Notes |
|--------|---------------------|-------|
| Regional portals | Medium | Already implemented |
| EIB products | Low | Static content |
| LIFE calls | Medium | Regular structure |

---

## Priority Roadmap

### Phase 1: Documentation Complete ✅

- [x] Inventory all known sources
- [x] Document implementation status
- [x] Identify API availability
- [x] Map to subvention360 codebase

### Phase 2: Gap Analysis

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| CORDIS API integration | HIGH - Horizon Europe data | Medium | P1 |
| ANR scraper | HIGH - French research | Medium | P1 |
| Kohesio API integration | MEDIUM - Regional examples | Low | P2 |
| Guyane/Réunion/Mayotte scrapers | LOW - Small populations | Low | P3 |
| EU sector programs | LOW - Covered by aggregators | High | P4 |

### Phase 3: Implementation (Future)

| Task | Dependency | Notes |
|------|------------|-------|
| CORDIS integration | API key | Horizon Europe projects |
| ANR scraper | Portal analysis | Research funding |
| Overseas territories | Scraper factory | 3 remaining regions |

---

## File References (subvention360)

### API Integrations

| Purpose | File Path |
|---------|-----------|
| Aides-Territoires sync | `supabase/functions/sync-aides-territoires/index.ts` |
| Aides-Territoires scheduler | `supabase/functions/aides-territoires-scheduler/index.ts` |
| Les-Aides sync | `supabase/functions/sync-les-aides/index.ts` |
| Les-Aides scheduler | `supabase/functions/les-aides-scheduler/index.ts` |

### Scraper Infrastructure

| Purpose | File Path |
|---------|-----------|
| Regional factory | `scripts/lib/regional-scraper-factory.cjs` |
| Departmental factory | `scripts/lib/departmental-scraper-factory.cjs` |
| Base scraper | `scripts/lib/base-scraper.cjs` |
| Scraper logger | `scripts/lib/scraper-logger.cjs` |

### Individual Scrapers

| Region/Source | File Path |
|---------------|-----------|
| AURA | `scripts/aura-hybrid-scraper.cjs` |
| BFC | `scripts/bfc-hybrid-scraper.cjs` |
| Bretagne | `scripts/bretagne-hybrid-scraper.cjs` |
| CVL | `scripts/cvl-hybrid-scraper.cjs` |
| Grand Est | `scripts/grandest-hybrid-scraper.cjs` |
| HDF | `scripts/hdf-hybrid-scraper.cjs` |
| Normandie | `scripts/normandie-hybrid-scraper.cjs` |
| Nouvelle-Aquitaine | `scripts/na-puppeteer-scraper.cjs` |
| Occitanie | `scripts/occitanie-hybrid-scraper.cjs` |
| PACA | `scripts/paca-hybrid-scraper.cjs` |
| PDL | `scripts/pdl-hybrid-scraper.cjs` |
| Guadeloupe | `scripts/guadeloupe-hybrid-scraper.cjs` |
| Martinique | `scripts/martinique-hybrid-scraper.cjs` |
| France 2030 | `scripts/france2030-master-scraper.cjs` |
| ADEME | `scrapers/ademe-live-programs-scraper.js` |
| FranceAgriMer | `scripts/franceagrimer-scraper.cjs` |
| Fiscal (impots) | `scripts/impots-gouv-fiscal-scraper.cjs` |
| Fiscal (bofip) | `scripts/bofip-fiscal-exonerations-scraper.cjs` |

### Enrichment

| Purpose | File Path |
|---------|-----------|
| Pattern enricher | `scripts/unified-pattern-enricher.cjs` |
| URL extraction | `scripts/extract-and-populate-hidden-urls.cjs` |
| Enhanced enricher | `supabase/functions/enhanced-ultimate-enricher/` |

---

## Appendix: URL Validation Status

> To be updated after validation run

| Category | Total URLs | Verified | Broken | Redirects |
|----------|------------|----------|--------|-----------|
| French National | 12 | - | - | - |
| French Regional | 15 | - | - | - |
| EU Portals | 3 | 3 | 0 | 0 |
| EU Programs | 20 | - | - | - |
| Support Networks | 8 | - | - | - |
| **Total** | **58** | - | - | - |

---

*Document maintained in: `docs/funding-sources/MASTER-SOURCES-INVENTORY.md`*
