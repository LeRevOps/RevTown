# Contributing an Agent to LeClaw

An agent is three things:

1. **What to look for** — a list of HubSpot search queries
2. **What to say about it** — a summary prompt for Claude
3. **Some metadata** — name, severity, fix suggestion

That's it. No framework knowledge required. If you know what "broken" looks like in a RevOps domain, you can write an agent.

The best agents come from practitioners who've lived the pain — a BDR manager who knows what SLA failure looks like, a CSM who knows renewal risk signals, a RevOps analyst who's been burned by bad forecast data. Your domain knowledge is what makes LeClaw accurate.

---

## Before you start

```bash
git clone https://github.com/LeRevOps/leclaw.git
cd leclaw
npm install
cp .env.example .env   # add your HUBSPOT_TOKEN and ANTHROPIC_API_KEY
```

---

## Step 1 — Name your agent

Agents follow the `le-[domain]` pattern:

| Agent | Domain |
|-------|--------|
| `le-data-quality` | CRM field completeness |
| `le-stage-audit` | Pipeline health |
| `le-bdr` | BDR follow-up accountability |
| `le-renewal` | Renewal risk |
| `le-forecast` | Forecast integrity |

Pick a name. Create the folder:

```bash
mkdir agents/le-my-agent
touch agents/le-my-agent/index.ts
```

---

## Step 2 — Write your checks

Each check answers one question: **"How many records have this specific problem?"**

Copy this template into `agents/le-my-agent/index.ts` and fill in your domain knowledge:

```typescript
import type { AgentDefinition, AgentCheck } from "../../core/base.js";

const checks: AgentCheck[] = [

  {
    id: "my_check_id",                       // unique, snake_case
    label: "Deals missing close date",       // shown in reports and Slack
    objectType: "deals",                     // contacts | companies | deals
    filterGroups: [
      {
        filters: [
          {
            propertyName: "closedate",       // HubSpot property API name
            operator: "NOT_HAS_PROPERTY",    // see operators below
          },
        ],
      },
    ],
    properties: ["dealname", "amount", "dealstage"],  // fields to fetch for context
    severity: "critical",                    // critical | warning | info
    fix: "Add a close date — required for accurate forecasting",
    getName: (r) => r.properties.dealname || r.id,
  },

];

export const leMyAgent: AgentDefinition = {
  name: "le-my-agent",
  checks,

  summaryPrompt: (results) => {
    const lines = results
      .filter((r) => r.count > 0)
      .map((r) => `- ${r.check.label}: ${r.count} records`)
      .join("\n");

    return `You are Le My Agent, a RevOps agent. Summarize these issues in 2-3 sentences.
Focus on business impact. Be direct. No bullet points.

Issues found:
${lines || "No issues found."}`;
  },
};
```

---

## Operators

| Operator | Meaning |
|----------|---------|
| `NOT_HAS_PROPERTY` | Field is empty / missing |
| `HAS_PROPERTY` | Field has any value |
| `EQ` | Equals a value — add `value: "something"` |
| `NEQ` | Does not equal |
| `LT` | Less than (use millisecond timestamps for dates) |
| `GT` | Greater than |
| `CONTAINS_TOKEN` | String contains |

**Date check** — records not modified in 30 days:
```typescript
filterGroups: () => [
  {
    filters: [
      {
        propertyName: "hs_lastmodifieddate",
        operator: "LT",
        value: String(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ],
  },
],
```

**Multiple conditions** — filters inside the same `{}` are AND. Separate `{}` objects are OR:
```typescript
filterGroups: [
  // Deal is in Proposal with no amount
  {
    filters: [
      { propertyName: "dealstage", operator: "EQ", value: "presentationscheduled" },
      { propertyName: "amount",    operator: "NOT_HAS_PROPERTY" },
    ],
  },
  // OR: Deal is in Commit with no close date
  {
    filters: [
      { propertyName: "dealstage", operator: "EQ", value: "decisionmakerboughtin" },
      { propertyName: "closedate", operator: "NOT_HAS_PROPERTY" },
    ],
  },
],
```

---

## Step 3 — Add your manifest

Create `agents/le-my-agent/agent.json`. This is how your agent appears in the LeClaw registry and hub page:

```json
{
  "name": "le-my-agent",
  "displayName": "Le My Agent",
  "description": "One sentence — what does this agent audit and why does it matter.",
  "domain": "bdr",
  "crm": ["hubspot"],
  "objectTypes": ["contacts", "deals"],
  "requiredScopes": [
    "crm.objects.contacts.read",
    "crm.objects.deals.read"
  ],
  "status": "live",
  "author": {
    "name": "Your Name",
    "github": "your-github-handle",
    "type": "community"
  },
  "checkCount": 3,
  "tags": ["bdr", "follow-up", "sla"],
  "coreVersion": "0.3.5"
}
```

**Domain options:** `data-quality` · `pipeline` · `bdr` · `forecast` · `routing` · `renewal` · `territory` · `commission` · `qbr` · `duplicates` · `activities` · `deal-desk` — or add your own.

Then add your agent to `registry.json` at the repo root (copy any existing entry as a template).

---

## Step 4 — Register your agent in code

Open `core/registry.ts` and add two lines:

```typescript
import { leMyAgent } from "../agents/le-my-agent/index.js";  // ← add import

export const agentRegistry: Record<string, AgentDefinition> = {
  "le-data-quality": leDataQuality,
  "le-stage-audit":  leStageAudit,
  "le-my-agent":     leMyAgent,   // ← add here
};
```

---

## Step 5 — Test it

```bash
npm run build
npx leclaw
```

Ask Le Directeur about your domain. If records come back flagged, the checks are working.

---

## Step 6 — Open a PR

```bash
git checkout -b agent/le-my-agent
git add agents/le-my-agent/ core/registry.ts registry.json
git commit -m "feat: add le-my-agent — [one line description]"
git push origin agent/le-my-agent
```

In the PR description, include:

- **What domain this covers** — one sentence
- **What "broken" looks like** — what each check detects and why it matters in practice
- **Your background** — optional, but we love knowing the practitioner behind the agent
- **CRM tested on** — HubSpot (Salesforce adapter coming)

---

## Severity guide

| Severity | Use when |
|----------|----------|
| `critical` | Directly breaks revenue: lost leads, wrong forecast, broken routing |
| `warning` | Degrades accuracy or efficiency over time |
| `info` | Nice to have — segmentation, enrichment, reporting quality |

When in doubt: if a CRO would ask about it in a QBR, it's `critical`.

---

## What makes a good agent

**Good** — specific, deterministic, encodes real practitioner knowledge:
> "MQLs with no activity for 48 hours" — a BDR manager knows this is the exact SLA gap that kills pipeline

**Less useful** — broad or already covered by HubSpot's built-in reports:
> "Contacts missing some fields" — too generic to act on

**Good** — catches problems before they become visible to leadership:
> "Deals in Commit with no close date" — catches forecast inflation before the CRO sees it

**Less useful** — retroactive cleanup that doesn't affect current operations.

---

## Don't know TypeScript? Still want to contribute?

Open an issue describing:
- The domain (BDR accountability, renewal risk, commission hygiene, etc.)
- What "broken" looks like in your CRM — be specific
- How often your team currently catches this manually

That's enough. We'll turn it into an agent and credit you. Your domain knowledge is the hard part.

---

## Questions

- [Open an issue](https://github.com/LeRevOps/leclaw/issues)
- [hello@leclaw.io](mailto:hello@leclaw.io)
