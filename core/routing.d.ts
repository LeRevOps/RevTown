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
export declare function routeQuestion(question: string): string[];
