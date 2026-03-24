/**
 * @leclaw/core — Question Router
 *
 * Rule-based routing — zero tokens, zero latency.
 * Maps question keywords to agent names.
 *
 * To add a new agent to routing:
 * 1. Add it to agentRegistry in registry.ts
 * 2. Add its keywords to KEYWORD_MAP below
 */
import { agentRegistry } from "./registry.js";
// ── Keyword map ────────────────────────────────────────────────────────────────
// Keys are agent names. Values are keyword arrays (case-insensitive match).
const KEYWORD_MAP = {
    "le-stage-audit": [
        "pipeline",
        "deals",
        "deal",
        "stuck",
        "forecast",
        "close date",
        "stage",
        "velocity",
        "stall",
        "stalled",
        "opportunity",
        "opportunities",
        "win rate",
        "lost",
    ],
    "le-data-quality": [
        "data",
        "missing",
        "email",
        "phone",
        "contact",
        "field",
        "duplicate",
        "hygiene",
        "quality",
        "incomplete",
        "enrichment",
        "blank",
        "empty",
        "company",
        "domain",
    ],
};
// Broad/unclear questions that should trigger all agents
const BROAD_KEYWORDS = [
    "why",
    "health",
    "crm",
    "everything",
    "overview",
    "status",
    "help",
    "what",
    "how",
    "show",
    "tell",
    "overall",
    "summary",
    "report",
    "audit",
];
const MAX_AGENTS = 3;
export function routeQuestion(question) {
    const q = question.toLowerCase();
    // Check for broad/unclear questions first — return all live agents
    const isBroad = BROAD_KEYWORDS.some((kw) => q.includes(kw));
    // Collect matched agents from keyword map
    const matched = new Set();
    for (const [agentName, keywords] of Object.entries(KEYWORD_MAP)) {
        // Only include agents that exist in the registry
        if (!(agentName in agentRegistry))
            continue;
        const hits = keywords.some((kw) => q.includes(kw));
        if (hits)
            matched.add(agentName);
    }
    // Broad question or no keyword match → all agents
    if (isBroad || matched.size === 0) {
        const all = Object.keys(agentRegistry).slice(0, MAX_AGENTS);
        return all;
    }
    // Return deduplicated matches, capped at MAX_AGENTS
    return Array.from(matched).slice(0, MAX_AGENTS);
}
