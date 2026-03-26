/**
 * LeClaw — Le Activities Agent
 *
 * Monitors deal activity and rep engagement. Catches deals that reps
 * haven't touched, tasks that were never created, and high-value
 * opportunities going dark before anyone notices.
 *
 * Inspired by: Post 3 (Vector RevOps) — "Deal hygiene alerts when
 * reps haven't updated in too long."
 *
 * Salesforce equivalents documented on each check.
 */
import type { AgentDefinition } from "../../core/base.js";
export declare const leActivities: AgentDefinition;
