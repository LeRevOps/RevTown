/**
 * @leclaw/core — Agent Manifest
 *
 * Every agent in the LeClaw registry ships with an agent.json file
 * that conforms to this schema. The registry.json at the repo root
 * aggregates all manifests into a single index for the hub page.
 */
export interface AgentManifest {
    /** Kebab-case agent name. Must match the AgentDefinition name. e.g. "le-data-quality" */
    name: string;
    /** Display name shown in UI. e.g. "Le Data Quality" */
    displayName: string;
    /** One-sentence description of what this agent audits */
    description: string;
    /** The RevOps domain this agent owns */
    domain: "data-quality" | "pipeline" | "bdr" | "forecast" | "routing" | "renewal" | "territory" | "commission" | "qbr" | "duplicates" | "activities" | "deal-desk" | string;
    /** Which CRMs this agent supports */
    crm: Array<"hubspot" | "salesforce" | string>;
    /** HubSpot object types this agent reads */
    objectTypes: Array<"contacts" | "companies" | "deals" | "tickets" | string>;
    /** Minimum HubSpot OAuth scopes required */
    requiredScopes: string[];
    /** Lifecycle status */
    status: "live" | "beta" | "soon" | "planned";
    /** Who built it */
    author: {
        name: string;
        github?: string;
        /** "core" = LeClaw team, "community" = external contributor */
        type: "core" | "community";
    };
    /** Number of checks this agent runs */
    checkCount: number;
    /** Searchable tags */
    tags: string[];
    /** Semver of @leclaw/core this agent was built against */
    coreVersion: string;
}
