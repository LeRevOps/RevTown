# LeClaw

**Your CRM is lying to you. LeClaw tells you where.**

Every RevOps team has the same Friday afternoon moment: a deal slips, a close date was wrong for six weeks, a contact went dark and nobody noticed. You find out when your CRO asks in the pipeline review.

LeClaw is a team of AI agents that runs against your CRM before that happens. Each agent owns a domain of revenue operations — data quality, pipeline health, BDR follow-up, forecast accuracy — and files a structured report. Le Directeur synthesizes them into one answer.

**You ask: "Why is our forecast unreliable?"**
**LeClaw tells you: the 31 deals, the exact fields, the specific reason.**

---

> Native agents are features inside a single product. LeClaw is infrastructure across your entire GTM stack.

**Hosted dashboard:** [app.leclaw.io](https://app.leclaw.io) — connect HubSpot, run agents, no terminal required
**Self-hosted:** `npx leclaw` — interactive CLI, bring your own keys, full source available
**npm:** `@leclaw/core` — build your own agents on the same framework

---

## See It

```
┌─────────────────────────────────────────────────┐
│  LeClaw · Le Directeur                          │
│  orchestrateur · posez une question             │
└─────────────────────────────────────────────────┘

Connecté à HubSpot · 4,821 contacts · 312 deals · 🐳 Docker

> why is our forecast unreliable?

Le Directeur dispatche les agents...

  ↳ le-stage-audit 🐳    ✓ 54/100 · 47 issues
  ↳ le-data-quality 🐳   ✓ 61/100 · 83 issues

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
```

---

## Quick Start

```bash
# No install needed — run against your HubSpot portal now
npx leclaw

# Or set up for the first time (connects HubSpot + Anthropic, writes .env)
npx leclaw setup
```

Requires `HUBSPOT_TOKEN` and `ANTHROPIC_API_KEY`. Run `npx leclaw setup` to configure both interactively — it opens the right pages in your browser, verifies the connections, and writes your `.env`.

---

## Agents

| Agent | Domain | Status |
|---|---|---|
| `le-data-quality` | Field completeness, relationship hygiene | ✅ Live |
| `le-stage-audit` | Deal velocity, pipeline health | ✅ Live |
| `le-bdr` | Follow-up SLA, sequence health | 🔜 Next |
| `le-forecast` | Commit accuracy, pipeline coverage | 🔜 Next |
| `le-plumber` | Assignment gaps, routing health | Roadmap |
| `le-duplicates` | Identity resolution | Roadmap |
| `le-renewal` | Renewal risk, upcoming dates | Roadmap |
| `le-cs` | Health scores, expansion signals | Roadmap |

Each agent is a list of targeted CRM searches. No full table scans. No guessing. Only broken records are touched.

---

## Architecture

LeClaw uses a French-named multi-agent model:

| Concept | Name | Role |
|---|---|---|
| Orchestrator | **Le Directeur** | Dispatches agents, reads rapports, synthesizes insights |
| Specialists | **les agents** | Each owns one CRM domain |
| Validator | **Le Témoin** | Reviews proposed changes before write-back *(roadmap)* |
| Coordinated run | **une mission** | A set of agents dispatched together |
| Structured result | **un rapport** | Filed by each agent, readable by Le Directeur |
| Precise exit | **Le Retrait** | Agent withdraws immediately if stuck, reports exact reason |

**Model cascade:** Each agent uses Claude Haiku for its domain summary. Le Directeur uses Claude Sonnet once for the final synthesis. A full scan costs fractions of a cent.

**Targeted fetching:** Agents use HubSpot's `filterGroups` search API — they find broken records directly instead of scanning your entire CRM. A contact with no phone and an open deal is fetched in one query. Clean records are never touched.

**Docker isolation:** When Docker Desktop is installed, each agent runs in its own container — 512 MB RAM, 0.5 CPU, removed on exit. The `🐳` indicator confirms isolation is active. Falls back to in-process execution automatically if Docker is not available.

---

## How to Build a Custom Agent

Every agent is a list of checks. A check is a targeted search that fetches only the broken records matching a specific problem.

```js
// agents/le-my-agent/index.js
import { runAgent } from "@leclaw/core";

export const leMyAgent = {
  name: "le-my-agent",

  checks: [
    {
      id: "missing_phone",
      label: "Contacts missing phone number",
      objectType: "contacts",

      // Fetches only contacts where phone is null — never scans everything
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
    return `Summarize this CRM audit in 2 sentences. ${total} issues found: ${JSON.stringify(results.map(r => ({ label: r.check.label, count: r.count })))}`;
  },
};

runAgent(leMyAgent, {
  hubspotToken: process.env.HUBSPOT_TOKEN,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});
```

**Time-based checks** — value computed fresh each run:

```js
filterGroups: () => [{
  filters: [{
    propertyName: "hs_lastmodifieddate",
    operator: "LT",
    value: String(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  }]
}]
```

**Escalation** — a broken record is more critical with additional context:

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

---

## Project Structure

```
leclaw/
  agents/
    le-data-quality/      # Field completeness, relationship hygiene
    le-stage-audit/       # Deal pipeline and velocity
  cli/
    index.ts              # Le Directeur — interactive REPL
  core/
    base.ts               # runAgent(), scoring, callClaude(), all types
    hubspot-search.ts     # Targeted search — only fetches broken records
    hubspot-properties.ts # Dynamic custom property discovery
    registry.ts           # Agent registry
    routing.ts            # Keyword router (zero tokens)
    synthesis.ts          # Le Directeur synthesis prompts
    agent-runner.ts       # Docker container entrypoint
    docker-runner.ts      # Container lifecycle, auto-pull, fallback
  examples/
    le-custom-agent/      # Minimal example to fork
  Dockerfile              # Agent runner image (leclaw/runner)
  setup.js                # Interactive setup wizard
```

---

## Design Principles

1. **Shadow mode by default** — read-only until write-back is explicitly enabled. Never modifies your CRM without permission.
2. **Bring your own keys** — your Anthropic API key, your CRM credentials. LeClaw pays $0 in AI costs on your behalf.
3. **Targeted fetching** — agents search for broken records directly. Clean records are never fetched.
4. **Agents share context** — rapports let downstream agents build on prior findings without re-scanning.
5. **Le Retrait** — an agent that cannot complete its work exits immediately with a precise reason. No spinning, no silent failures.
6. **Open source = trust** — read the code. Everything LeClaw accesses and stores is auditable.

---

## Environment Variables

```bash
HUBSPOT_TOKEN=        # HubSpot private app token (CRM scope)
ANTHROPIC_API_KEY=    # Anthropic API key
SLACK_WEBHOOK_URL=    # Slack incoming webhook (optional)
```

Run `npx leclaw setup` to configure these interactively.

---

## Contributing

New agents are the highest-leverage contribution. If you've worked in RevOps and know what broken looks like in a specific domain — BDR follow-up, forecast accuracy, territory coverage — that knowledge belongs in an agent.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the agent spec and contribution guide.

---

## License

[MIT](LICENSE) — fork it, extend it, build on it.

Built by a Sales Ops practitioner who spent three years watching deals slip because the CRM was wrong.

**[leclaw.io](https://leclaw.io) · [app.leclaw.io](https://app.leclaw.io) · [@LeRevOps](https://github.com/LeRevOps)**
