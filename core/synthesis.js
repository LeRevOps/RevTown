/**
 * @leclaw/core — Synthesis
 *
 * Builds prompts for Le Directeur's final synthesis.
 * Sonnet is only called once per question, after all agents have filed rapports.
 */
export function buildSynthesisPrompt(question, rapports) {
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
    return `You are Le Directeur, the orchestrator of a RevOps agent team.

You just dispatched agents to audit a HubSpot CRM. They have filed their rapports.
A GTM engineer asked: "${question}"

Agent rapports:

${rapportBlocks}

Answer the engineer's question in 3-4 sentences. Identify root causes, connect patterns across agents if relevant, and end with one concrete recommendation.
Be direct. No bullet points. No preamble like "Based on the rapports..." — just answer.`;
}
export function buildSynthesisPromptNoData(question) {
    return `You are Le Directeur, the orchestrator of a RevOps agent team.

A GTM engineer asked: "${question}"

Your agents ran and found zero issues across all checks. The CRM appears clean.

Respond in 2-3 sentences acknowledging this, and suggest one proactive check the engineer might want to look at next.`;
}
