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
export {};
