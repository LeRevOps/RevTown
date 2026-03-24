/**
 * @leclaw/core — Agent base
 *
 * The framework every LeClaw agent is built on.
 *
 * Architecture:
 *   Le Directeur  — orchestrates missions, dispatches agents, reads rapports
 *   les agents    — specialist workers, each owns one CRM domain
 *   Le Témoin     — validates proposed changes before write-back
 *   une mission   — a coordinated run dispatched by Le Directeur
 *   un rapport    — structured result filed by each agent after a run
 *   Le Retrait    — an agent that cannot complete its work withdraws cleanly
 *
 * Four principles baked into every agent:
 *
 * 1. TARGETED FETCHING   — only broken records are ever fetched
 * 2. RELATIONSHIP AWARENESS — association filters + escalation from CRM context
 * 3. DYNAMIC DISCOVERY   — auto-discover custom properties at runtime
 * 4. WRITE-BACK READY    — every broken record ID is captured, ready for fixes
 */
import { searchHubSpot } from "./hubspot-search.js";
export async function runAgent(agent, options) {
    const { hubspotToken, anthropicKey, onIssue } = options;
    // Merge static checks with any discovered at runtime
    const dynamicChecks = agent.discoverChecks
        ? await agent.discoverChecks(hubspotToken)
        : [];
    const allChecks = [...agent.checks, ...dynamicChecks];
    const results = [];
    for (const check of allChecks) {
        let count = 0;
        let escalatedCount = 0;
        const samples = [];
        // Fetch only broken records — never full scans
        await searchHubSpot(hubspotToken, check.objectType, resolveFilterGroups(check.filterGroups), check.properties, async (records) => {
            for (const record of records) {
                count++;
                const name = check.getName(record);
                if (samples.length < 20)
                    samples.push({ id: record.id, name });
                if (onIssue) {
                    await onIssue({
                        objectType: check.objectType,
                        objectId: record.id,
                        objectName: name,
                        severity: check.severity,
                        issueType: check.id,
                        fixSuggestion: check.fix,
                    });
                }
            }
        });
        // Context escalation — count the subset matching escalateIf
        if (check.escalateIf && count > 0) {
            const result = await searchHubSpot(hubspotToken, check.objectType, resolveFilterGroups(check.escalateIf.filterGroups), ["id"], (records) => { escalatedCount += records.length; });
            escalatedCount = result.total;
            if (escalatedCount > 0 && onIssue) {
                await searchHubSpot(hubspotToken, check.objectType, resolveFilterGroups(check.escalateIf.filterGroups), check.properties, async (records) => {
                    for (const record of records) {
                        await onIssue({
                            objectType: check.objectType,
                            objectId: record.id,
                            objectName: check.getName(record),
                            severity: check.escalateIf.escalatedSeverity,
                            issueType: `${check.id}_escalated`,
                            fixSuggestion: `URGENT — ${check.fix} (${check.escalateIf.description})`,
                        });
                    }
                });
            }
        }
        results.push({ check, count, escalatedCount, samples });
    }
    const totalIssues = results.reduce((sum, r) => sum + r.count, 0);
    const score = calculateScore(results);
    const summary = anthropicKey
        ? (await callClaude(agent.summaryPrompt(results), anthropicKey)) ??
            `Mission complete. ${totalIssues} issues found. Score: ${score}/100.`
        : `Mission complete. ${totalIssues} issues found. Score: ${score}/100.`;
    return {
        agentName: agent.name,
        score,
        totalIssues,
        checks: results.map((r) => ({
            id: r.check.id,
            label: r.check.label,
            severity: r.check.severity,
            count: r.count,
            escalatedCount: r.escalatedCount,
            writebackAvailable: !!r.check.writeback,
            writebackRequiresApproval: r.check.writeback?.requiresApproval ?? true,
        })),
        summary,
    };
}
// ── Scoring ────────────────────────────────────────────────────────────────────
function calculateScore(results) {
    const weights = { critical: 10, warning: 3, info: 1 };
    const totalPenalty = results.reduce((sum, r) => {
        return sum +
            r.count * weights[r.check.severity] +
            r.escalatedCount * weights.critical;
    }, 0);
    return Math.max(0, Math.round(100 - Math.min(totalPenalty / 10, 100)));
}
// ── Claude helper ──────────────────────────────────────────────────────────────
function resolveFilterGroups(fg) {
    return typeof fg === "function" ? fg() : fg;
}
export async function callClaude(prompt, apiKey, options = {}) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: options.model ?? "claude-haiku-4-5-20251001",
            max_tokens: options.maxTokens ?? 300,
            messages: [{ role: "user", content: prompt }],
        }),
    });
    if (!res.ok)
        return null;
    const data = await res.json();
    return data.content[0].text;
}
