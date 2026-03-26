/**
 * LeClaw — Le Deal Review Agent
 *
 * Generates pre-meeting deal intelligence. Every Thursday morning,
 * AEs and managers should already know which deals are stuck, why,
 * and what needs to happen before the next call.
 *
 * Inspired by: Post 1 (Kintsugi) — "Before their weekly deal review
 * call even starts — both sides already know what's going on."
 *
 * The output isn't "here's what's broken" — it's "here's what to do
 * about it before you walk into the room."
 *
 * Salesforce equivalents documented on each check.
 */

import type { AgentDefinition, AgentCheck, OrgConfig } from "../../core/base.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function buildChecks(cfg: OrgConfig): AgentCheck[] {
  const highValue = cfg.high_value_deal_threshold;
  const lateStages = cfg.late_stage_names;

  return [

    // ── Deals closing in 14 days — the ones that matter this week ───────────

    {
      id: "deal_closing_14d_needs_action",
      label: "Deals closing in 14 days with no activity this week",
      objectType: "deals",
      filterGroups: () => {
        const in14Days = Date.now() + 14 * DAY_MS;
        const sevenDaysAgo = Date.now() - 7 * DAY_MS;
        return [
          {
            filters: [
              { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
              { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
              { propertyName: "closedate", operator: "LT", value: String(in14Days) },
              { propertyName: "closedate", operator: "GT", value: String(Date.now()) },
              {
                propertyName: "notes_last_activity",
                operator: "LT",
                value: String(sevenDaysAgo),
              },
            ],
          },
        ];
      },
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate", "notes_last_activity", "hs_next_step"],
      severity: "critical",
      fix: "This deal closes in two weeks but nothing happened this week — needs a plan today",
      nextAction: "AE should re-engage the buyer, confirm close date is realistic, and set a specific next step before end of week.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND CloseDate <= :in14Days AND CloseDate > TODAY AND (LastActivityDate = null OR LastActivityDate < :sevenDaysAgo)`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate", "LastActivityDate", "NextStep"],
      },
    },

    // ── Late-stage deals missing critical fields ──────────────────────────────

    {
      id: "late_stage_missing_close_date",
      label: "Late-stage deals with no close date",
      objectType: "deals",
      filterGroups: lateStages.length > 0
        ? lateStages.map((stage) => ({
            filters: [
              { propertyName: "dealstage", operator: "EQ", value: stage },
              { propertyName: "closedate", operator: "NOT_HAS_PROPERTY" },
            ],
          }))
        : [
            {
              filters: [
                { propertyName: "dealstage", operator: "NEQ", value: "appointmentscheduled" },
                { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
                { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
                { propertyName: "amount", operator: "GT", value: String(highValue * 0.5) },
                { propertyName: "closedate", operator: "NOT_HAS_PROPERTY" },
              ],
            },
          ],
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id"],
      severity: "critical",
      fix: "Add a close date — late-stage deals without one are invisible in forecast",
      nextAction: "AE should confirm expected close date with the buyer and log it before the deal review call.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND CloseDate = null AND StageName IN :lateStages`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId"],
      },
    },

    // ── Late-stage deals missing amount ──────────────────────────────────────

    {
      id: "late_stage_missing_amount",
      label: "Late-stage deals with no amount",
      objectType: "deals",
      filterGroups: lateStages.length > 0
        ? lateStages.map((stage) => ({
            filters: [
              { propertyName: "dealstage", operator: "EQ", value: stage },
              { propertyName: "amount", operator: "NOT_HAS_PROPERTY" },
            ],
          }))
        : [
            {
              filters: [
                { propertyName: "dealstage", operator: "NEQ", value: "appointmentscheduled" },
                { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
                { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
                { propertyName: "closedate", operator: "HAS_PROPERTY" },
                { propertyName: "amount", operator: "NOT_HAS_PROPERTY" },
              ],
            },
          ],
      properties: ["dealname", "dealstage", "hubspot_owner_id", "closedate"],
      severity: "critical",
      fix: "Add deal value — late-stage deals without an amount overstate pipeline coverage",
      nextAction: "AE must get a number from the buyer or document expected ARR before the deal review call.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND Amount = null AND StageName IN :lateStages`,
        fields: ["Id", "Name", "StageName", "OwnerId", "CloseDate"],
      },
    },

    // ── Deals with close date pushed more than once ───────────────────────────

    {
      id: "deal_close_date_past",
      label: "Deals with close date already passed",
      objectType: "deals",
      filterGroups: () => [
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            {
              propertyName: "closedate",
              operator: "LT",
              value: String(Date.now()),
            },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate"],
      severity: "warning",
      fix: "Update close date or close lost — past-close deals inflate pipeline and distort forecast",
      nextAction: "AE should either push the close date with a reason or move to closed lost. No sitting on stale pipeline.",
      getName: (r) => r.properties.dealname || r.id,
      escalateIf: {
        description: "high-value deal past close date",
        filterGroups: () => [
          {
            filters: [
              { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
              { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
              { propertyName: "closedate", operator: "LT", value: String(Date.now()) },
              { propertyName: "amount", operator: "GT", value: String(highValue) },
            ],
          },
        ],
        escalatedSeverity: "critical",
      },
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND CloseDate < TODAY`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate"],
      },
    },

    // ── Deals with no associated contact — flying blind ──────────────────────

    {
      id: "deal_no_contact_for_review",
      label: "Deals with no associated contact",
      objectType: "deals",
      filterGroups: [
        {
          filters: [
            { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
            { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            { propertyName: "associations.contact", operator: "NOT_HAS_PROPERTY" },
            { propertyName: "amount", operator: "GT", value: "0" },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage", "hubspot_owner_id", "closedate"],
      severity: "warning",
      fix: "Associate a contact — you can't prepare for a deal review if you don't know who you're selling to",
      nextAction: "AE should associate the primary contact (economic buyer or champion) before the deal review call.",
      getName: (r) => r.properties.dealname || r.id,
      salesforce: {
        objectType: "Opportunity",
        soql: `IsClosed = false AND Amount > 0 AND Id NOT IN (SELECT OpportunityId FROM OpportunityContactRole)`,
        fields: ["Id", "Name", "Amount", "StageName", "OwnerId", "CloseDate"],
      },
    },

  ];
}

export const leDealReview: AgentDefinition = {
  name: "le-deal-review",
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

    return `You are Le Deal Review, a RevOps agent that prepares deal intelligence before pipeline reviews.
Summarize these deal review issues in 3-4 sentences.
Focus on what needs to happen before the next deal review call — specific actions, not just problems.
Call out the deals most at risk this week. Be direct. No bullet points.

Issues found:
${lines || "No issues found — pipeline is review-ready."}`;
  },
};
