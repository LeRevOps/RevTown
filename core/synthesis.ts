/**
 * @leclaw/core — Synthesis
 *
 * Builds prompts for Le Directeur's final synthesis.
 * Sonnet is only called once per question, after all agents have filed rapports.
 */

export interface RapportSummary {
  agentName: string;
  score: number;
  totalIssues: number;
  summary: string;
  topChecks: Array<{ label: string; count: number; severity: string }>;
}

export interface SynthesisPlan {
  intent: string;
  areasToInspect: string[];
  successCriteria: string;
}

export interface AgentRunHistory {
  agentName: string;
  /** Last up to 5 completed runs, oldest first */
  runs: Array<{ score: number; date: string }>;
  trend: "improving" | "declining" | "stable" | "new";
}

export type RunHistory = AgentRunHistory[];

/** Build RunHistory from raw Supabase rows, grouped by agent */
export function buildRunHistory(
  rows: Array<{ agent_name: string; score: number; created_at: string }>,
  /** Exclude these run IDs (the current run) — pass agent names instead */
  excludeAgentNames?: Set<string>
): RunHistory {
  const byAgent = new Map<string, Array<{ score: number; date: string }>>();

  for (const row of rows) {
    if (!byAgent.has(row.agent_name)) byAgent.set(row.agent_name, []);
    byAgent.get(row.agent_name)!.push({
      score: row.score ?? 0,
      date: row.created_at.slice(0, 10),
    });
  }

  const history: RunHistory = [];
  for (const [agentName, runs] of byAgent) {
    const last5 = runs.slice(-5); // rows are already sorted oldest-first
    const trend = computeTrend(last5.map((r) => r.score));
    history.push({ agentName, runs: last5, trend });
  }

  return history;
}

function computeTrend(scores: number[]): AgentRunHistory["trend"] {
  if (scores.length < 2) return "new";
  const delta = scores[scores.length - 1] - scores[0];
  if (delta <= -5) return "declining";
  if (delta >= 5) return "improving";
  return "stable";
}

function formatHistory(history: RunHistory): string {
  if (history.length === 0) return "";
  const lines = history.map((h) => {
    const scores = h.runs.map((r) => r.score).join(" → ");
    const delta = h.runs[h.runs.length - 1].score - h.runs[0].score;
    const deltaStr = delta > 0 ? `+${delta}pts` : delta < 0 ? `${delta}pts` : "stable";
    return `  - ${h.agentName}: ${scores} (${h.trend}, ${deltaStr})`;
  });
  return `Historical context (last 4 weeks):\n${lines.join("\n")}`;
}

export function buildSynthesisPrompt(
  question: string,
  rapports: RapportSummary[],
  plan?: SynthesisPlan,
  history?: RunHistory
): string {
  const rapportBlocks = rapports
    .map((r) => {
      const checksText = r.topChecks
        .filter((c) => c.count > 0)
        .slice(0, 5)
        .map((c) => `  - ${c.label}: ${c.count} (${c.severity})`)
        .join("\n");

      return [
        `Agent: ${r.agentName}`,
        `Score: ${r.score}/100`,
        `Total issues: ${r.totalIssues}`,
        `Summary: ${r.summary}`,
        checksText ? `Top issues:\n${checksText}` : "No issues found.",
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const planBlock = plan
    ? `\nPlan: ${plan.intent}\nAreas inspected: ${plan.areasToInspect.join(", ")}\nSuccess criteria: ${plan.successCriteria}\n`
    : "";

  const historyBlock = history && history.length > 0
    ? `\n${formatHistory(history)}\n`
    : "";

  return `You are Le Directeur, the orchestrator of a RevOps agent team.

You just dispatched agents to audit a HubSpot CRM. They have filed their rapports.
A GTM engineer asked: "${question}"
${planBlock}${historyBlock}
Agent rapports:

${rapportBlocks}

Answer the engineer's question in 3-4 sentences. Identify root causes, connect patterns across agents if relevant${history && history.length > 0 ? ", and call out any meaningful score trends" : ""}, and end with one concrete recommendation.
Be direct. No bullet points. No preamble like "Based on the rapports..." — just answer.`;
}

export function buildSynthesisPromptNoData(question: string): string {
  return `You are Le Directeur, the orchestrator of a RevOps agent team.

A GTM engineer asked: "${question}"

Your agents ran and found zero issues across all checks. The CRM appears clean.

Respond in 2-3 sentences acknowledging this, and suggest one proactive check the engineer might want to look at next.`;
}
