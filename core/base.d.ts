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
import { HubSpotFilterGroup, HubSpotRecord } from "./hubspot-search.js";
export type { HubSpotRecord, HubSpotFilterGroup };
export interface Issue {
    objectType: string;
    objectId: string;
    objectName: string;
    severity: "critical" | "warning" | "info";
    issueType: string;
    fixSuggestion: string;
    /** Specific next action for the rep or RevOps team — more actionable than fixSuggestion */
    nextAction?: string;
}
export interface CheckResult {
    check: AgentCheck;
    count: number;
    escalatedCount: number;
    samples: Array<{
        id: string;
        name: string;
    }>;
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
    /** Specific next action — more prescriptive than fix, used in deal review briefings */
    nextAction?: string;
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
    /**
     * Salesforce equivalent of this check.
     * Not executed until the Salesforce adapter ships — serves as the
     * portable spec so agents are CRM-agnostic by design.
     */
    salesforce?: {
        /** Salesforce object API name: "Lead" | "Contact" | "Opportunity" | "Account" */
        objectType: string;
        /** SOQL WHERE clause (no leading WHERE) */
        soql: string;
        /** Salesforce field API names to fetch */
        fields: string[];
    };
}
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
export declare function runAgent(agent: AgentDefinition, options: RunOptions): Promise<Rapport>;
export declare function calculateScore(results: CheckResult[]): number;
export declare function callClaude(prompt: string, apiKey: string, options?: {
    maxTokens?: number;
    model?: string;
}): Promise<string | null>;
