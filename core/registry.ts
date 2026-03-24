/**
 * @leclaw/core — Agent Registry
 *
 * The single source of truth for all available agents.
 * Add a new agent here and it becomes available to the CLI router.
 *
 * To add a new agent:
 * 1. Create agents/le-my-agent/index.ts implementing AgentDefinition
 * 2. Import it here and add it to agentRegistry
 */

import type { AgentDefinition } from "./base.js";
import { leDataQuality } from "../agents/le-data-quality/index.js";
import { leStageAudit } from "../agents/le-stage-audit/index.js";

export const agentRegistry: Record<string, AgentDefinition> = {
  "le-data-quality": leDataQuality,
  "le-stage-audit": leStageAudit,
};
