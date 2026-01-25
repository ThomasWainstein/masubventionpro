# Source Improvement Recommendations

> Analysis and recommendations for improving the MaSubventionPro funding sources database.

---

## Current Coverage Assessment

### Strengths

| Area | Coverage | Notes |
|------|----------|-------|
| EU Central Portals | Excellent | Main entry points covered |
| Research & Innovation | Strong | Horizon Europe well documented |
| Investment Instruments | Good | InvestEU, EIB comprehensive |
| Sector Programs | Good | LIFE, Erasmus+, Creative Europe |

### Gaps Identified

| Area | Gap | Priority |
|------|-----|----------|
| **French National Sources** | Missing Bpifrance, ANR, regional aids | HIGH |
| **ESF+ (Social Fund)** | Not included | HIGH |
| **Interreg Programs** | Cross-border funding missing | MEDIUM |
| **EU Executive Agencies** | CINEA, HADEA, EACEA not listed | MEDIUM |
| **Cohesion Fund** | Limited coverage | MEDIUM |
| **Agricultural Funds** | CAP, EAFRD not included | LOW (unless relevant) |

---

## Priority Additions for France

### 1. National Funding Bodies

```markdown
| Organization | URL | Type |
|-------------|-----|------|
| Bpifrance | https://www.bpifrance.fr | Public investment bank |
| ANR | https://www.anr.fr | Research agency |
| ADEME | https://www.ademe.fr | Environment & energy agency |
| France 2030 | https://www.gouvernement.fr/france-2030 | National investment plan |
```

### 2. Regional Sources

```markdown
| Region | Portal | Notes |
|--------|--------|-------|
| Île-de-France | https://www.iledefrance.fr/aides-services | Regional aids |
| Auvergne-Rhône-Alpes | https://www.auvergnerhonealpes.fr | Regional aids |
| Occitanie | https://www.laregion.fr | Regional aids |
```

### 3. Aggregator Platforms (French)

```markdown
| Platform | URL | Coverage |
|----------|-----|----------|
| Les-Aides.fr | https://les-aides.fr | National/regional aggregator |
| Aides-Entreprises.fr | https://aides-entreprises.fr | Business-focused |
| AIDES-TERRITOIRES | https://aides-territoires.beta.gouv.fr | Government platform |
```

---

## API Integration Opportunities

### Data Sources with APIs

| Source | API Availability | Documentation |
|--------|------------------|---------------|
| **EU Funding Portal** | CORDIS API | https://cordis.europa.eu/datalab |
| **Kohesio** | Open data API | https://kohesio.ec.europa.eu/en/developers |
| **AIDES-TERRITOIRES** | Public API | https://aides-territoires.beta.gouv.fr/api/ |
| **Les-Aides.fr** | Check availability | Contact provider |

### Recommended Actions

1. **Integrate CORDIS API** for real-time Horizon Europe data
2. **Use Kohesio API** for regional project examples
3. **Implement AIDES-TERRITOIRES API** for French subsidies

---

## Data Quality Improvements

### URL Validation Strategy

```
1. Implement automated URL health checks (weekly)
2. Track redirects and update accordingly
3. Monitor for content changes (program cycles)
4. Set alerts for deprecated pages
```

### Metadata Enrichment

For each funding source, capture:

| Field | Description | Example |
|-------|-------------|---------|
| `program_id` | Unique identifier | `HORIZON-EIC-2024` |
| `funding_range` | Min-max amounts | `€500K - €2.5M` |
| `deadline_type` | Cut-off or continuous | `cut-off` |
| `eligibility_geo` | Geographic scope | `EU27 + associated` |
| `eligibility_org` | Organization types | `SME, research, public` |
| `thematic_area` | Primary focus | `digital, climate, health` |
| `co_funding_rate` | Typical funding % | `70-100%` |
| `trl_range` | Technology readiness | `TRL 5-7` |
| `consortium_required` | Partnership needs | `yes/no/optional` |
| `last_verified` | Validation date | `2026-01-25` |

---

## Missing EU Executive Agencies

Add these implementing agencies:

| Agency | URL | Programs Managed |
|--------|-----|------------------|
| **CINEA** | https://cinea.ec.europa.eu | CEF, LIFE, Horizon (climate) |
| **HADEA** | https://hadea.ec.europa.eu | Health, Digital Europe, EIC |
| **EACEA** | https://eacea.ec.europa.eu | Erasmus+, Creative Europe |
| **REA** | https://rea.ec.europa.eu | Horizon Europe (MSCA, ERC) |
| **ERCEA** | https://erc.europa.eu | ERC grants specifically |

---

## Structural Recommendations

### Database Schema Enhancement

```typescript
interface FundingSource {
  id: string;
  name: string;
  url: string;
  category: 'eu' | 'national' | 'regional' | 'private';
  country?: string;
  programs: string[];
  fundingTypes: ('grant' | 'loan' | 'equity' | 'guarantee')[];
  targetBeneficiaries: string[];
  thematicAreas: string[];
  budgetRange: { min: number; max: number; currency: string };
  applicationDeadlines: DeadlineInfo[];
  apiEndpoint?: string;
  lastVerified: Date;
  status: 'active' | 'deprecated' | 'upcoming';
}
```

### Navigation Hierarchy

```
Funding Sources
├── By Geography
│   ├── EU-Wide Programs
│   ├── France National
│   ├── France Regional
│   └── International (non-EU)
├── By Sector
│   ├── Research & Innovation
│   ├── Digital & Technology
│   ├── Environment & Climate
│   ├── Social & Education
│   └── Infrastructure
├── By Organization Type
│   ├── SME / Startups
│   ├── Large Enterprises
│   ├── Research Institutions
│   ├── Public Authorities
│   └── NGOs / Associations
└── By Funding Type
    ├── Grants (non-dilutive)
    ├── Loans
    ├── Equity Investment
    └── Blended Finance
```

---

## Implementation Roadmap

### Phase 1: Foundation (Immediate)

- [ ] Validate all existing URLs
- [ ] Add missing French national sources
- [ ] Add EU executive agencies
- [ ] Implement basic URL health monitoring

### Phase 2: Enrichment (1-2 months)

- [ ] Add metadata for all sources
- [ ] Integrate AIDES-TERRITOIRES API
- [ ] Add regional French sources (top 5 regions)
- [ ] Implement deadline tracking

### Phase 3: Automation (2-4 months)

- [ ] Set up CORDIS API integration
- [ ] Implement automated source updates
- [ ] Build recommendation engine based on user profile
- [ ] Add real-time call notifications

---

## Competitive Analysis

Consider reviewing these competitors for source completeness:

| Platform | Strengths | URL |
|----------|-----------|-----|
| Welcomeurope | EU funding expertise | https://www.welcomeurope.com |
| Subvention.net | French market focus | https://subvention.net |
| Fundingbox | Tech startup focus | https://fundingbox.com |

---

## Quality Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| URL validity rate | 100% | TBD |
| Source freshness (< 30 days) | 95% | TBD |
| Coverage (EU programs) | 90%+ | ~70% |
| Coverage (FR national) | 85%+ | ~40% |
| Coverage (FR regional) | 50%+ | ~10% |
| API integration rate | 30%+ | 0% |
