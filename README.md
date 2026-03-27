# Revtown

**Your CRM is lying to you. Revtown tells you where.**

Every RevOps team has the same Friday afternoon moment: a deal slips, a close date was wrong for six weeks, a contact went dark and nobody noticed. You find out when your CRO asks in the pipeline review.

Revtown is an open-source hub of RevOps agents that runs against your CRM before that happens. Each agent owns a domain of revenue operations — data quality, pipeline health, BDR follow-up, forecast accuracy — and files a structured report. Le Directeur synthesizes them into one answer.

**You ask: "Why is our forecast unreliable?"**
**Revtown tells you: the 31 deals, the exact fields, the specific reason.**

---

> Native agents are features inside a single product. Revtown is the open-source GTM agent hub — agents for every domain, deployable against any CRM.

**Hosted dashboard:** [app.revtown.io](https://app.revtown.io) — connect HubSpot, run agents, no terminal required
**Self-hosted:** `npx revtown` — interactive CLI, bring your own keys, full source available
**npm:** `@revtown/core` — build your own agents on the same framework

---

## See It

```
┌─────────────────────────────────────────────────┐
│  Revtown · Le Directeur                         │
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

**Not a developer?** No terminal required — use the hosted dashboard:
→ **[app.revtown.io](https://app.revtown.io)** — connect HubSpot, run agents, done.

**Developer or self-hosted:**

Requires Node.js 18+, a [HubSpot Private App token](https://developers.hubspot.com/docs/api/private-apps), and an [Anthropic API key](https://console.anthropic.com/settings/keys).

```bash
# First time — connects HubSpot + Anthropic, writes .env, launches CLI
npx revtown setup

# Already configured
npx revtown
```

`npx revtown setup` opens the right pages in your browser, verifies each connection, and writes your `.env` automatically.

---

## Agents

| Agent | Domain | Status |
|---|---|---|
| `le-data-quality` | Field completeness, relationship hygiene | ✅ Live |
| `le-stage-audit` | Deal velocity, pipeline health | ✅ Live |
| `le-bdr` | Follow-up SLA, unworked MQLs, bounce hygiene | ✅ Live |
| `le-activities` | Dark deals, missing next steps, engagement gaps | ✅ Live |
| `le-deal-review` | Pre-meeting deal intelligence, close date hygiene | ✅ Live |
| `le-forecast` | Commit accuracy, pipeline coverage | 🔜 Next |
| `le-plumber` | Assignment gaps, routing health | Roadmap |
| `le-duplicates` | Identity resolution | Roadmap |
| `le-renewal` | Renewal risk, upcoming dates | Roadmap |
| `le-cs` | Health scores, expansion signals | Roadmap |

Each agent is a list of targeted CRM searches. No full table scans. No guessing. Only broken records are touched.

Every live agent has a `CLAUDE.md` — copy it into any Claude project to apply that agent's logic to your CRM questions directly.

---

## Architecture

Revtown uses a multi-agent model with a French-named orchestrator:

| Concept | Name | Role |
|---|---|---|
| Orchestrator | **Le Directeur** | Dispatches agents, reads rapports, synthesizes insights |
| Workers | **les agents** | Each owns one CRM domain |
| Validator | **Le Témoin** | Reviews proposed changes before write-back |
| Coordinated run | **une mission** | A set of agents dispatched together |
| Structured result | **un rapport** | Filed by each agent, readable by Le Directeur |
| Precise exit | **Le Retrait** | Agent withdraws immediately if stuck, reports exact reason |

**Model cascade:** Each agent uses Claude Haiku for its domain summary. Le Directeur uses Claude Sonnet once for the final synthesis. A full scan costs fractions of a cent.

**Targeted fetching:** Agents use HubSpot's `filterGroups` search API — they find broken records directly instead of scanning your entire CRM.

**Docker isolation:** When Docker Desktop is installed, each agent runs in its own container — 512 MB RAM, 0.5 CPU, removed on exit.

---

## How to Build a Custom Agent

Every agent is a list of checks. A check is a targeted search that fetches only the broken records matching a specific problem.

```js
// agents/le-my-agent/index.js
import { runAgent } from "@revtown/core";

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

See the `CLAUDE.md` in any live agent folder for the full fork guide.

---

## Project Structure

```
revtown/
  agents/
    le-data-quality/      # Field completeness, relationship hygiene
      CLAUDE.md           # Fork guide + domain knowledge
    le-stage-audit/       # Deal pipeline and velocity
      CLAUDE.md
  cli/
    index.ts              # Le Directeur — interactive REPL
  core/
    base.ts               # runAgent(), scoring, callClaude(), all types
    hubspot-search.ts     # Targeted search — only fetches broken records
    hubspot-write.ts      # applyPatch(), applyBatch() for write-back
    registry.ts           # Agent registry
    routing.ts            # Keyword router (zero tokens)
    synthesis.ts          # Le Directeur synthesis prompts + run history
  examples/
    le-custom-agent/      # Minimal example to fork
  setup.js                # Interactive setup wizard
```

---

## Design Principles

1. **Shadow mode by default** — read-only until write-back is explicitly enabled. Never modifies your CRM without permission.
2. **Bring your own keys** — your Anthropic API key, your CRM credentials. Revtown pays $0 in AI costs on your behalf.
3. **Targeted fetching** — agents search for broken records directly. Clean records are never fetched.
4. **CLAUDE.md per agent** — every agent's logic is documented and forkable. Copy it into Claude to use the logic without running any code.
5. **Le Retrait** — an agent that cannot complete its work exits immediately with a precise reason. No spinning, no silent failures.
6. **Open source = trust** — read the code. Everything Revtown accesses and stores is auditable.

---

## Environment Variables

```bash
HUBSPOT_TOKEN=        # HubSpot private app token (CRM scope)
ANTHROPIC_API_KEY=    # Anthropic API key
SLACK_WEBHOOK_URL=    # Slack incoming webhook (optional)
```

Run `npx revtown setup` to configure these interactively.

---

## Contributing

New agents are the highest-leverage contribution. If you've worked in RevOps and know what broken looks like in a specific domain — BDR follow-up, forecast accuracy, territory coverage — that knowledge belongs in an agent.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the agent spec and contribution guide.

---

## License

[MIT](LICENSE) — fork it, extend it, build on it.

Built by a Sales Ops practitioner who spent three years watching deals slip because the CRM was wrong.

**[revtown.io](https://revtown.io) · [app.revtown.io](https://app.revtown.io) · [@LeRevOps](https://github.com/LeRevOps)**
