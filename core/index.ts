export {
  runAgent,
  callClaude,
} from "./base.js";

export type {
  AgentDefinition,
  AgentCheck,
  AgentCheck as Check,
  CheckResult,
  RunOptions,
  Rapport,
  Issue,
  HubSpotRecord,
  HubSpotFilterGroup,
} from "./base.js";

export { searchHubSpot } from "./hubspot-search.js";
export type { HubSpotFilter } from "./hubspot-search.js";

export { buildDynamicChecks, fetchCustomProperties } from "./hubspot-properties.js";

export { routeQuestion } from "./routing.js";
export { buildSynthesisPrompt, buildSynthesisPromptNoData } from "./synthesis.js";
export type { RapportSummary } from "./synthesis.js";
