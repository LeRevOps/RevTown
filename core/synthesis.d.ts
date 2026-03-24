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
    topChecks: Array<{
        label: string;
        count: number;
        severity: string;
    }>;
}
export declare function buildSynthesisPrompt(question: string, rapports: RapportSummary[]): string;
export declare function buildSynthesisPromptNoData(question: string): string;
