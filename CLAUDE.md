# LeClaw — Claude Code Context File

Read this at the start of every session. This is the single source of truth for where the project stands.

---

## What LeClaw Is

**LeClaw is the open-source GTM agent hub.**

A canonical, growing collection of RevOps agents — community-built, CRM-native, deployable against HubSpot or Salesforce in two minutes. Think OpenClaw for CRMs and RevOps.

**Three things, working together:**

1. **The hub** — the agent library. Every agent encodes what "broken" looks like in a specific RevOps domain. Anyone can deploy any agent. Anyone can contribute one.
2. **The framework** (`@leclaw/core`) — the open-source runtime. Defines how agents are structured, how they query the CRM, how they score and report. MIT licensed.
3. **Le Directeur** — the orchestrator. Deploys agents, synthesizes their output into a single answer. Works identically on CLI and dashboard — same logic, different runtime targets.

**Deploy path 1 — CLI:** `npx leclaw` → Le Directeur REPL → pick agents → runs against your CRM → synthesized answer in terminal.

**Deploy path 2 — Dashboard:** app.leclaw.io → connect HubSpot or Salesforce → click Run → agents run on Vercel → synthesized answer + Slack delivery + write-back queue (Le Témoin).

Same agents. Same synthesis. Two surfaces.

**The hub is the product. Le Directeur is the orchestrator. The framework is the glue.**

```
Data quality audits       → Le Data Quality    ✅
Pipeline reviews          → Le Stage Audit     ✅
BDR follow-up enforcement → Le BDR             🔜
Forecast integrity        → Le Forecast        🔜
Lead routing QA           → Le Plumber         📋
Territory coverage        → Le Territory       📋
Renewal risk              → Le Renewal         📋
Commission accuracy       → Le Commission      📋
QBR prep                  → Le QBR             📋
Write-back / fixing       → Le Témoin          ✅ (app layer)
Activities hygiene        → Le Activities      📋
Duplicate resolution      → Le Duplicates      📋
Deal desk hygiene         → Le Deal Desk       📋
```

Every feature decision, every architecture choice, every session should move toward this. If it doesn't add agents, enable the community to add agents, or make Le Directeur smarter — deprioritize it.

**The community flywheel:** A BDR manager knows what SLA failure looks like. A CSM knows renewal risk. The framework makes it easy to contribute an agent (filterGroups checks + a summary prompt) — no engineering background required. Every contributed agent is institutional RevOps knowledge that runs in hundreds of CRMs.

**Positioning:** "Native agents are features inside a single product. LeClaw is the open-source GTM agent hub — agents for every domain, deployable against any CRM, from CLI or dashboard."

**ICP:** Any B2B company with a sales team and a CRM. Primary: Head of RevOps / VP Sales Ops at Series B–C SaaS, $10–50M ARR. Secondary: GTM engineers who want to encode their own domain knowledge and contribute to the hub.

**Open source and forkable by design.** Framework is MIT licensed. Clone it, run it against your own CRM, fork it, contribute agents back. The open source repo is the top of funnel. The hosted dashboard is the monetization layer.

**Live at:** https://leclaw.io
**Dashboard:** https://app.leclaw.io (leclaw-app repo)
**npm:** `@leclaw/core` (current version: 0.3.6)
**GitHub:** https://github.com/LeRevOps/leclaw
**Stack:** Node.js, TypeScript, Claude API, HubSpot API, Salesforce API, Slack API, Vercel, Supabase

---

## Two Repos — Two Surfaces, One Framework

| Repo | Path | Purpose | Users |
|------|------|---------|-------|
| `leclaw` | `C:\Users\Benjamin\leclaw` | Open source framework + CLI (`@leclaw/core` on npm) | GTM engineers, developers, contributors |
| `leclaw-app` | `C:\Users\Benjamin\leclaw-app` | Hosted SaaS dashboard (app.leclaw.io) — Next.js + Supabase | RevOps managers, non-technical users |

**This CLAUDE.md is for the `leclaw` repo (open source framework).**
The `leclaw-app` repo has its own CLAUDE.md.

### Why two repos

The same `@leclaw/core` framework powers both. The split is intentional — open core business model, same as Supabase, PostHog, Metabase.

- **`leclaw` (public, MIT)** — anyone can clone, fork, run agents against their own CRM, contribute new agents. Community and top of funnel. No terminal skills required for basic use (`npx leclaw`).
- **`leclaw-app` (private)** — the hosted product. Supabase auth, billing, multi-tenancy, dashboard UI, Le Témoin write-back queue. Contains secrets and business logic. Never public.

### Execution architecture — two surfaces, one framework

```
CLI (open source)                              DASHBOARD (hosted)
─────────────────────────────────              ────────────────────────────────────────
npx leclaw                                     app.leclaw.io
  └── Le Directeur REPL                          └── Ask Le Directeur / Run Mission
        └── routeQuestion()                            └── Next.js API route (Vercel)
        └── Docker available?                                └── runAgentForOrg()
              YES → runAgentInDocker()                             └── runAgent() ← @leclaw/core
                     └── docker run --rm                                └── HubSpot / SFDC API
                           └── agent-runner.js                    └── onIssue() → Supabase
                                 └── runAgent() ← @leclaw/core    └── Slack delivery
              NO  → runAgent() ← @leclaw/core                     └── Le Témoin write-back queue

Le Directeur synthesis — IDENTICAL on both surfaces:
  Haiku per agent (summary) → Sonnet once (synthesis) → answer
```

**Le Directeur is CRM-agnostic.** It dispatches agents, collects rapports, synthesizes. Whether the underlying agent talks to HubSpot or Salesforce is an implementation detail the orchestrator doesn't care about.

**Docker is CLI-only.** Vercel serverless cannot run containers. Dashboard users only run LeClaw's vetted agents — Vercel's ephemeral isolation is sufficient. Docker matters for developers running custom/third-party agents. Resource-limited to 512MB RAM, 0.5 CPU, removed on exit. Falls back to in-process if Docker unavailable.

---

## Current State — `leclaw` (Open Source Framework)

### What's Built
- ✅ Landing page (`index.html`) — deployed to leclaw.io via Vercel
- ✅ `@leclaw/core` v0.3.6 — published to npm
- ✅ Le Data Quality agent (`agents/le-data-quality/`)
- ✅ Le Stage Audit agent (`agents/le-stage-audit/`)
- ✅ Le Directeur CLI (`npx leclaw`) — interactive REPL, synthesizes across agents
- ✅ Setup wizard (`npx leclaw setup`) — opens browser, verifies connections, writes .env, launches CLI
- ✅ Run history + trend awareness — synthesis includes 4-week score trajectory
- ✅ Write-back types — `WritebackPatch`, `applyPatch()`, `applyBatch()` in core

### What Does NOT Exist Here
- ❌ Dashboard — that's in `leclaw-app`
- ❌ Le Témoin UI — that's in `leclaw-app`
- ❌ Salesforce adapter — not yet built in core
- ❌ Le BDR, Le Forecast, Le Plumber (next agents for this repo)

---

## Architecture — `leclaw` (Open Source)

```
npx leclaw
  └── cli/index.ts (Le Directeur)
        └── keyword router → selects agents
        └── runAgent() × N → Haiku summary per agent
        └── callClaude(Sonnet) → single synthesis answer

npx leclaw setup
  └── setup.js
        └── opens HubSpot/Anthropic/Slack in browser
        └── verifies each connection
        └── writes .env → launches CLI

@leclaw/core (npm)
  └── core/base.ts              — runAgent(), types, scoring, callClaude(), WritebackPatch
  └── core/hubspot-search.ts    — paginated targeted search (never full scans)
  └── core/hubspot-write.ts     — applyPatch(), applyBatch() for write-back
  └── core/hubspot-properties.ts — dynamic custom property discovery
  └── core/registry.ts          — agent registry
  └── core/routing.ts           — keyword router
  └── core/synthesis.ts         — Le Directeur synthesis prompts + run history/trends
```

---

## Agent Roadmap

The agent library is the product. Ship agents relentlessly.

| Priority | Agent | Domain | Status |
|----------|-------|--------|--------|
| ✅ | Le Data Quality | Field completeness, relationship hygiene | Built |
| ✅ | Le Stage Audit | Deal velocity, pipeline health | Built |
| 🔜 | Le BDR | Follow-up SLA, unworked MQLs, bounce hygiene | Next |
| 🔜 | Le Forecast | Commit accuracy, coverage ratio, at-risk deals | Next |
| 📋 | Le Plumber | Routing gaps, unassigned leads, round robin health | Planned |
| 📋 | Le Renewal | Renewal risk, upcoming dates, health signals | Planned |
| 📋 | Le Territory | Coverage gaps, alignment, rep assignment | Planned |
| 📋 | Le Commission | Accuracy, dispute prevention, quota hygiene | Planned |
| 📋 | Le QBR | Automated QBR prep, trend analysis | Planned |
| 📋 | Le Duplicates | Identity resolution, merge candidates | Planned |
| 📋 | Le Activities | Meeting/call logging gaps, engagement hygiene | Planned |
| 📋 | Le Deal Desk | Discount hygiene, deal structure, approvals | Planned |

**12 agents = a full RevOps team. That is the goal.**

---

## Important Technical Notes

- **Env var is `HUBSPOT_TOKEN`** — not `HUBSPOT_API_TOKEN`. Fixed Mar 2026.
- **Never full-scan the CRM** — all HubSpot fetches use search API with filterGroups.
- **Model cascade:** Haiku per agent → Sonnet once for synthesis.
- **`setup.js` is plain JS** — not compiled by tsc. Edit directly.
- **bin entry must not have `./` prefix** — `"leclaw": "cli/index.js"` not `"./cli/index.js"`.
- **npm publish must run from `C:\Users\Benjamin\leclaw`** — not a parent directory.
- **Le Directeur synthesis is shared logic** — core exports `buildSynthesisPrompt()`. Both CLI and app import it. Never duplicate it.

## Environment Variables
```
HUBSPOT_TOKEN=         # HubSpot private app token (CRM scope)
ANTHROPIC_API_KEY=     # Anthropic API key
SLACK_WEBHOOK_URL=     # Slack incoming webhook URL (optional)
```

## Commands
```
npx leclaw                      # Launch Le Directeur CLI
npx leclaw setup                # First-time setup wizard
npm run build                   # Compile TypeScript
npm publish --access public     # Publish to npm (requires OTP browser auth)
```

## File Structure
```
leclaw/
  agents/
    le-data-quality/    # Le Data Quality agent (TypeScript)
    le-stage-audit/     # Le Stage Audit agent (TypeScript)
  cli/index.ts          # Le Directeur REPL
  core/                 # Framework internals (@leclaw/core)
  examples/             # Custom agent template
  setup.js              # Setup wizard (plain JS)
  index.html            # Landing page (leclaw.io)
  package.json          # @leclaw/core v0.3.6
```

---

## Business Context

**ICP:** Head of RevOps or VP Sales Ops at Series B B2B SaaS, $5-50M ARR, 50-300 employees.

**Pricing:**
- Free: 5,000 records, shadow mode only, 1 CRM
- Growth: $149/mo — 50k records, write-back, 1 CRM
- Scale: $499/mo — unlimited, multi-CRM, team access
- Enterprise: Custom

**Business model:** Open core. Framework is MIT. Hosted product is freemium SaaS.

**Competitors:**
- n8n (open source, requires engineers)
- Momentum/Attention (reactive, not proactive)
- Cargo (YC S23, GTM workflow builder — execution not monitoring, different angle)
- Openprise/Syncari (enterprise, $50k+/yr)
- LeanData (routing only)
- LangChain Deep Agents (GTM reference impl, open-sourced March 2026) ← emerging threat

**Core insight:** RevOps teams fear being blindsided in front of the CRO. LeClaw catches problems before they become someone else's problem. The moat is not the framework — it is the encoded domain knowledge in the agents. Anyone can build a framework. Only practitioners who lived the pain know what broken looks like across the full revenue motion.

**Every session should move toward the agent library goal. If a decision doesn't add agents, enable others to add agents, or make Le Directeur smarter — it is a lower priority.**

---

## Benjamin's Background
- Senior Sales Ops Analyst at Docker (Aug 2025-present)
- 3 years GTM/RevOps — lived the pain LeClaw solves
- Strong Salesforce admin (CPQ, lead routing, territory, ARR)
- Python/SQL background
- Targeting GTM Engineer roles ($175k+)
- LeClaw: portfolio project + potential product

---

## Major Decisions (March 2026)

These are architectural and strategic decisions made in prior sessions. Do not relitigate them.

### Hub positioning (March 2026)
LeClaw is not a CRM audit tool or a RevOps automation platform. It is the open-source GTM agent hub — the canonical place where RevOps practitioners encode domain knowledge as agents. Le Directeur is the orchestrator that deploys any hub agent. This positions LeClaw like OpenClaw for CRMs/RevOps: the value compounds with every agent contributed.

### Le Directeur works on both surfaces (March 2026)
The synthesis logic (`buildSynthesisPrompt`, run history, trend awareness) lives in `@leclaw/core` and is shared. CLI and dashboard both import it. The difference is only runtime: CLI uses Docker or in-process; dashboard uses Vercel serverless. The orchestration and synthesis output are identical.

### Docker for CLI (not dashboard)
Added Docker container isolation to the CLI in v0.3.5. Each agent runs in its own container (`leclaw/runner:0.3.6`) — 512MB RAM, 0.5 CPU, removed on exit, no host filesystem access. Credentials passed as env vars. Falls back to in-process if Docker unavailable.

**Why CLI only:** Vercel serverless can't run containers. Dashboard users only run LeClaw's vetted agents — Vercel's ephemeral isolation is sufficient. Docker matters for developers running custom/third-party agents. Benjamin works at Docker — this is deliberate product alignment.

### Open core split
`leclaw` is public MIT. `leclaw-app` is private. Same `@leclaw/core` framework powers both. `lib/agents/runner.ts` (75 lines) is the only app-layer addition — Supabase persistence wrapper around core's `runAgent()`.

### Async execution (March 2026)
Dashboard API routes return `{ run_id }` immediately. Agent runs in background via Next.js `after()`. Client polls `/api/runs/[runId]` every 2s. `maxDuration` raised to 300s.

---

## Session Startup Checklist
1. Read this file
2. Check memory: `~/.claude/projects/C--Users-Benjamin-leclaw/memory/`
3. Run `git log --oneline -10`
4. Ask Benjamin what he wants to build today
