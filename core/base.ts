/**
 * @leclaw/core — Agent base
 *
 * The framework every LeClaw agent is built on.
 *
 * Architecture:
 *   Le Directeur  — orchestrates missions, dispatches agents, reads rapports
 *   les agents    — specialist workers, each owns one CRM domain
 *   Le Témoin     — validates proposed changes before write-back
 *   une mission   — a coordinated run dispatched by Le Directeur
 *   un rapport    — structured result filed by each agent after a run
 *   Le Retrait    — an agent that cannot complete its work withdraws cleanly
 *
 * Four principles baked into every agent:
 *
 * 1. TARGETED FETCHING   — only broken records are ever fetched
 * 2. RELATIONSHIP AWARENESS — association filters + escalation from CRM context
 * 3. DYNAMIC DISCOVERY   — auto-discover custom properties at runtime
 * 4. WRITE-BACK READY    — every broken record ID is captured, ready for fixes
 */

import { searchHubSpot, HubSpotFilterGroup, HubSpotRecord } from "./hubspot-search.js";

export type { HubSpotRecord, HubSpotFilterGroup };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Issue {
  objectType: string;
  objectId: string;
  objectName: string;
  severity: "critical" | "warning" | "info";
  issueType: string;
  fixSuggestion: string;
}

export interface CheckResult {
  check: AgentCheck;
  count: number;
  escalatedCount: number;
  samples: Array<{ id: string; name: string }>; // max 20, for AI context only
}

export interface Rapport {
  agentName: string;
  score: number;
  totalIssues: number;
  checks: Array<{
    id: string;
    label: string;
    severity: string;
    count: number;
    escalatedCount: number;
    writebackAvailable: boolean;
    writebackRequiresApproval: boolean;
  }>;
  summary: string;
}

// ── Check definition ───────────────────────────────────────────────────────────

export interface AgentCheck {
  /** Unique identifier for this check, e.g. "missing_email" */
  id: string;

  /** Human-readable label, e.g. "Contacts missing email" */
  label: string;

  /** HubSpot object type: "contacts" | "companies" | "deals" | "tickets" */
  objectType: string;

  /**
   * What makes a record "broken". HubSpot search filterGroups format:
   * outer array = OR, inner filters = AND.
   *
   * Use a function for time-based checks so timestamps are computed fresh each run:
   * @example
   * filterGroups: () => [{
   *   filters: [{
   *     propertyName: "hs_lastmodifieddate",
   *     operator: "LT",
   *     value: String(Date.now() - 30 * 24 * 60 * 60 * 1000)
   *   }]
   * }]
   */
  filterGroups: HubSpotFilterGroup[] | (() => HubSpotFilterGroup[]);

  /** Properties to fetch for each broken record */
  properties: string[];

  severity: "critical" | "warning" | "info";

  /** Plain-language fix instruction shown to the user */
  fix: string;

  /** Returns a display name for a broken record */
  getName: (record: HubSpotRecord) => string;

  /**
   * Context severity escalation.
   * Runs a second targeted search for broken records that ALSO match additional
   * context (e.g., contact missing email AND has an open deal → critical).
   */
  escalateIf?: {
    description: string;
    filterGroups: HubSpotFilterGroup[] | (() => HubSpotFilterGroup[]);
    escalatedSeverity: "critical" | "warning";
  };

  /**
   * Write-back stub — describes how this issue would be auto-fixed.
   * Actual execution requires Le Témoin approval (paid tier).
   */
  writeback?: {
    description: string;
    requiresApproval: boolean;
    automated: boolean;
  };
}

// ── Org config ─────────────────────────────────────────────────────────────────

/**
 * Per-org business context that replaces hardcoded thresholds.
 * Pass via RunOptions.orgConfig to have agents use org-specific values
 * (e.g., avg_sales_cycle_days) instead of defaults.
 *
 * In the hosted dashboard, this is loaded from the org's settings.
 * In the CLI, it can be omitted — agents fall back to sensible defaults.
 */
export interface OrgConfig {
  avg_sales_cycle_days: number;
  high_value_deal_threshold: number;
  bdr_followup_sla_hours: number;
  late_stage_names: string[];
  required_contact_fields: string[];
}

// ── Agent definition ───────────────────────────────────────────────────────────

export interface AgentDefinition {
  name: string;
  checks: AgentCheck[];

  /**
   * Optional: generate config-driven checks using the org's business context.
   * When provided and orgConfig is passed to runAgent(), these checks are used
   * instead of the static checks array — enabling per-org thresholds.
   *
   * @example
   * buildChecks: (cfg) => [{
   *   id: "deal_stuck",
   *   filterGroups: () => [{ filters: [{
   *     propertyName: "hs_lastmodifieddate",
   *     operator: "LT",
   *     value: String(Date.now() - cfg.avg_sales_cycle_days * 86400000)
   *   }]}]
   * }]
   */
  buildChecks?: (orgConfig: OrgConfig) => AgentCheck[];

  /**
   * Optionally return additional checks discovered at runtime from the org's HubSpot.
   * Use buildDynamicChecks() from hubspot-properties.ts here.
   */
  discoverChecks?: (token: string) => Promise<AgentCheck[]>;

  /** Returns the prompt Claude uses to generate the AI summary */
  summaryPrompt: (results: CheckResult[]) => string;
}

// ── Runner ─────────────────────────────────────────────────────────────────────

export interface RunOptions {
  hubspotToken: string;

  /** Anthropic API key. If omitted, AI summary is skipped. */
  anthropicKey?: string;

  /**
   * Org-specific business context. When provided, agents will use buildChecks()
   * with these thresholds instead of their default static checks.
   */
  orgConfig?: OrgConfig;

  /**
   * Called for each broken record found.
   * Use this to stream to a database, write to a file, post to Slack, etc.
   * Safe to await — the runner waits for each call to complete.
   */
  onIssue?: (issue: Issue) => Promise<void> | void;
}

export async function runAgent(
  agent: AgentDefinition,
  options: RunOptions
): Promise<Rapport> {
  const { hubspotToken, anthropicKey, onIssue, orgConfig } = options;

  // Use config-driven checks if the agent supports them and orgConfig is provided
  const baseChecks = agent.buildChecks && orgConfig
    ? agent.buildChecks(orgConfig)
    : agent.checks;
  const dynamicChecks = agent.discoverChecks
    ? await agent.discoverChecks(hubspotToken)
    : [];
  const allChecks = [...baseChecks, ...dynamicChecks];

  const results: CheckResult[] = [];

  for (const check of allChecks) {
    let count = 0;
    let escalatedCount = 0;
    const samples: Array<{ id: string; name: string }> = [];

    // Fetch only broken records — never full scans
    await searchHubSpot(
      hubspotToken,
      check.objectType,
      resolveFilterGroups(check.filterGroups),
      check.properties,
      async (records) => {
        for (const record of records) {
          count++;
          const name = check.getName(record);
          if (samples.length < 20) samples.push({ id: record.id, name });

          if (onIssue) {
            await onIssue({
              objectType: check.objectType,
              objectId: record.id,
              objectName: name,
              severity: check.severity,
              issueType: check.id,
              fixSuggestion: check.fix,
            });
          }
        }
      }
    );

    // Context escalation — single fetch to both count and emit issues
    if (check.escalateIf && count > 0) {
      await searchHubSpot(
        hubspotToken,
        check.objectType,
        resolveFilterGroups(check.escalateIf.filterGroups),
        check.properties,
        async (records) => {
          escalatedCount += records.length;
          if (onIssue) {
            for (const record of records) {
              await onIssue({
                objectType: check.objectType,
                objectId: record.id,
                objectName: check.getName(record),
                severity: check.escalateIf!.escalatedSeverity,
                issueType: `${check.id}_escalated`,
                fixSuggestion: `URGENT — ${check.fix} (${check.escalateIf!.description})`,
              });
            }
          }
        }
      );
    }

    results.push({ check, count, escalatedCount, samples });
  }

  const totalIssues = results.reduce((sum, r) => sum + r.count, 0);
  const score = calculateScore(results);

  const summary = anthropicKey
    ? (await callClaude(agent.summaryPrompt(results), anthropicKey)) ??
      `Mission complete. ${totalIssues} issues found. Score: ${score}/100.`
    : `Mission complete. ${totalIssues} issues found. Score: ${score}/100.`;

  return {
    agentName: agent.name,
    score,
    totalIssues,
    checks: results.map((r) => ({
      id: r.check.id,
      label: r.check.label,
      severity: r.check.severity,
      count: r.count,
      escalatedCount: r.escalatedCount,
      writebackAvailable: !!r.check.writeback,
      writebackRequiresApproval: r.check.writeback?.requiresApproval ?? true,
    })),
    summary,
  };
}

// ── Scoring ────────────────────────────────────────────────────────────────────

export function calculateScore(results: CheckResult[]): number {
  const weights = { critical: 10, warning: 3, info: 1 };
  const totalPenalty = results.reduce((sum, r) => {
    return sum +
      r.count * weights[r.check.severity] +
      r.escalatedCount * weights.critical;
  }, 0);
  return Math.max(0, Math.round(100 - Math.min(totalPenalty / 10, 100)));
}

// ── Claude helper ──────────────────────────────────────────────────────────────

function resolveFilterGroups(
  fg: HubSpotFilterGroup[] | (() => HubSpotFilterGroup[])
): HubSpotFilterGroup[] {
  return typeof fg === "function" ? fg() : fg;
}

export async function callClaude(
  prompt: string,
  apiKey: string,
  options: { maxTokens?: number; model?: string } = {}
): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "claude-haiku-4-5-20251001",
      max_tokens: options.maxTokens ?? 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.content[0].text as string;
}
