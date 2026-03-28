# Le Data Quality

**Domain:** Data & Records
**Objects:** contacts, companies
**CRM:** HubSpot (Salesforce coming)
**Status:** Live — `@leclaw/core` v0.3.6+

---

## Use in Claude Projects (no code required)

Copy everything between the lines below and paste it into a Claude Project as the project instructions. Export your contacts and companies from HubSpot or Salesforce as a CSV, share it with Claude, and Le Data Quality goes to work.

---

```
You are Le Data Quality, a resident specialist from Revtown — the open-source GTM agent hub. Your job is to audit CRM data quality for RevOps teams.

When a user shares CRM data (CSV export, a list of records, or a description), look for these issues:

CONTACTS:
1. Missing email (critical) — Can't be sequenced, emailed, or deduplicated. If the contact also has an open deal, flag it as urgent.
2. Missing first or last name (warning) — Can't personalize outreach. Makes attribution reporting unreliable.
3. Not associated to a company (warning) — Breaks account-based reporting. Can't roll up activity to the account, can't score accounts, can't route by company size.
4. Missing job title (info) — Primary signal for persona segmentation. Without it, the same message goes to VPs and SDRs.

COMPANIES:
5. Missing domain (critical) — Domain is the primary key for deduplication and enrichment. Without it, duplicates will be created for every new contact from the same company. Enrichment tools (Clearbit, Apollo, etc.) require a domain.
6. Missing industry (warning) — Required for territory assignment, ICP filtering, and vertical-specific routing.
7. No contacts associated (warning) — Ghost companies inflate account count and make territory coverage reporting misleading.

For each issue found:
- Count how many records are affected
- Explain why it matters for the business (sequencing, forecasting, reporting, routing)
- Say what to fix first
- Give a severity: critical / warning / info

End every audit with:
- A health score (0–100) — 100 is a clean CRM, subtract points for each issue weighted by severity and count
- A plain-English summary of the top 3 things to fix and why

If the user doesn't have data to share yet, help them export the right fields from HubSpot: Contacts → Export → include email, firstname, lastname, jobtitle, associatedcompanyid. Companies → Export → include domain, industry, associatedcontacts.
```

---

## What it does

Audits every contact and company in your CRM for missing critical fields and broken relationships. Returns a health score (0–100) and a plain-English summary of what's wrong and why it matters.

The checks below represent the minimum viable data quality bar for a B2B CRM. If a contact doesn't have an email, it can't be sequenced. If a company doesn't have a domain, it can't be enriched or deduplicated. These aren't nice-to-haves — they're operational blockers.

---

## Checks

### `contact_missing_email` · critical

**Why it matters:** Contacts without email can't be sequenced, emailed, or reliably deduplicated. They break routing rules and pollute segment counts. If a contact has an open deal and no email, it's especially dangerous — the deal can stall silently.

```json
filterGroups: [
  { "filters": [{ "propertyName": "email", "operator": "NOT_HAS_PROPERTY" }] }
]
```

**Fix:** Add an email address.
**Escalation:** If the contact also has an open deal → escalate to critical.

---

### `contact_missing_name` · warning

**Why it matters:** Anonymous contacts can't be personalized in outreach. They also make attribution reporting unreliable — you can't tell whether a converted contact was a person or a ghost.

```json
filterGroups: [
  { "filters": [{ "propertyName": "firstname", "operator": "NOT_HAS_PROPERTY" }] },
  { "filters": [{ "propertyName": "lastname",  "operator": "NOT_HAS_PROPERTY" }] }
]
```
*Outer array = OR: missing first name OR missing last name.*

---

### `contact_no_company` · warning

**Why it matters:** Unassociated contacts break account-based reporting entirely. You can't roll up contact activity to the account, can't score accounts, can't route by company size or industry.

```json
filterGroups: [
  { "filters": [{ "propertyName": "associations.company", "operator": "NOT_HAS_PROPERTY" }] }
]
```

---

### `contact_missing_job_title` · info

**Why it matters:** Job title is the primary signal for persona-based segmentation and ICP scoring. Without it, you're sending the same message to VPs and SDRs.

```json
filterGroups: [
  { "filters": [{ "propertyName": "jobtitle", "operator": "NOT_HAS_PROPERTY" }] }
]
```

---

### `company_missing_domain` · critical

**Why it matters:** Domain is the primary key for company deduplication and enrichment. Without it, you'll create duplicates on every new contact from the same company. Enrichment tools (Clearbit, Apollo, etc.) require a domain.

```json
filterGroups: [
  { "filters": [{ "propertyName": "domain", "operator": "NOT_HAS_PROPERTY" }] }
]
```

---

### `company_missing_industry` · warning

**Why it matters:** Industry is required for territory assignment, ICP filtering, and vertical-specific routing. Missing industry means you can't segment by market.

```json
filterGroups: [
  { "filters": [{ "propertyName": "industry", "operator": "NOT_HAS_PROPERTY" }] }
]
```

---

### `company_no_contacts` · warning

**Why it matters:** Ghost companies inflate your account count and make territory coverage reporting misleading. A company with no contacts is either a data entry artifact or needs to be archived.

```json
filterGroups: [
  { "filters": [{ "propertyName": "associations.contact", "operator": "NOT_HAS_PROPERTY" }] }
]
```

---

## Fork this agent

Copy this into `agents/le-my-agent/index.ts` and change the checks:

```typescript
import type { AgentDefinition, AgentCheck } from "../../core/base.js";

const checks: AgentCheck[] = [
  {
    id: "contact_missing_email",
    label: "Contacts missing email",
    objectType: "contacts",
    filterGroups: [
      { filters: [{ propertyName: "email", operator: "NOT_HAS_PROPERTY" }] },
    ],
    properties: ["firstname", "lastname", "email"],
    severity: "critical",
    fix: "Add an email address to this contact",
    getName: (r) =>
      [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") || r.id,
  },
  // Add more checks here...
];

export const leMyAgent: AgentDefinition = {
  name: "le-my-agent",
  checks,
  summaryPrompt: (results) => {
    const issues = results.filter(r => r.count > 0)
      .map(r => `- ${r.check.label}: ${r.count} records`)
      .join("\n");
    return `You are Le My Agent. Summarize these CRM issues in 2-3 sentences. Focus on business impact.\n\nIssues:\n${issues || "None."}`;
  },
};
```

Then register it in `core/registry.ts`:
```typescript
import { leMyAgent } from "../agents/le-my-agent/index.js";
export const agentRegistry = {
  // ...existing agents
  "le-my-agent": leMyAgent,
};
```

---

## Customization

**Add org-specific thresholds** using `buildChecks(orgConfig)`:
```typescript
export const leMyAgent: AgentDefinition = {
  name: "le-my-agent",
  buildChecks: (orgConfig) => [
    {
      id: "deal_below_threshold",
      label: `Deals below $${orgConfig.high_value_deal_threshold}`,
      objectType: "deals",
      filterGroups: [
        { filters: [{ propertyName: "amount", operator: "LT", value: String(orgConfig.high_value_deal_threshold) }] }
      ],
      // ...
    }
  ],
  summaryPrompt: (results) => `...`,
};
```

**Available operators:** `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `HAS_PROPERTY`, `NOT_HAS_PROPERTY`, `CONTAINS_TOKEN`, `NOT_CONTAINS_TOKEN`

---

## Contribute improvements

See something wrong or missing? Open a PR against this file.
Don't know TypeScript? [Open an issue](https://github.com/LeRevOps/leclaw/issues) describing the check — we'll build it and credit you.
