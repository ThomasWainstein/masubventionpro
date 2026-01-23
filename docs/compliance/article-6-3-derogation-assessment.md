# Article 6(3) Derogation Assessment

## EU AI Act Risk Classification for MaSubventionPro

**Document Version:** 1.1
**Assessment Date:** 2026-01-23
**Assessor:** ECOEMIT SOLUTIONS
**System Name:** MaSubventionPro AI Matcher
**Legal Reference:** Regulation (EU) 2024/1689, Article 6(3)

---

## 1. Executive Summary

This document provides the formal risk classification assessment for the MaSubventionPro AI system under the EU AI Act (Regulation (EU) 2024/1689).

**Conclusion:** MaSubventionPro qualifies for the **Article 6(3) derogation** and is classified as a **limited-risk AI system**, NOT a high-risk AI system.

---

## 2. System Description

### 2.1 System Overview

| Attribute | Value |
|-----------|-------|
| **System Name** | MaSubventionPro AI Matcher |
| **Provider** | ECOEMIT SOLUTIONS (SARL) |
| **SIRET** | 987 787 918 00018 |
| **Address** | 102 Quai Louis Bleriot, 75016 Paris, France |
| **System Version** | 2.x |
| **Deployment Date** | 2024 |
| **AI Model Provider** | Mistral AI (French GDPR-compliant provider) |

### 2.2 Intended Purpose

MaSubventionPro is a **subsidy discovery and matching platform** that:

1. **Searches** a database of 10,000+ French and European public subsidies
2. **Matches** business profiles against published eligibility criteria
3. **Recommends** potentially relevant subsidies based on data field alignment
4. **Provides** an AI assistant to answer questions about public funding

### 2.3 Target Users

- Small and Medium Enterprises (SMEs) in France and Europe
- Accountants and financial advisors (B2B)
- Individual entrepreneurs (B2C)

### 2.4 What the System Does NOT Do

- ❌ Does NOT grant or deny subsidies
- ❌ Does NOT submit applications on behalf of users
- ❌ Does NOT make binding eligibility determinations
- ❌ Does NOT replace official government eligibility checks
- ❌ Does NOT perform credit scoring or solvency assessment
- ❌ Does NOT use biometric identification
- ❌ Does NOT perform social scoring

---

## 3. Initial Risk Classification Analysis

### 3.1 Potential High-Risk Category

Under **Annex III, Section 5(a)** of the EU AI Act, AI systems may be classified as high-risk if they are:

> "AI systems intended to be used to evaluate the eligibility of natural persons for public assistance benefits and services"

### 3.2 Why This Category Might Apply

MaSubventionPro analyzes business profiles and recommends public subsidies, which could superficially appear to fall under this category.

### 3.3 Why This Category Does NOT Apply

**Critical Distinction:** MaSubventionPro does not **evaluate eligibility** in the legal sense. It performs **information retrieval and matching** based on publicly available criteria.

| High-Risk Characteristic | MaSubventionPro | Assessment |
|--------------------------|-----------------|------------|
| Makes binding eligibility decisions | No | ✅ Not applicable |
| Grants or denies benefits | No | ✅ Not applicable |
| Replaces government decision-making | No | ✅ Not applicable |
| Users rely on output as final determination | No | ✅ Not applicable |
| Processes personal data for profiling | No | ✅ Not applicable |

---

## 4. Article 6(3) Derogation Analysis

Article 6(3) of the EU AI Act provides that an AI system listed in Annex III shall **not be considered high-risk** if it does not pose a significant risk of harm and meets one of the following conditions.

### 4.1 Condition (a): Narrow Procedural Task

> *"The AI system is intended to perform a narrow procedural task"*

**Assessment: CONDITION MET ✅**

**Justification:**

MaSubventionPro performs a **narrow, procedural matching task**:

1. **Input Processing:** Receives structured business data (SIREN, sector code, region, employee count, turnover)
2. **Matching Logic:** Compares input fields against published subsidy eligibility criteria
3. **Output Generation:** Returns a ranked list of potentially matching subsidies with alignment scores

The system does NOT:
- Assess the *merit* or *worthiness* of the applicant
- Predict future business performance
- Evaluate subjective criteria
- Make judgments about the applicant's character or reliability

**The task is procedural** because it transforms unstructured eligibility criteria into structured matching logic, similar to a search engine filtering results by category.

### 4.2 Condition (b): Improves Human Activity Result

> *"The AI system is intended to improve the result of a previously completed human activity"*

**Assessment: CONDITION MET ✅**

**Justification:**

MaSubventionPro improves the result of **manual subsidy research**, which users would otherwise perform themselves:

1. **Without AI:** User manually searches government websites, reads eligibility criteria, compares to their situation
2. **With AI:** System automates the search and comparison, presenting relevant options faster

**The human activity (finding relevant subsidies) is completed before the system's output is used.** The AI improves efficiency but does not replace the decision-making process.

**Critical Chain of Decisions:**

```
[MaSubventionPro: Recommends subsidies]
        ↓ (Advisory - No decision made)
[User: Reviews recommendations, decides to apply]
        ↓ (Human decision)
[User: Prepares application, submits to government]
        ↓ (Human action)
[Government: Evaluates application, grants/denies]
        ↓ (Authoritative decision - NOT by MaSubventionPro)
```

**The final decision to grant or deny benefits is made by government authorities, not by MaSubventionPro.**

### 4.3 Condition (c): Detect Decision Patterns

> *"The AI system is intended to detect decision-making patterns or deviations from prior decision-making patterns and is not meant to replace or influence the previously completed human assessment"*

**Assessment: NOT APPLICABLE**

This condition relates to systems that analyze past decisions for quality control. MaSubventionPro does not perform this function.

### 4.4 Condition (d): Preparatory Task

> *"The AI system is intended to perform a task that is preparatory to an assessment relevant for the purposes of the use cases listed in Annex III"*

**Assessment: CONDITION MET ✅**

**Justification:**

MaSubventionPro performs a **preparatory information-gathering task**:

1. The "assessment" (eligibility determination) is performed by government agencies
2. MaSubventionPro's role is **preparatory**: helping users identify which assessments to request
3. The system output (recommended subsidies) is an input to the user's decision, not the final assessment

**Analogy:** MaSubventionPro is comparable to a legal research tool that helps lawyers find relevant case law. The tool does not make legal determinations; it prepares information for human decision-makers.

---

## 5. Significant Risk of Harm Analysis

Article 6(3) also requires that the system does not pose a **significant risk of harm** to health, safety, or fundamental rights.

### 5.1 Risk Assessment

| Risk Category | Assessment | Mitigation |
|---------------|------------|------------|
| **Health & Safety** | No risk | System provides information only |
| **Financial Harm** | Low risk | Users may miss subsidies or apply to wrong ones; mitigated by disclaimers |
| **Discrimination** | Low risk | System matches on objective criteria (sector, size, region); bias testing implemented |
| **Privacy** | Low risk | PII detection and masking implemented; data minimization practiced |
| **Autonomy** | No risk | Users retain full decision-making authority |

### 5.2 Harm Mitigation Measures

1. **Clear Disclaimers:** Users are informed that recommendations are advisory only
2. **Accuracy Warnings:** "L'IA peut faire des erreurs" displayed prominently
3. **Source Citations:** Recommendations link to official government sources
4. **Human Oversight:** Users must independently verify eligibility with funding bodies
5. **No Auto-Submission:** System never submits applications automatically

---

## 6. Profiling Exclusion Verification

**Article 6(3) derogation is VOID if the system performs profiling.**

### 6.1 Definition of Profiling (GDPR Article 4(4))

> "Any form of automated processing of personal data consisting of the use of personal data to evaluate certain personal aspects relating to a natural person, in particular to analyse or predict aspects concerning that natural person's performance at work, economic situation, health, personal preferences, interests, reliability, behaviour, location or movements"

### 6.2 MaSubventionPro Analysis

| Profiling Indicator | MaSubventionPro Behavior | Assessment |
|---------------------|--------------------------|------------|
| Evaluates personal aspects | No - evaluates business attributes | ✅ Not profiling |
| Predicts economic situation | No - matches against current criteria | ✅ Not profiling |
| Analyzes reliability/behavior | No - no behavioral analysis | ✅ Not profiling |
| Uses personal data for predictions | No - uses business registration data | ✅ Not profiling |

**Conclusion:** MaSubventionPro does NOT perform profiling as defined by GDPR. The system:
- Matches **business entities** (not natural persons' personal aspects)
- Uses **objective criteria** (sector code, region, employee count)
- Does NOT predict behavior, reliability, or personal characteristics

---

## 7. Conclusion and Classification

### 7.1 Final Classification

Based on the analysis above, MaSubventionPro:

1. ✅ Falls under Article 6(3)(a) - Performs a narrow procedural task
2. ✅ Falls under Article 6(3)(b) - Improves the result of human activity
3. ✅ Falls under Article 6(3)(d) - Performs a preparatory task
4. ✅ Does NOT pose a significant risk of harm
5. ✅ Does NOT perform profiling

**CLASSIFICATION: LIMITED-RISK AI SYSTEM**

MaSubventionPro is **NOT classified as a high-risk AI system** under the EU AI Act.

### 7.2 Applicable Obligations

As a limited-risk AI system, MaSubventionPro must comply with:

| Obligation | Article | Status |
|------------|---------|--------|
| Transparency to users | Article 52 | ✅ Implemented |
| AI disclosure notice | Article 52(1) | ✅ Implemented |
| Human oversight design | Article 14 | ✅ Implemented |
| Provider registration | Article 49(2) | 📋 To be completed |

### 7.3 Registration Requirement

Although not high-risk, MaSubventionPro must be registered in the EU AI database as a system relying on the **Article 6(3) derogation**.

**Registration Status:** Pending (to be completed before August 2, 2026)

---

## 8. Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CEO / Gérant | Thomas Wainstein | _________________ | ________ |
| Legal Counsel | _________________ | _________________ | ________ |
| Technical Lead | _________________ | _________________ | ________ |

---

## 9. Review Schedule

This assessment must be reviewed:

- **Annually** (next review: January 2027)
- **Upon significant system changes** (new AI model, new data sources)
- **Upon regulatory guidance updates** (EU Commission clarifications)

---

## 10. Supporting Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| AI Transparency Page | `/ai-transparency` | Public disclosure |
| CGU AI Section | `/cgu` | User terms |
| Privacy Policy | `/privacy` | Data processing |
| Technical Documentation | `/docs/compliance/technical-documentation.md` | System architecture |
| Bias Testing Results | `/docs/compliance/bias-testing-results.md` | Fairness audit |
| Audit Logs Schema | `/src/types/compliance-events.ts` | Logging specification |

---

## Appendix A: Legal References

- **Regulation (EU) 2024/1689** - EU AI Act
- **Article 6** - Classification rules for high-risk AI systems
- **Article 6(3)** - Derogation conditions
- **Annex III, Section 5(a)** - Public assistance benefits AI systems
- **GDPR Article 4(4)** - Definition of profiling

## Appendix B: Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | ECOEMIT SOLUTIONS | Initial assessment |
| 1.1 | 2026-01-23 | ECOEMIT SOLUTIONS | Migrated AI provider from DeepSeek to Mistral AI for GDPR compliance (DPA availability) |
