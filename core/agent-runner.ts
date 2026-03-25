#!/usr/bin/env node
/**
 * LeClaw — Agent Runner
 *
 * Runs a single agent and outputs the Rapport as JSON to stdout.
 * Designed to run inside a Docker container — credentials are injected
 * via environment variables by the host process.
 *
 * Usage: node core/agent-runner.js <agent-name>
 *
 * Environment:
 *   HUBSPOT_TOKEN       — HubSpot private app token (required)
 *   ANTHROPIC_API_KEY   — Anthropic API key (optional)
 */

import { agentRegistry } from "./registry.js";
import { runAgent } from "./base.js";

const agentName = process.argv[2];

if (!agentName) {
  process.stderr.write("Usage: node core/agent-runner.js <agent-name>\n");
  process.exit(1);
}

const agent = agentRegistry[agentName];

if (!agent) {
  const available = Object.keys(agentRegistry).join(", ");
  process.stderr.write(`Unknown agent: "${agentName}". Available: ${available}\n`);
  process.exit(1);
}

const hubspotToken = process.env.HUBSPOT_TOKEN;
const anthropicKey  = process.env.ANTHROPIC_API_KEY;

if (!hubspotToken) {
  process.stderr.write("HUBSPOT_TOKEN environment variable is required\n");
  process.exit(1);
}

try {
  const rapport = await runAgent(agent, { hubspotToken, anthropicKey });
  process.stdout.write(JSON.stringify(rapport) + "\n");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Agent failed: ${message}\n`);
  process.exit(1);
}
