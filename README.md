# LeClaw

**Full Stack RevOps. A team of AI agents for your CRM.**

> Native agents are features inside a single product. LeClaw is infrastructure across your entire GTM stack.

LeClaw is an open-source RevOps agent framework. Deploy a coordinated team of specialized agents into your CRM — each one owns a domain of revenue operations, shares context with the others, and only ever touches broken records.

**Hosted product:** [app.leclaw.io](https://app.leclaw.io) — connect HubSpot, run agents, no terminal required
**Self-hosted:** clone this repo, bring your own keys, run or fork any agent

---

## Architecture

LeClaw uses a French-named multi-agent model:

| Concept | Name | Role |
|---|---|---|
| Orchestrator | **Le Directeur** | Dispatches missions, reads rapports, synthesizes insights |
| Specialist agents | **les agents** | Each owns one CRM domain |
| Validator | **Le Témoin** | Reviews proposed changes before write-back |
| Coordinated run | **une mission** | A set of agents dispatched together |
| Structured result | **un rapport** | Filed by each agent, readable by Le Directeur and other agents |
| Precise exit | **Le Retrait** | Agent withdraws immediately if stuck, reports exact reason |

Agents share context through rapports. When `le-bdr` runs after `le-data-quality`, it reads the prior rapport and builds on those findings — it does not re-scan.

---

## Agent Library

| Agent | Domain | Status |
|---|---|---|
| `le-data-quality` | Field completeness, relationship hygiene | Live |
| `le-stage-audit` | Deal velocity, pipeline health | Live |
| `le-duplicates` | Identity resolution | Roadmap |
| `le-lead-gen` | MQL quality, attribution gaps | Roadmap |
| `le-bdr` | Follow-up SLA, sequence health | Roadmap |
| `le-routing` | Assignment gaps, round robin health | Roadmap |
| `le-forecast` | Commit accuracy, pipeline coverage | Roadmap |
| `le-deal-desk` | Deal structure, discount hygiene | Roadmap |
| `le-activities` | Meeting and call logging gaps | Roadmap |
| `le-renewal` | Renewal risk, upcoming dates | Roadmap |
| `le-cs` | Health scores, expansion signals | Roadmap |

---

## Quick Start

```bash
git clone https://github.com/LeRevOps/leclaw
cd leclaw
npm install
npm run setup
npm run data-quality
```

`npm run setup` connects your CRM, Anthropic API key, and Slack in under 3 minutes.
All credentials are masked on input and saved to `.env` — never committed, never logged.

```bash
npm run data-quality              # auto-detects CRM from .env
npm run data-quality -- --crm hubspot
npm run data-quality -- --crm salesforce
```

---

## Interactive CLI

Ask Le Directeur questions about your CRM in plain language. It routes to the right agents, runs them, and streams a synthesized answer back.

```bash
# Run directly (no install needed)
npx leclaw

# Or after cloning
npm run build
npm run cli
```

Requires `HUBSPOT_TOKEN` and `ANTHROPIC_API_KEY` in your `.env` or shell environment.

```
┌─────────────────────────────────────────────────┐
│  LeClaw · Le Directeur                          │
│  orchestrateur · posez une question             │
└─────────────────────────────────────────────────┘

Connecté à HubSpot · 4,821 contacts · 312 deals

Type a question or "exit" to quit.

> why is our forecast unreliable?

Le Directeur dispatche les agents...

  ↳ le-stage-audit    ✓ 54/100 · 47 issues
  ↳ le-data-quality   ✓ 61/100 · 83 issues

Le Directeur · synthèse
────────────────────────────────────────────────

Your forecast is unreliable primarily because 31
deals are missing close dates and 19 are past
their close date without being marked closed lost
— these distort your pipeline view directly.
Compounding this, 47 deals have no associated
contact, making it impossible to validate deal
legitimacy or assign follow-up. Start by running
a close date sweep on all open deals in the last
30 days and mark anything stale as closed lost.

Agents: le-stage-audit (54/100) · le-data-quality (61/100)

>
```

---

## How to Build a Custom Agent

Every LeClaw agent is a list of **checks**. A check is a targeted HubSpot search query that fetches only the broken records matching a specific problem — clean records are never touched.

### 1. Create your agent

```js
// agents/le-my-agent/index.js
import { runAgent } from "../../lib/base.js";

export const leMyAgent = {
  name: "le-my-agent",

  checks: [
    {
      id: "missing_phone",
      label: "Contacts missing phone number",
      objectType: "contacts",

      // Only fetches contacts where phone is null — never scans the full CRM
      filterGroups: [
        { filters: [{ propertyName: "phone", operator: "NOT_HAS_PROPERTY" }] }
      ],

      properties: ["firstname", "lastname", "email", "phone"],
      severity: "warning",
      fix: "Add phone number for outbound sequencing",
      getName: (r) => r.properties.email || r.id,
    },
  ],

  summaryPrompt: (results) => {
    const total = results.reduce((sum, r) => sum + r.count, 0);
    return `Summarize this CRM audit in 2 sentences. ${total} issues found across: ${JSON.stringify(results.map(r => ({ label: r.check.label, count: r.count })))}`;
  },
};

// Run directly
runAgent(leMyAgent, { token: process.env.HUBSPOT_API_TOKEN, anthropicKey: process.env.ANTHROPIC_API_KEY });
```

### 2. Add a script

```json
"my-agent": "node agents/le-my-agent/index.js"
```

### Time-based checks

Use a function for timestamp-based checks so the value is computed fresh each run:

```js
filterGroups: () => [{
  filters: [{
    propertyName: "hs_lastmodifieddate",
    operator: "LT",
    value: String(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  }]
}]
```

### Relationship checks

Check associations between objects:

```js
// Contacts with no associated company
filterGroups: [{ filters: [{ propertyName: "associations.company", operator: "NOT_HAS_PROPERTY" }] }]

// Deals with no associated contact
filterGroups: [{ filters: [{ propertyName: "associations.contact", operator: "NOT_HAS_PROPERTY" }] }]
```

### Escalation

A broken record is more critical when it has additional CRM context:

```js
escalateIf: {
  description: "has an open deal",
  filterGroups: [{
    filters: [
      { propertyName: "email", operator: "NOT_HAS_PROPERTY" },
      { propertyName: "associations.deal", operator: "HAS_PROPERTY" }
    ]
  }],
  escalatedSeverity: "critical"
}
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full agent spec and contribution guide.

---

## Project Structure

```
leclaw/
  agents/
    le-data-quality/      # Field completeness, relationship hygiene
    le-stage-audit/       # Deal pipeline and velocity
  core/
    hubspot.js            # HubSpot API adapter
    salesforce.js         # Salesforce API adapter
    slack.js              # Slack delivery
    ai.js                 # Claude API (cascading model router)
  lib/
    base.js               # Agent runner — lifecycle, scoring, Le Retrait
    hubspot-search.js     # Targeted search — only fetches broken records
    hubspot-properties.js # Dynamic custom property discovery
  examples/
    le-custom-agent/      # Minimal example to fork
  setup.js                # Interactive setup wizard
```

---

## Design Principles

1. **Shadow mode by default** — read-only until write-back is explicitly enabled. Never touch the CRM without permission.
2. **Bring your own keys** — Anthropic API key, CRM credentials. LeClaw pays $0 in AI costs.
3. **Targeted fetching** — agents search for broken records directly. Clean records are never touched.
4. **Agents share context** — rapports let downstream agents build on prior findings.
5. **Le Retrait** — an agent that cannot complete its work exits immediately with a precise reason. No spinning, no silent failures.
6. **Open source = trust** — read the code. [SECURITY.md](SECURITY.md) documents exactly what data LeClaw accesses and stores.

---

## Environment Variables

```bash
# HubSpot
HUBSPOT_API_TOKEN=

# Salesforce
SALESFORCE_ACCESS_TOKEN=
SALESFORCE_INSTANCE_URL=

# AI
ANTHROPIC_API_KEY=

# Slack (optional)
SLACK_WEBHOOK_URL=
```

Run `npm run setup` to configure these interactively.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) — fork it, extend it, build on it.

Built by a Sales Ops practitioner who spent too much time clicking around.

**[leclaw.io](https://leclaw.io) · [app.leclaw.io](https://app.leclaw.io) · [LinkedIn](https://www.linkedin.com/company/leclaw/)**
