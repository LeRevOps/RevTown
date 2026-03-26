/**
 * LeClaw — Le BDR Agent
 *
 * Enforces BDR follow-up SLAs, surfaces unworked MQLs, and flags
 * contacts that have fallen through the cracks of the top-of-funnel.
 *
 * Inspired by: practitioners who know that an MQL with no activity
 * for 48 hours is a lead that will never convert.
 *
 * Salesforce equivalents documented on each check — ready for the
 * Salesforce adapter.
 */

import type { AgentDefinition, AgentCheck, OrgConfig } from "../../core/base.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS  = 24 * HOUR_MS;

function buildChecks(cfg: OrgConfig): AgentCheck[] {
  const slaMs = cfg.bdr_followup_sla_hours * HOUR_MS;

  return [

    // ── MQL SLA enforcement ──────────────────────────────────────────────────

    {
      id: "mql_past_sla_no_activity",
      label: `MQLs with no activity in ${cfg.bdr_followup_sla_hours}+ hours`,
      objectType: "contacts",
      filterGroups: () => [
        // Never had any sales activity
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "marketingqualifiedlead" },
            { propertyName: "hs_last_sales_activity_timestamp", operator: "NOT_HAS_PROPERTY" },
          ],
        },
        // Had activity but outside SLA window
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "marketingqualifiedlead" },
            {
              propertyName: "hs_last_sales_activity_timestamp",
              operator: "LT",
              value: String(Date.now() - slaMs),
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email", "lifecyclestage", "hubspot_owner_id", "hs_last_sales_activity_timestamp"],
      severity: "critical",
      fix: `Work this MQL — SLA is ${cfg.bdr_followup_sla_hours} hours from lead assignment`,
      nextAction: "Assign to a BDR and log first outreach within the SLA window. If already assigned, escalate to BDR manager.",
      getName: (r) =>
        [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
        r.properties.email ||
        r.id,
      escalateIf: {
        description: "MQL has an open deal but BDR still hasn't followed up",
        filterGroups: () => [
          {
            filters: [
              { propertyName: "lifecyclestage", operator: "EQ", value: "marketingqualifiedlead" },
              { propertyName: "associations.deal", operator: "HAS_PROPERTY" },
              {
                propertyName: "hs_last_sales_activity_timestamp",
                operator: "LT",
                value: String(Date.now() - slaMs),
              },
            ],
          },
        ],
        escalatedSeverity: "critical",
      },
      salesforce: {
        objectType: "Lead",
        soql: `Status = 'MQL' AND (LastActivityDate = null OR LastActivityDate < :slaDate)`,
        fields: ["Id", "Name", "Email", "OwnerId", "LastActivityDate", "Status"],
      },
    },

    // ── Unowned MQLs ─────────────────────────────────────────────────────────

    {
      id: "mql_no_owner",
      label: "MQLs with no owner assigned",
      objectType: "contacts",
      filterGroups: [
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "marketingqualifiedlead" },
            { propertyName: "hubspot_owner_id", operator: "NOT_HAS_PROPERTY" },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email", "lifecyclestage", "createdate"],
      severity: "critical",
      fix: "Assign this MQL to a BDR — unowned leads convert at a fraction of the rate",
      nextAction: "Check routing rules. If routing failed, manually assign and flag the gap to RevOps.",
      getName: (r) =>
        [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
        r.properties.email ||
        r.id,
      salesforce: {
        objectType: "Lead",
        soql: `Status = 'MQL' AND OwnerId = null`,
        fields: ["Id", "Name", "Email", "CreatedDate", "Status"],
      },
    },

    // ── SQL stalled in early stage ───────────────────────────────────────────

    {
      id: "sql_stalled_no_deal",
      label: "SQLs with no associated deal",
      objectType: "contacts",
      filterGroups: [
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "salesqualifiedlead" },
            { propertyName: "associations.deal", operator: "NOT_HAS_PROPERTY" },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email", "lifecyclestage", "hubspot_owner_id"],
      severity: "critical",
      fix: "Create a deal for this SQL — qualified leads without pipeline are invisible to forecast",
      nextAction: "AE should create a deal and move this contact into the pipeline within 24 hours.",
      getName: (r) =>
        [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
        r.properties.email ||
        r.id,
      salesforce: {
        objectType: "Lead",
        soql: `Status = 'SQL' AND ConvertedOpportunityId = null`,
        fields: ["Id", "Name", "Email", "OwnerId", "ConvertedDate"],
      },
    },

    // ── Leads stuck in MQL too long ──────────────────────────────────────────

    {
      id: "mql_stuck_too_long",
      label: `MQLs stuck for ${cfg.bdr_followup_sla_hours * 3}+ hours with no lifecycle change`,
      objectType: "contacts",
      filterGroups: () => [
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "marketingqualifiedlead" },
            {
              propertyName: "hs_lifecyclestage_marketingqualifiedlead_date",
              operator: "LT",
              value: String(Date.now() - cfg.bdr_followup_sla_hours * 3 * HOUR_MS),
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email", "hubspot_owner_id", "hs_lifecyclestage_marketingqualifiedlead_date"],
      severity: "warning",
      fix: "Review this MQL — if unqualified, mark as such. If qualified, move to SQL and create a deal.",
      nextAction: "BDR manager should review and either qualify to SQL, disqualify, or re-engage.",
      getName: (r) =>
        [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
        r.properties.email ||
        r.id,
      salesforce: {
        objectType: "Lead",
        soql: `Status = 'MQL' AND LastModifiedDate < :thresholdDate`,
        fields: ["Id", "Name", "Email", "OwnerId", "LastModifiedDate"],
      },
    },

    // ── Lead status never updated ────────────────────────────────────────────

    {
      id: "lead_status_stale",
      label: "Leads assigned but status never updated",
      objectType: "contacts",
      filterGroups: () => [
        {
          filters: [
            { propertyName: "lifecyclestage", operator: "EQ", value: "lead" },
            { propertyName: "hubspot_owner_id", operator: "HAS_PROPERTY" },
            {
              propertyName: "hs_last_sales_activity_timestamp",
              operator: "LT",
              value: String(Date.now() - 7 * DAY_MS),
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email", "hubspot_owner_id", "hs_lead_status"],
      severity: "warning",
      fix: "Update lead status — assigned leads with no status movement indicate a routing or follow-up gap",
      nextAction: "BDR should update status to Attempted to Contact, Connected, or Unqualified.",
      getName: (r) =>
        [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
        r.properties.email ||
        r.id,
      salesforce: {
        objectType: "Lead",
        soql: `OwnerId != null AND Status = 'Open' AND LastActivityDate < :sevenDaysAgo`,
        fields: ["Id", "Name", "Email", "OwnerId", "Status", "LastActivityDate"],
      },
    },

  ];
}

export const leBdr: AgentDefinition = {
  name: "le-bdr",
  checks: [], // static fallback — buildChecks used at runtime
  buildChecks,

  summaryPrompt: (results) => {
    const lines = results
      .filter((r) => r.count > 0)
      .map(
        (r) =>
          `- ${r.check.label}: ${r.count} contacts${
            r.escalatedCount > 0 ? ` (${r.escalatedCount} escalated)` : ""
          }`
      )
      .join("\n");

    return `You are Le BDR, a RevOps agent that enforces top-of-funnel accountability.
Summarize these BDR follow-up issues in 2-3 sentences.
Focus on pipeline impact — every unworked MQL is a deal that will never exist.
Be direct. No bullet points.

Issues found:
${lines || "No issues found."}`;
  },
};
