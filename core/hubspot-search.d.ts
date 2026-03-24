/**
 * @leclaw/core — HubSpot Search
 *
 * The foundation of every LeClaw agent.
 * Fetches ONLY broken records — never full CRM scans.
 *
 * filterGroups follow HubSpot native format:
 *   - Outer array = OR logic between groups
 *   - Inner filters array = AND logic within a group
 *
 * @example
 * // Contacts missing email OR missing name
 * searchHubSpot(token, "contacts", [
 *   { filters: [{ propertyName: "email", operator: "NOT_HAS_PROPERTY" }] },
 *   { filters: [{ propertyName: "firstname", operator: "NOT_HAS_PROPERTY" }] },
 * ], ["email", "firstname"], async (records) => {
 *   console.log(records);
 * });
 */
export interface HubSpotFilter {
    propertyName: string;
    operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE" | "HAS_PROPERTY" | "NOT_HAS_PROPERTY" | "CONTAINS_TOKEN" | "NOT_CONTAINS_TOKEN";
    value?: string;
}
export interface HubSpotFilterGroup {
    filters: HubSpotFilter[];
}
export interface HubSpotRecord {
    id: string;
    properties: Record<string, string | null>;
}
export declare function searchHubSpot(token: string, objectType: string, filterGroups: HubSpotFilterGroup[], properties: string[], onBatch: (records: HubSpotRecord[], totalSoFar: number) => Promise<void> | void): Promise<{
    total: number;
}>;
