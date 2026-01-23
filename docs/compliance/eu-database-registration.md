# EU AI Act Database Registration

## Article 51 - Registration in EU Database

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Responsible:** ECOEMIT SOLUTIONS (SARL)
**System:** MaSubventionPro AI Matcher

---

## 1. Registration Overview

### 1.1 Regulatory Requirement

Per EU AI Act Article 51, AI systems classified as high-risk must be registered in the EU database before being placed on the market or put into service.

**Key Dates:**
- EU AI Act Entry into Force: August 1, 2024
- High-Risk Registration Deadline: August 2, 2026
- Limited-Risk Transparency Obligations: August 2, 2025

### 1.2 MaSubventionPro Classification

| Aspect | Status |
|--------|--------|
| AI System Type | Subsidy Matching Recommender |
| Risk Classification | Limited Risk (Article 6(3) Derogation) |
| Registration Required | Optional (recommended for transparency) |
| Transparency Obligations | Required (Article 52) |

**Note:** MaSubventionPro operates under Article 6(3) derogation as a limited-risk AI system. While registration is not mandatory, voluntary registration demonstrates commitment to transparency.

---

## 2. Pre-Registration Checklist

### 2.1 Technical Documentation (Article 11)

- [x] System description and intended purpose
- [x] AI development methodology documentation
- [x] Training data governance (Article 10)
- [x] Bias testing procedures
- [x] Accuracy metrics and limitations
- [ ] Third-party audit report (recommended)

### 2.2 Quality Management (Article 17)

- [x] Quality management system documented
- [x] Risk assessment completed
- [x] Post-market monitoring plan
- [x] Incident reporting procedures
- [x] Data governance policies

### 2.3 Transparency Documentation (Article 52)

- [x] User-facing AI disclosure
- [x] Technical transparency page (/ai-transparency)
- [x] GDPR-compliant privacy policy
- [x] Right to human review implementation
- [x] Explanation of AI limitations

### 2.4 Organizational Requirements

- [x] Data Protection Officer designated
- [x] AI compliance officer designated
- [x] Staff training program in place
- [ ] External legal review completed
- [ ] Notified body consultation (if applicable)

---

## 3. Registration Information Template

### 3.1 Provider Information

| Field | Value |
|-------|-------|
| Provider Name | ECOEMIT SOLUTIONS (SARL) |
| Legal Entity ID | [SIRET: To be added] |
| Registered Address | [Address in France] |
| Contact Email | dpo@masubventionpro.com |
| Authorized Representative | [Name of CEO/Legal Rep] |

### 3.2 AI System Information

| Field | Value |
|-------|-------|
| System Name | MaSubventionPro AI Matcher |
| Version | 2.0.0 |
| Intended Purpose | Match French businesses with eligible subsidies using AI-powered analysis |
| Target Users | French SMEs, startups, and enterprises |
| Deployment Model | SaaS (cloud-based) |
| AI Technologies Used | NLP, Semantic Matching, Profile Analysis |
| AI Provider | Mistral AI (France) |
| Data Processing Location | EU (Frankfurt, DE) |

### 3.3 Risk Classification Justification

**Classification:** Limited Risk (Not High-Risk)

**Justification per Article 6(3):**

1. **Not used for consequential decisions:**
   - System provides recommendations only
   - No automatic decisions without human review
   - Users make final application decisions

2. **No high-risk Annex III categories:**
   - Not used for employment decisions
   - Not used for credit scoring
   - Not used for law enforcement
   - Not used for migration control

3. **Minimal discrimination risk:**
   - Matches based on objective eligibility criteria
   - Regular bias testing conducted
   - Human review always available

### 3.4 Conformity Declaration Elements

For voluntary registration, prepare:

```
DECLARATION OF CONFORMITY

We, ECOEMIT SOLUTIONS (SARL), declare under our sole responsibility that:

The AI system "MaSubventionPro AI Matcher" (Version 2.0.0) is in conformity
with the requirements of Regulation (EU) 2024/1689, specifically:

- Article 10: Data and data governance
- Article 13: Transparency and provision of information to deployers
- Article 14: Human oversight
- Article 52: Transparency obligations for certain AI systems

The system is classified as limited-risk under Article 6(3) and voluntarily
registered in the EU database for transparency purposes.

Date: [Registration Date]
Signature: [Authorized Representative]
```

---

## 4. Registration Process

### 4.1 EU Database Portal

**URL:** https://ai-system-database.ec.europa.eu (Expected launch: 2025)

**Steps:**
1. Create provider account with EU Login
2. Submit organization verification documents
3. Complete AI system information form
4. Upload technical documentation
5. Submit conformity declaration
6. Receive registration number

### 4.2 Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Documentation complete | Q1 2026 | ✅ Done |
| Legal review | Q2 2026 | ⏳ Pending |
| EU database access | Q2 2026 | ⏳ Waiting for portal |
| Registration submission | Q3 2026 | ⏳ Pending |
| Registration confirmed | Q3 2026 | ⏳ Pending |

---

## 5. Post-Registration Obligations

### 5.1 Update Requirements

Registration must be updated when:
- [ ] System version significantly changes
- [ ] Intended purpose expands
- [ ] New risk factors identified
- [ ] Provider information changes
- [ ] Substantial modification to AI model

### 5.2 Annual Review

| Review Item | Frequency | Next Due |
|-------------|-----------|----------|
| Registration accuracy | Annual | Jan 2027 |
| Documentation update | Annual | Jan 2027 |
| Bias test results | Quarterly | Apr 2026 |
| Incident log review | Monthly | Feb 2026 |

---

## 6. Monitoring & Alerts

### 6.1 Regulatory Monitoring

Subscribe to updates from:
- European Commission AI Act updates
- French DGE (Direction Générale des Entreprises)
- CNIL AI guidance
- French notified bodies

### 6.2 Internal Reminders

| Reminder | Trigger | Owner |
|----------|---------|-------|
| Registration deadline | 90 days before | Legal Team |
| Documentation review | Quarterly | Tech Lead |
| Bias testing | Monthly | AI Team |
| Conformity check | Annually | DPO |

---

## 7. Contact Information

| Role | Contact | Responsibility |
|------|---------|----------------|
| AI Compliance Lead | compliance@masubventionpro.com | Overall registration |
| DPO | dpo@masubventionpro.com | Data protection aspects |
| Technical Lead | tech@masubventionpro.com | Technical documentation |
| Legal | legal@masubventionpro.com | Conformity declaration |

---

## Appendix A: Resources

### A.1 Official Resources

- [EU AI Act Full Text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [European Commission AI Act FAQ](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
- [CNIL AI Guidance](https://www.cnil.fr/fr/intelligence-artificielle)

### A.2 Internal Documentation

- `/docs/compliance/article-6-3-derogation.md` - Risk classification justification
- `/docs/compliance/data-governance-inventory.md` - Data governance documentation
- `/docs/compliance/staff-training-records.md` - Training program
- `/src/pages/AITransparencyPage.tsx` - Public transparency page

---

## Appendix B: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | ECOEMIT SOLUTIONS | Initial document |
