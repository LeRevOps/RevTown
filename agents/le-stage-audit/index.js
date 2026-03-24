/**
 * LeClaw — Le Stage Audit Agent
 *
 * Checks deals for velocity problems, missing fields, and pipeline
 * health issues. Uses the core AgentDefinition interface.
 */
const checks = [
    // ── Missing deal fields ───────────────────────────────────────────────────
    {
        id: "deal_no_close_date",
        label: "Deals missing close date",
        objectType: "deals",
        filterGroups: [
            { filters: [{ propertyName: "closedate", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["dealname", "amount", "dealstage", "closedate"],
        severity: "critical",
        fix: "Add a close date — required for accurate forecasting",
        getName: (r) => r.properties.dealname || r.id,
    },
    {
        id: "deal_no_amount",
        label: "Deals missing amount",
        objectType: "deals",
        filterGroups: [
            { filters: [{ propertyName: "amount", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["dealname", "amount", "dealstage", "closedate"],
        severity: "critical",
        fix: "Add a deal value — required for pipeline and forecast accuracy",
        getName: (r) => r.properties.dealname || r.id,
        escalateIf: {
            description: "deal is in a late stage with no amount — forecast is overstated",
            filterGroups: [
                {
                    filters: [
                        { propertyName: "amount", operator: "NOT_HAS_PROPERTY" },
                        { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
                    ],
                },
            ],
            escalatedSeverity: "critical",
        },
    },
    {
        id: "deal_no_contact",
        label: "Deals with no associated contact",
        objectType: "deals",
        filterGroups: [
            { filters: [{ propertyName: "associations.contact", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["dealname", "amount", "dealstage", "closedate"],
        severity: "critical",
        fix: "Associate at least one contact with this deal",
        getName: (r) => r.properties.dealname || r.id,
    },
    // ── Time-based velocity checks ────────────────────────────────────────────
    {
        id: "deal_stuck_30d",
        label: "Deals stuck in stage for 30+ days",
        objectType: "deals",
        filterGroups: () => [
            {
                filters: [
                    {
                        propertyName: "hs_lastmodifieddate",
                        operator: "LT",
                        value: String(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                ],
            },
        ],
        properties: ["dealname", "amount", "dealstage", "closedate", "hs_lastmodifieddate"],
        severity: "warning",
        fix: "Review this deal — no stage movement in 30+ days indicates a stall",
        getName: (r) => r.properties.dealname || r.id,
    },
    {
        id: "deal_past_close_date",
        label: "Deals past their close date",
        objectType: "deals",
        filterGroups: () => [
            {
                filters: [
                    {
                        propertyName: "closedate",
                        operator: "LT",
                        value: String(Date.now()),
                    },
                    {
                        propertyName: "dealstage",
                        operator: "NEQ",
                        value: "closedwon",
                    },
                ],
            },
        ],
        properties: ["dealname", "amount", "dealstage", "closedate"],
        severity: "warning",
        fix: "Update the close date or mark this deal as closed lost — stale close dates distort forecast",
        getName: (r) => r.properties.dealname || r.id,
    },
];
export const leStageAudit = {
    name: "le-stage-audit",
    checks,
    summaryPrompt: (results) => {
        const lines = results
            .filter((r) => r.count > 0)
            .map((r) => `- ${r.check.label}: ${r.count} deals${r.escalatedCount > 0 ? ` (${r.escalatedCount} escalated)` : ""}`)
            .join("\n");
        return `You are Le Stage Audit, a RevOps agent. Summarize these pipeline health issues in 2-3 sentences.
Focus on forecast risk and revenue impact. Be direct. No bullet points.

Issues found:
${lines || "No issues found."}`;
    },
};
