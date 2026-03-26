# Le Stage Audit

**Domain:** Pipeline
**Objects:** deals
**CRM:** HubSpot (Salesforce coming)
**Status:** Live — `@leclaw/core` v0.3.6+

## What it does

Audits every open deal in your pipeline for velocity problems, missing fields, and hygiene issues that distort forecast. Returns a health score (0–100) and a plain-English summary of what's actually wrong.

The checks below catch the issues that get RevOps teams blindsided in CRO reviews: the deal with no close date that never appears in forecast, the past-close deal the rep keeps rolling forward, the stuck deal nobody's touched in 6 weeks. This agent surfaces them before the QBR.

---

## Checks

### `deal_no_close_date` · critical

**Why it matters:** A deal with no close date is invisible to forecast. It also signals zero urgency on the rep's part — there's no date to work backwards from. This is the single most common forecast blindspot in HubSpot.

```json
filterGroups: [
  { "filters": [{ "propertyName": "closedate", "operator": "NOT_HAS_PROPERTY" }] }
]
```

**Fix:** Add a close date. If the rep genuinely doesn't know, default to end of quarter.

---

### `deal_no_amount` · critical

**Why it matters:** Deals without a dollar value don't contribute to pipeline coverage calculations. You can have 10 deals in your pipeline and a coverage ratio of 0 if none have amounts. Also makes it impossible to prioritize by deal size.

```json
filterGroups: [
  { "filters": [{ "propertyName": "amount", "operator": "NOT_HAS_PROPERTY" }] }
]
```

**Escalation:** If the deal is also in `closedwon` → escalate. A closed won deal with no amount means revenue is not being recorded.

---

### `deal_no_contact` · critical

**Why it matters:** A deal with no contact is an orphan. No one to email, no activity to log, no influence to map. These deals stall silently because there's no human attached to them.

```json
filterGroups: [
  { "filters": [{ "propertyName": "associations.contact", "operator": "NOT_HAS_PROPERTY" }] }
]
```

---

### `deal_stuck_30d` · warning

**Why it matters:** Stalled deals inflate pipeline coverage without real probability of closing. The average B2B sales cycle is 30–90 days. No stage movement after 30 days is a stall signal. At 60 days with no movement, it should be escalated or marked lost.

```json
filterGroups: [
  {
    "filters": [{
      "propertyName": "hs_lastmodifieddate",
      "operator": "LT",
      "value": "<Date.now() - 30 * 24 * 60 * 60 * 1000>"
    }]
  }
]
```

*Value is computed at runtime — not a static string.*

**Customize:** Use `buildChecks(orgConfig)` with `orgConfig.avg_sales_cycle_days` to match your actual sales cycle.

---

### `deal_past_close_date` · warning + write-back

**Why it matters:** Past-close deals are the single biggest source of forecast inflation. Reps roll them forward quarter after quarter. Every past-close open deal is either already dead or needs an updated date. This check surfaces all of them.

```json
filterGroups: [
  {
    "filters": [
      { "propertyName": "closedate",   "operator": "LT",  "value": "<Date.now()>" },
      { "propertyName": "dealstage",   "operator": "NEQ", "value": "closedwon" },
      { "propertyName": "dealstage",   "operator": "NEQ", "value": "closedlost" }
    ]
  }
]
```

*All three filters are AND logic (same filterGroup). The NEQ closedwon/closedlost excludes already-closed deals.*

**Write-back enabled:** Le Témoin can mark these as `closedlost` with one click. Requires approval.

---

## Fork this agent

Copy this into `agents/le-my-agent/index.ts`:

```typescript
import type { AgentDefinition, AgentCheck } from "../../core/base.js";

const checks: AgentCheck[] = [
  {
    id: "deal_no_close_date",
    label: "Deals missing close date",
    objectType: "deals",
    filterGroups: [
      { filters: [{ propertyName: "closedate", operator: "NOT_HAS_PROPERTY" }] },
    ],
    properties: ["dealname", "amount", "dealstage", "closedate"],
    severity: "critical",
    fix: "Add a close date — required for accurate forecasting",
    getName: (r) => r.properties.dealname || r.id,
  },
  // Add more checks here...
];

export const leMyAgent: AgentDefinition = {
  name: "le-my-agent",
  checks,
  summaryPrompt: (results) => {
    const issues = results.filter(r => r.count > 0)
      .map(r => `- ${r.check.label}: ${r.count} deals`)
      .join("\n");
    return `You are Le My Agent. Summarize these pipeline issues in 2-3 sentences. Focus on forecast risk.\n\nIssues:\n${issues || "None."}`;
  },
};
```

---

## Customization

**Match your actual sales cycle** using `buildChecks(orgConfig)`:
```typescript
buildChecks: (orgConfig) => [
  {
    id: "deal_stuck",
    label: `Deals stuck for ${orgConfig.avg_sales_cycle_days}+ days`,
    objectType: "deals",
    filterGroups: () => [{
      filters: [{
        propertyName: "hs_lastmodifieddate",
        operator: "LT",
        value: String(Date.now() - orgConfig.avg_sales_cycle_days * 24 * 60 * 60 * 1000),
      }],
    }],
    // ...
  }
]
```

**Add write-back** for automated fixes:
```typescript
writeback: { description: "Mark as closed lost", requiresApproval: true, automated: false },
applyFix: (record) => ({
  objectType: "deals",
  objectId: record.id,
  properties: { dealstage: "closedlost" },
  description: `Mark "${record.properties.dealname}" as closed lost`,
}),
```

---

## Contribute improvements

Know a pipeline check we're missing? Open a PR.
Don't know TypeScript? [Open an issue](https://github.com/LeRevOps/leclaw/issues) — describe the check and we'll build it.
