/**
 * @leclaw/core — Dynamic property discovery
 *
 * Fetches the org's custom HubSpot properties and builds AgentChecks for them.
 * Agents call buildDynamicChecks() in their discoverChecks hook to automatically
 * flag custom fields that are commonly empty — without hardcoding field names.
 *
 * @example
 * export const myAgent: AgentDefinition = {
 *   name: "le-my-agent",
 *   checks: [...staticChecks],
 *   discoverChecks: (token) => buildDynamicChecks(token, "contacts"),
 *   summaryPrompt: (results) => `...`,
 * };
 */
import { AgentCheck } from "./base.js";
interface HubSpotProperty {
    name: string;
    label: string;
    type: string;
    fieldType: string;
    hubspotDefined: boolean;
    readOnlyValue: boolean;
    calculated: boolean;
    displayOrder: number;
}
export declare function fetchCustomProperties(token: string, objectType: string): Promise<HubSpotProperty[]>;
export declare function buildDynamicChecks(token: string, objectType: string): Promise<AgentCheck[]>;
export {};
