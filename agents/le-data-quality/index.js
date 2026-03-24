/**
 * LeClaw — Le Data Quality Agent
 *
 * Checks contacts and companies for missing critical fields
 * and broken relationships. Uses the core AgentDefinition interface.
 */
const checks = [
    // ── Contacts ─────────────────────────────────────────────────────────────
    {
        id: "contact_missing_email",
        label: "Contacts missing email",
        objectType: "contacts",
        filterGroups: [
            { filters: [{ propertyName: "email", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["firstname", "lastname", "email"],
        severity: "critical",
        fix: "Add an email address to this contact",
        getName: (r) => [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
            r.id,
        escalateIf: {
            description: "contact has an open deal but no email",
            filterGroups: [
                {
                    filters: [
                        { propertyName: "email", operator: "NOT_HAS_PROPERTY" },
                        { propertyName: "associations.deal", operator: "HAS_PROPERTY" },
                    ],
                },
            ],
            escalatedSeverity: "critical",
        },
    },
    {
        id: "contact_missing_name",
        label: "Contacts missing first or last name",
        objectType: "contacts",
        filterGroups: [
            { filters: [{ propertyName: "firstname", operator: "NOT_HAS_PROPERTY" }] },
            { filters: [{ propertyName: "lastname", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["firstname", "lastname", "email"],
        severity: "warning",
        fix: "Add a first name and last name to this contact",
        getName: (r) => r.properties.email || r.id,
    },
    {
        id: "contact_no_company",
        label: "Contacts with no company association",
        objectType: "contacts",
        filterGroups: [
            { filters: [{ propertyName: "associations.company", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["firstname", "lastname", "email"],
        severity: "warning",
        fix: "Associate this contact with a company record",
        getName: (r) => [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
            r.properties.email ||
            r.id,
    },
    {
        id: "contact_missing_job_title",
        label: "Contacts missing job title",
        objectType: "contacts",
        filterGroups: [
            { filters: [{ propertyName: "jobtitle", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["firstname", "lastname", "email", "jobtitle"],
        severity: "info",
        fix: "Add a job title to help with segmentation and routing",
        getName: (r) => [r.properties.firstname, r.properties.lastname].filter(Boolean).join(" ") ||
            r.properties.email ||
            r.id,
    },
    // ── Companies ─────────────────────────────────────────────────────────────
    {
        id: "company_missing_domain",
        label: "Companies missing domain",
        objectType: "companies",
        filterGroups: [
            { filters: [{ propertyName: "domain", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["name", "domain", "industry"],
        severity: "critical",
        fix: "Add the company website domain — required for deduplication and enrichment",
        getName: (r) => r.properties.name || r.id,
    },
    {
        id: "company_missing_industry",
        label: "Companies missing industry",
        objectType: "companies",
        filterGroups: [
            { filters: [{ propertyName: "industry", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["name", "domain", "industry"],
        severity: "warning",
        fix: "Add industry to enable segmentation and reporting",
        getName: (r) => r.properties.name || r.id,
    },
    {
        id: "company_no_contacts",
        label: "Companies with no associated contacts",
        objectType: "companies",
        filterGroups: [
            { filters: [{ propertyName: "associations.contact", operator: "NOT_HAS_PROPERTY" }] },
        ],
        properties: ["name", "domain"],
        severity: "warning",
        fix: "Associate at least one contact with this company or archive it",
        getName: (r) => r.properties.name || r.id,
    },
];
export const leDataQuality = {
    name: "le-data-quality",
    checks,
    summaryPrompt: (results) => {
        const lines = results
            .filter((r) => r.count > 0)
            .map((r) => `- ${r.check.label}: ${r.count} records${r.escalatedCount > 0 ? ` (${r.escalatedCount} escalated)` : ""}`)
            .join("\n");
        return `You are Le Data Quality, a RevOps agent. Summarize these CRM data issues in 2-3 sentences.
Focus on business impact (lost leads, broken routing, bad segmentation). Be direct. No bullet points.

Issues found:
${lines || "No issues found."}`;
    },
};
