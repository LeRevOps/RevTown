# 🦀 LeClaw

**Full Stack RevOps. Purposebuilt for your CRMs.**

> Native agents are features inside a single product. LeClaw is infrastructure across your entire GTM stack.

---

## What is LeClaw?

LeClaw is an open-source RevOps agent framework that automates the manual work that lives between your CRM and your revenue targets.

**Works with:** Salesforce · HubSpot · Slack

---

## Agents

| Agent | Status | Description |
|-------|--------|-------------|
| Le Data Quality | ✅ Live | Scans CRM for missing fields, duplicates, and stale records |
| Le Plumber | 🔜 Coming Soon | Monitors integration health across your GTM stack |
| Le Territory Expert | 📋 Roadmap | Detects misrouted accounts and coverage gaps |
| Le Deal Ops | 📋 Roadmap | Automates Deal Desk approval workflows |
| Le GTM Analytics | 📋 Roadmap | Funnel instrumentation and KPI monitoring |

---

## Quick Start

```bash
git clone https://github.com/LeRevOps/leclaw
cd leclaw
npm install
npm run setup
npm run data-quality
```

`npm run setup` walks you through connecting your CRM, Anthropic API, and Slack in under 3 minutes. All credentials are entered securely (masked input, never logged) and saved to a local `.env` file that never leaves your machine.

---

## Environment Variables

Set manually or via `npm run setup`:

```
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

> ⚠️ Never commit your `.env` file. It is gitignored by default.
> See [SECURITY.md](SECURITY.md) for details on what data LeClaw accesses and stores.

---

## Built On

- [Claude API](https://anthropic.com) — AI summaries and agent reasoning
- [HubSpot API](https://developers.hubspot.com) — CRM data
- [Slack Webhooks](https://api.slack.com) — Report delivery
- [Vercel](https://vercel.com) — Hosting

---

Built by a Sales Ops practitioner who spent too much time clicking around.

**[leclaw.io](https://leclaw.io) · [LinkedIn](https://www.linkedin.com/company/leclaw/)**
