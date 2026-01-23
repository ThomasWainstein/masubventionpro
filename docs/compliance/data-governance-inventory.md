# Data Governance Inventory

## EU AI Act Article 10 Compliance

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Data Owner:** ECOEMIT SOLUTIONS (SARL)
**System:** MaSubventionPro AI Matcher

---

## 1. Executive Summary

This document inventories all data used by MaSubventionPro's AI system for training, validation, and operation, as required by EU AI Act Article 10 (Data and Data Governance).

---

## 2. Data Categories Overview

| Category | Purpose | Sources | GDPR Basis |
|----------|---------|---------|------------|
| Subsidy Database | AI matching | Government APIs, public sources | Legitimate Interest |
| User Profiles | Matching input | User submissions | Contract |
| Website Intelligence | Profile enrichment | User websites | Contract + Consent |
| Usage Logs | Compliance monitoring | System logs | Legal Obligation |

---

## 3. Detailed Data Inventory

### 3.1 Subsidy Database

**Purpose:** Reference data for AI matching algorithm

| Attribute | Description |
|-----------|-------------|
| **Dataset Name** | MaSubventionPro Subsidies |
| **Size** | ~10,000+ records |
| **Update Frequency** | Weekly automated + manual curation |
| **Sources** | Aides-Territoires API, BPI France, Regional agencies, EU portals |
| **Format** | PostgreSQL (Supabase) |
| **Storage Location** | Supabase EU (Frankfurt) |
| **Retention** | Indefinite (public data) |

**Data Fields:**
| Field | Type | Description | PII? |
|-------|------|-------------|------|
| id | UUID | Unique identifier | No |
| title | Text | Subsidy name (FR/EN) | No |
| description | Text | Eligibility criteria, details | No |
| agency | Text | Funding organization | No |
| region | Array | Geographic scope | No |
| categories | Array | Business sectors | No |
| amount_min/max | Number | Funding range | No |
| deadline | Date | Application deadline | No |
| application_url | URL | Official application link | No |
| source_url | URL | Original source | No |

**Quality Controls:**
- [ ] Automated duplicate detection (weekly)
- [ ] Dead link checker (daily)
- [ ] Manual accuracy review (monthly)
- [ ] Deadline expiry automation

**Known Limitations:**
- Coverage: Primarily French subsidies; EU coverage growing
- Timeliness: 1-7 day lag on new subsidies
- Languages: French primary, some EN descriptions

---

### 3.2 User Profile Data

**Purpose:** Input data for AI matching

| Attribute | Description |
|-----------|-------------|
| **Dataset Name** | masubventionpro_profiles |
| **Size** | Variable (user-generated) |
| **Update Frequency** | Real-time (user updates) |
| **Sources** | User submissions, INSEE API (SIRET lookup) |
| **Format** | PostgreSQL (Supabase) |
| **Storage Location** | Supabase EU (Frankfurt) |
| **Retention** | Until account deletion + 30 days |

**Data Fields:**
| Field | Type | Description | PII? | GDPR Art |
|-------|------|-------------|------|----------|
| id | UUID | Profile identifier | No | - |
| user_id | UUID | Link to auth.users | Yes | 6(1)(b) |
| company_name | Text | Business name | Yes* | 6(1)(b) |
| siret | Text | French business ID | Yes* | 6(1)(b) |
| siren | Text | French company ID | Yes* | 6(1)(b) |
| naf_code | Text | Industry classification | No | - |
| region | Text | Geographic location | No | - |
| employees | Text | Size range | No | - |
| annual_turnover | Number | Revenue (optional) | Yes | 6(1)(a) |
| website_url | URL | Company website | Yes* | 6(1)(b) |
| certifications | Array | Quality certifications | No | - |
| project_types | Array | Investment interests | No | - |

*Note: Business data may be considered personal data for sole proprietors (EI, Micro-entreprise)

**Quality Controls:**
- [ ] SIRET validation via INSEE API
- [ ] NAF code validation
- [ ] Region normalization
- [ ] PII detection before AI processing

**Data Subject Rights:**
- Access: Via /app/settings (export)
- Rectification: Via /app/profile/edit
- Erasure: Via account deletion
- Portability: JSON export available

---

### 3.3 Website Intelligence Data

**Purpose:** AI-extracted business insights for improved matching

| Attribute | Description |
|-----------|-------------|
| **Dataset Name** | website_intelligence (JSONB field) |
| **Size** | ~5KB per profile |
| **Update Frequency** | On-demand (user request) |
| **Sources** | User-provided website URLs |
| **Processing** | Mistral AI extraction |
| **Storage Location** | Supabase EU (Frankfurt) |
| **Retention** | With profile (until deletion) |

**Data Fields:**
| Field | Type | Description | PII? |
|-------|------|-------------|------|
| companyDescription | Text | AI-extracted description | No |
| businessActivities | Array | Main activities | No |
| innovations.indicators | Array | R&D signals | No |
| innovations.score | Number | Innovation rating (0-100) | No |
| sustainability.initiatives | Array | ESG activities | No |
| sustainability.score | Number | Sustainability rating | No |
| export.markets | Array | International presence | No |
| digital.technologies | Array | Tech stack indicators | No |
| analysis.confidence | Number | AI confidence level | No |
| analysis.analysisDate | Date | When extracted | No |

**Quality Controls:**
- [ ] Confidence threshold (>60% required)
- [ ] Human review option available
- [ ] User can delete/refresh anytime

**Consent Mechanism:**
- Explicit user action required (click "Analyze website")
- Clear disclosure: "L'IA analysera votre site web public"
- Opt-out: User can skip or delete

---

### 3.4 AI Interaction Logs

**Purpose:** Compliance monitoring, quality assurance

| Attribute | Description |
|-----------|-------------|
| **Dataset Name** | ai_usage_logs + compliance_events |
| **Size** | Growing (event-driven) |
| **Update Frequency** | Real-time |
| **Sources** | System-generated |
| **Format** | PostgreSQL (Supabase) |
| **Storage Location** | Supabase EU (Frankfurt) |
| **Retention** | 6 months (standard), 3 years (extended) |

**Data Fields (ai_usage_logs):**
| Field | Type | Description | PII? |
|-------|------|-------------|------|
| id | UUID | Log identifier | No |
| user_id | UUID | User reference | Yes |
| function_name | Text | AI function called | No |
| input_tokens | Number | Tokens consumed | No |
| output_tokens | Number | Tokens generated | No |
| cost_cents | Number | API cost | No |
| model_provider | Text | AI provider used | No |
| success | Boolean | Request outcome | No |
| created_at | Timestamp | Event time | No |

**Data Fields (compliance_events):**
| Field | Type | Description | PII? |
|-------|------|-------------|------|
| event_id | UUID | Unique event ID | No |
| event_type | Enum | Classification | No |
| user_id | UUID | Actor | Yes |
| input_snapshot | JSONB | Anonymized inputs | Partial |
| ai_output | JSONB | Results summary | No |
| model_provider | Text | Mistral AI | No |
| model_version | Text | Model used | No |
| system_status | Enum | Health status | No |
| retention_category | Enum | Retention policy | No |

**Legal Basis:** GDPR Article 6(1)(c) - Legal obligation (EU AI Act)

---

## 4. Data Flow Diagram

```
[User] --> [Profile Form] --> [Supabase DB]
                                   |
                                   v
[Subsidies API] --> [Subsidies DB] --> [AI Matcher (Mistral)]
                                              |
                                              v
                                    [Recommendations]
                                              |
                                              v
                                    [Compliance Logs]
```

---

## 5. Third-Party Data Processors

| Processor | Data Shared | Purpose | DPA Status | Location |
|-----------|-------------|---------|------------|----------|
| **Supabase** | All DB data | Hosting | ✅ Signed | EU (Frankfurt) |
| **Mistral AI** | Profile context (anonymized) | AI processing | ✅ Available | EU (France) |
| **Vercel** | Static assets only | Frontend hosting | ✅ Signed | EU |
| **Stripe** | Payment data | Billing | ✅ Signed | EU |
| **Resend** | Email addresses | Transactional email | ✅ Signed | EU |

**Sub-processor Management:**
- All processors notified in Privacy Policy
- DPAs on file in `/docs/legal/dpas/`
- Annual review of processor compliance

---

## 6. Data Quality Measures

### 6.1 Subsidy Data Quality

| Metric | Target | Current | Measurement |
|--------|--------|---------|-------------|
| Accuracy | >95% | TBD | Monthly audit |
| Completeness | >90% | TBD | Field fill rate |
| Timeliness | <7 days | TBD | Source date vs DB date |
| Consistency | 100% | TBD | Format validation |

### 6.2 AI Output Quality

| Metric | Target | Current | Measurement |
|--------|--------|---------|-------------|
| Relevance | >80% match | TBD | User feedback |
| Hallucination rate | <5% | TBD | Quality reports |
| Response time | <3s | TBD | P95 latency |

---

## 7. Bias Detection & Mitigation

### 7.1 Identified Bias Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| Geographic bias | Over-representation of Ile-de-France | Track regional distribution |
| Sector bias | Tech/Innovation over-indexed | Sector-balanced testing |
| Size bias | Large companies favored | SME-specific validation |
| Language bias | French-only content | Multilingual roadmap |

### 7.2 Bias Testing Schedule

| Test | Frequency | Owner | Last Run | Result |
|------|-----------|-------|----------|--------|
| Regional distribution | Monthly | Data Team | TBD | TBD |
| Sector coverage | Monthly | Data Team | TBD | TBD |
| Size fairness | Quarterly | AI Team | TBD | TBD |

---

## 8. Data Retention Schedule

| Data Type | Active Retention | Archive | Deletion |
|-----------|------------------|---------|----------|
| User profiles | Until deletion | N/A | 30 days post-request |
| Subsidy data | Indefinite | N/A | When obsolete |
| AI usage logs | 6 months | 3 years | Auto-delete |
| Compliance events | 6 months | 3 years | Per retention_category |
| Website intelligence | With profile | N/A | With profile |

---

## 9. Access Controls

| Role | Profiles | Subsidies | Logs | Admin |
|------|----------|-----------|------|-------|
| User | Own only | Read | Own usage | No |
| Support | Read (limited) | Read | Read | No |
| Admin | Full | Full | Full | Yes |
| AI System | Read (context) | Read | Write | No |

**Implementation:**
- Row Level Security (RLS) in Supabase
- Service role for AI functions
- Audit logging on all access

---

## 10. Incident Response

### 10.1 Data Breach Protocol

1. **Detection** (0-1h): Automated alerts, user reports
2. **Assessment** (1-4h): Scope, affected data, root cause
3. **Containment** (4-24h): Isolate, patch, prevent spread
4. **Notification** (72h max): CNIL, affected users (GDPR Art. 33/34)
5. **Recovery** (Ongoing): Restore, monitor, document
6. **Review** (30 days): Post-incident analysis, improvements

### 10.2 Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| DPO | dpo@masubventionpro.com | 24-48h response |
| Technical | tech@masubventionpro.com | Business hours |
| Emergency | security@masubventionpro.com | 24/7 for breaches |

---

## 11. Regulatory Audit Checklist

For EU AI Act and GDPR audits, provide:

- [ ] This data governance inventory
- [ ] Data flow diagrams
- [ ] DPA copies for all processors
- [ ] Retention policy documentation
- [ ] Access control matrix
- [ ] Bias testing results
- [ ] Quality metrics dashboard
- [ ] Incident logs (if any)
- [ ] Training records (staff handling data)

---

## Appendix A: Data Sources Detail

### A.1 Aides-Territoires API

- **URL:** https://aides-territoires.beta.gouv.fr/api/
- **Data:** French public subsidies
- **Update:** Daily sync
- **License:** Open Data (Etalab)

### A.2 INSEE API (Sirene)

- **URL:** https://api.insee.fr/entreprises/sirene/V3/
- **Data:** French business registry
- **Update:** Real-time lookup
- **License:** Open Data

### A.3 BPI France

- **URL:** Manual curation
- **Data:** Innovation/export subsidies
- **Update:** Weekly manual

---

## Appendix B: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | ECOEMIT SOLUTIONS | Initial inventory |
