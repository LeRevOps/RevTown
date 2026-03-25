import { describe, it, expect } from "vitest";
import { buildSynthesisPrompt, buildSynthesisPromptNoData } from "./synthesis.js";
const mockRapport = {
    agentName: "le-data-quality",
    score: 72,
    totalIssues: 14,
    summary: "14 contacts are missing critical fields.",
    topChecks: [
        { label: "Contacts missing email", count: 6, severity: "critical" },
        { label: "Companies missing domain", count: 8, severity: "warning" },
    ],
};
describe("buildSynthesisPrompt", () => {
    it("includes the user's question", () => {
        const prompt = buildSynthesisPrompt("what is wrong with my CRM?", [mockRapport]);
        expect(prompt).toContain("what is wrong with my CRM?");
    });
    it("includes agent name", () => {
        const prompt = buildSynthesisPrompt("show me issues", [mockRapport]);
        expect(prompt).toContain("le-data-quality");
    });
    it("includes score", () => {
        const prompt = buildSynthesisPrompt("show me issues", [mockRapport]);
        expect(prompt).toContain("72");
    });
    it("includes total issues", () => {
        const prompt = buildSynthesisPrompt("show me issues", [mockRapport]);
        expect(prompt).toContain("14");
    });
    it("includes check labels for checks with issues", () => {
        const prompt = buildSynthesisPrompt("show me issues", [mockRapport]);
        expect(prompt).toContain("Contacts missing email");
        expect(prompt).toContain("Companies missing domain");
    });
    it("does not include checks with zero count", () => {
        const rapportWithZeroCheck = {
            ...mockRapport,
            topChecks: [
                { label: "Contacts missing email", count: 0, severity: "critical" },
                { label: "Companies missing domain", count: 5, severity: "warning" },
            ],
        };
        const prompt = buildSynthesisPrompt("show me issues", [rapportWithZeroCheck]);
        expect(prompt).not.toContain("Contacts missing email");
        expect(prompt).toContain("Companies missing domain");
    });
    it("handles multiple rapports", () => {
        const rapport2 = {
            agentName: "le-stage-audit",
            score: 55,
            totalIssues: 8,
            summary: "8 deals are stuck.",
            topChecks: [{ label: "Deals stuck 30+ days", count: 8, severity: "warning" }],
        };
        const prompt = buildSynthesisPrompt("full audit", [mockRapport, rapport2]);
        expect(prompt).toContain("le-data-quality");
        expect(prompt).toContain("le-stage-audit");
    });
    it("instructs Claude to be direct with no preamble", () => {
        const prompt = buildSynthesisPrompt("show me issues", [mockRapport]);
        expect(prompt).toContain("No bullet points");
        expect(prompt.toLowerCase()).toContain("direct");
    });
});
describe("buildSynthesisPromptNoData", () => {
    it("includes the user's question", () => {
        const prompt = buildSynthesisPromptNoData("is my CRM clean?");
        expect(prompt).toContain("is my CRM clean?");
    });
    it("mentions zero issues found", () => {
        const prompt = buildSynthesisPromptNoData("is my CRM clean?");
        expect(prompt.toLowerCase()).toContain("zero issues");
    });
    it("asks for a proactive suggestion", () => {
        const prompt = buildSynthesisPromptNoData("is my CRM clean?");
        expect(prompt.toLowerCase()).toContain("proactive");
    });
});
