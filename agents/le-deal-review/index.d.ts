/**
 * LeClaw — Le Deal Review Agent
 *
 * Generates pre-meeting deal intelligence. Every Thursday morning,
 * AEs and managers should already know which deals are stuck, why,
 * and what needs to happen before the next call.
 *
 * Inspired by: Post 1 (Kintsugi) — "Before their weekly deal review
 * call even starts — both sides already know what's going on."
 *
 * The output isn't "here's what's broken" — it's "here's what to do
 * about it before you walk into the room."
 *
 * Salesforce equivalents documented on each check.
 */
import type { AgentDefinition } from "../../core/base.js";
export declare const leDealReview: AgentDefinition;
