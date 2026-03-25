# LeClaw — Claude Code Context File

Read this at the start of every session. This is the single source of truth for where the project stands.

---

## What LeClaw Is

**LeClaw is a RevOps team that runs 24/7 and never misses a QBR.**

Not a tool that helps your RevOps team. A system that automates the entire operational layer of revenue operations — the 60% of RevOps work that is repeatable, processable, and should never require a human to do manually.

Every agent encodes what "broken" looks like in a specific RevOps domain. Two agents is a proof of concept. Ten agents is a RevOps team. The value compounds with every agent shipped or contributed.

**The central mission: build the agent library until LeClaw covers the full revenue motion.**

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
Write-back / fixing       → Le Témoin          📋
```

Every feature decision, every architecture choice, every session should move toward this. If it doesn't add agents, enable the community to add agents, or make existing agents run better — deprioritize it.

**The community flywheel:** LeClaw's moat is encoded domain knowledge from RevOps practitioners. The framework makes it easy to contribute an agent (a list of filterGroups checks + a summary prompt). A BDR manager knows what SLA failure looks like. A CSM knows renewal risk. They don't need to be engineers — they need a simple enough pattern to contribute their knowledge. Every new agent from the community is institutional RevOps knowledge that runs in hundreds of CRMs.

**Positioning:** "Native agents are features inside a single product. LeClaw is a RevOps team across your entire GTM stack."

**ICP:** Any B2B company with a sales team and a CRM. Primary: Head of RevOps / VP Sales Ops at Series B–C SaaS, $10–50M ARR. Secondary: pre-RevOps-hire companies ($149/mo vs $180k/yr for a RevOps hire).

**Live at:** https://leclaw.io
**Dashboard:** https://app.leclaw.io (leclaw-app repo)
**npm:** `@leclaw/core` (current version: 0.3.5)
**GitHub:** https://github.com/LeRevOps/leclaw
**Stack:** Node.js, TypeScript, Claude API, HubSpot API, Slack API, Vercel, Supabase

---

## Two Repos — Know Which One You're In

| Repo | Path | Purpose |
|------|------|---------|
| `leclaw` | `C:\Users\Benjamin\leclaw` | Open source framework + CLI (`@leclaw/core` on npm) |
| `leclaw-app` | `C:\Users\Benjamin\leclaw-app` | Hosted SaaS dashboard (app.leclaw.io) — Next.js + Supabase |

**This CLAUDE.md is for the `leclaw` repo (open source framework).**
The `leclaw-app` repo has its own CLAUDE.md.

---

## Current State — `leclaw` (Open Source Framework)

### What's Built
- ✅ Landing page (`index.html`) — deployed to leclaw.io via Vercel
- ✅ `@leclaw/core` v0.3.4 — published to npm
- ✅ Le Data Quality agent (`agents/le-data-quality/`)
- ✅ Le Stage Audit agent (`agents/le-stage-audit/`)
- ✅ Le Directeur CLI (`npx leclaw`) — interactive REPL
- ✅ Setup wizard (`npx leclaw setup`) — opens browser, verifies connections, writes .env, launches CLI

### What Does NOT Exist Here
- ❌ Dashboard — that's in `leclaw-app`
- ❌ Write-back / Le Témoin
- ❌ Le Plumber, Le Lead Router, Le Forecast (next agents for this repo)

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
  └── core/base.ts             — runAgent(), types, scoring, callClaude()
  └── core/hubspot-search.ts   — paginated targeted search (never full scans)
  └── core/hubspot-properties.ts — dynamic custom property discovery
  └── core/registry.ts         — agent registry
  └── core/routing.ts          — keyword router
  └── core/synthesis.ts        — Le Directeur synthesis prompts
```

---

## Agent Roadmap

The agent library is the product. Ship agents relentlessly. Every agent added moves LeClaw from "tool" toward "autonomous RevOps team."

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

**10 agents = a RevOps team. That is the goal.**

---

## Important Technical Notes

- **Env var is `HUBSPOT_TOKEN`** — not `HUBSPOT_API_TOKEN`. Fixed Mar 2026.
- **Never full-scan the CRM** — all HubSpot fetches use search API with filterGroups.
- **Model cascade:** Haiku per agent → Sonnet once for synthesis.
- **`setup.js` is plain JS** — not compiled by tsc. Edit directly.
- **bin entry must not have `./` prefix** — `"leclaw": "cli/index.js"` not `"./cli/index.js"`.
- **npm publish must run from `C:\Users\Benjamin\leclaw`** — not a parent directory.

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
  core/                 # Framework internals
  examples/             # Custom agent template
  setup.js              # Setup wizard (plain JS)
  index.html            # Landing page (leclaw.io)
  package.json          # @leclaw/core v0.3.4
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
- Openprise/Syncari (enterprise, $50k+/yr)
- LeanData (routing only)
- LangChain Deep Agents (GTM reference impl, open-sourced March 2026) ← emerging threat

**Core insight:** RevOps teams fear being blindsided in front of the CRO. LeClaw catches problems before they become someone else's problem. The moat is not the framework — it is the encoded domain knowledge in the agents. Anyone can build a framework. Only practitioners who lived the pain know what broken looks like across the full revenue motion.

**Every session should move toward the agent library goal. If a decision doesn't add agents, enable others to add agents, or make agents run better — it is a lower priority.**

---

## Benjamin's Background
- Senior Sales Ops Analyst at Docker (Aug 2025-present)
- 3 years GTM/RevOps — lived the pain LeClaw solves
- Strong Salesforce admin (CPQ, lead routing, territory, ARR)
- Python/SQL background
- Targeting GTM Engineer roles ($175k+)
- LeClaw: portfolio project + potential product

---

## Session Startup Checklist
1. Read this file
2. Check memory: `~/.claude/projects/C--Users-Benjamin-leclaw/memory/`
3. Run `git log --oneline -10`
4. Ask Benjamin what he wants to build today
