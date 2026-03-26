/**
 * LeClaw — Le BDR Agent
 *
 * Enforces BDR follow-up SLAs, surfaces unworked MQLs, and flags
 * contacts that have fallen through the cracks of the top-of-funnel.
 *
 * Inspired by: practitioners who know that an MQL with no activity
 * for 48 hours is a lead that will never convert.
 *
 * Salesforce equivalents documented on each check — ready for the
 * Salesforce adapter.
 */
import type { AgentDefinition } from "../../core/base.js";
export declare const leBdr: AgentDefinition;
