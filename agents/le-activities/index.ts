/**
 * LeClaw — Le Activities Agent
 *
 * Monitors deal activity and rep engagement. Catches deals that reps
 * haven't touched, tasks that were never created, and high-value
 * opportunities going dark before anyone notices.
 *
 * Inspired by: Post 3 (Vector RevOps) — "Deal hygiene alerts when
 * reps haven't updated in too long."
 *
 * Salesforce equivalents documented on each check.
 */

import type { AgentDefinition, AgentCheck, OrgConfig } from "../../core/base.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function buildChecks(cfg: OrgConfig): AgentCheck[] {
  const stuckMs      = cfg.avg_sales_cycle_days * 0.2 * DAY_MS; // 20% of sales cycle = stale
  const highValue    = cfg.high_value_deal_threshold;

  return [

    // ── Rep hasn't touched the deal ──────────────────────────────────────────

    {
      id: "deal_no_activity_30d",
      label: "Open deals with no activity in 30+ days",
      objectType: "deals",
      filterGroups: () => [
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            {
              propertyName: "notes_last_activity",
              operator: "LT",
              value: String(Date.now() - 30 * DAY_MS),
            },
          ],
        },
        // Also catch deals that never had any activity
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            { propertyName: "notes_last_activity", operator: "NOT_HAS_PROPERTY" },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate", "notes_last_activity"],
      severity: "warning",
      fix: "Log a call, email, or note — no activity in 30 days means this deal is at risk",
      nextAction: "Rep should log last known status and set a follow-up task. Manager should review in next pipeline call.",
      getName: (r) => r.properties.dealname || r.id,
      escalateIf: {
        description: "high-value deal going dark",
        filterGroups: () => [
          {
            filters: [
              { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
              { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
              { propertyName: "amount", operator: "GT", value: String(highValue) },
              {
                propertyName: "notes_last_activity",
                operator: "LT",
                value: String(Date.now() - 30 * DAY_MS),
              },
            ],
          },
        ],
        escalatedSeverity: "critical",
      },
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND (LastActivityDate = null OR LastActivityDate < :thirtyDaysAgo)`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate", "LastActivityDate"],
      },
    },

    // ── Deals closing this month with no recent activity ─────────────────────

    {
      id: "deal_closing_soon_no_activity",
      label: "Deals closing this month with no activity in 7 days",
      objectType: "deals",
      filterGroups: () => {
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        return [
          {
            filters: [
              { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
              { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
              { propertyName: "closedate", operator: "LT", value: String(endOfMonth.getTime()) },
              { propertyName: "closedate", operator: "GT", value: String(Date.now()) },
              {
                propertyName: "notes_last_activity",
                operator: "LT",
                value: String(Date.now() - 7 * DAY_MS),
              },
            ],
          },
        ];
      },
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate", "notes_last_activity"],
      severity: "critical",
      fix: "This deal closes this month but nobody has touched it in a week — needs immediate attention",
      nextAction: "Rep should re-engage today. If deal is at risk, flag for manager assistance before end of month.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND CloseDate <= :endOfMonth AND CloseDate >= TODAY AND (LastActivityDate = null OR LastActivityDate < :sevenDaysAgo)`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate", "LastActivityDate"],
      },
    },

    // ── Open deals with no next step task ────────────────────────────────────

    {
      id: "deal_no_next_step",
      label: "Open deals with no next step recorded",
      objectType: "deals",
      filterGroups: [
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            { propertyName: "hs_next_step", operator: "NOT_HAS_PROPERTY" },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate"],
      severity: "warning",
      fix: "Add a next step — deals without a clear next action stall",
      nextAction: "Rep should define the next buyer action and log it in the Next Step field.",
      getName: (r) => r.properties.dealname || r.id,
      escalateIf: {
        description: "late-stage deal with no next step",
        filterGroups: [
          {
            filters: [
              { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
              { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
              { propertyName: "hs_next_step", operator: "NOT_HAS_PROPERTY" },
              { propertyName: "amount", operator: "GT", value: "0" },
            ],
          },
        ],
        escalatedSeverity: "critical",
      },
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND NextStep = null`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate", "NextStep"],
      },
    },

    // ── Deals stuck in stage longer than sales cycle ─────────────────────────

    {
      id: "deal_stuck_in_stage",
      label: `Deals stuck in stage for ${Math.round(stuckMs / DAY_MS)}+ days`,
      objectType: "deals",
      filterGroups: () => [
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            {
              propertyName: "hs_lastmodifieddate",
              operator: "LT",
              value: String(Date.now() - stuckMs),
            },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate", "hs_lastmodifieddate"],
      severity: "warning",
      fix: "Deal hasn't moved — review with rep to determine if it should advance, stall, or be closed lost",
      nextAction: "Manager should ask rep for an honest assessment. If no path forward, close lost to keep pipeline clean.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND LastModifiedDate < :thresholdDate`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate", "LastModifiedDate"],
      },
    },

    // ── High value deals missing owner ───────────────────────────────────────

    {
      id: "deal_high_value_no_owner",
      label: "High-value deals with no owner",
      objectType: "deals",
      filterGroups: [
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            { propertyName: "hubspot_owner_id", operator: "NOT_HAS_PROPERTY" },
            { propertyName: "amount", operator: "GT", value: String(highValue) },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "closedate"],
      severity: "critical",
      fix: "Assign this deal immediately — high-value opportunities without an owner are invisible to the team",
      nextAction: "RevOps should assign to the correct AE and notify their manager.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND OwnerId = null AND Amount > :highValue`,
        fields: ["Id", "Name", "Amount", "StageName", "CloseDate"],
      },
    },

  ];
}

export const leActivities: AgentDefinition = {
  name: "le-activities",
  checks: [],
  buildChecks,

  summaryPrompt: (results) => {
    const lines = results
      .filter((r) => r.count > 0)
      .map(
        (r) =>
          `- ${r.check.label}: ${r.count} deals${
            r.escalatedCount > 0 ? ` (${r.escalatedCount} escalated)` : ""
          }`
      )
      .join("\n");

    return `You are Le Activities, a RevOps agent that monitors deal engagement and rep accountability.
Summarize these activity gaps in 2-3 sentences.
Focus on revenue risk — dark deals and missing next steps are forecast liabilities.
Be direct. No bullet points.

Issues found:
${lines || "No issues found."}`;
  },
};
