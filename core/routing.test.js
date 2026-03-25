import { describe, it, expect } from "vitest";
import { routeQuestion } from "./routing.js";
describe("routeQuestion", () => {
    // ── Specific routing ──────────────────────────────────────────────────────
    it("routes pipeline questions to le-stage-audit", () => {
        const agents = routeQuestion("what's wrong with my pipeline?");
        expect(agents).toContain("le-stage-audit");
    });
    it("routes deal questions to le-stage-audit", () => {
        const agents = routeQuestion("show me stuck deals");
        expect(agents).toContain("le-stage-audit");
    });
    it("routes forecast questions to le-stage-audit", () => {
        const agents = routeQuestion("how is my forecast looking?");
        expect(agents).toContain("le-stage-audit");
    });
    it("routes data quality questions to le-data-quality", () => {
        const agents = routeQuestion("contacts missing email");
        expect(agents).toContain("le-data-quality");
    });
    it("routes hygiene questions to le-data-quality", () => {
        const agents = routeQuestion("CRM hygiene issues");
        expect(agents).toContain("le-data-quality");
    });
    it("routes duplicate questions to le-data-quality", () => {
        const agents = routeQuestion("find duplicate contacts");
        expect(agents).toContain("le-data-quality");
    });
    // ── Broad routing ─────────────────────────────────────────────────────────
    it("routes broad questions to all agents", () => {
        const agents = routeQuestion("what is the overall health of my CRM?");
        expect(agents.length).toBeGreaterThan(1);
    });
    it("routes 'help' to all agents", () => {
        const agents = routeQuestion("help");
        expect(agents.length).toBeGreaterThan(1);
    });
    it("routes unknown questions to all agents", () => {
        const agents = routeQuestion("xyzzy random nonsense");
        expect(agents.length).toBeGreaterThan(0);
    });
    // ── Safety ────────────────────────────────────────────────────────────────
    it("returns only agents that exist in the registry", () => {
        const agents = routeQuestion("pipeline and data quality");
        for (const agent of agents) {
            expect(["le-data-quality", "le-stage-audit"]).toContain(agent);
        }
    });
    it("never returns duplicate agents", () => {
        const agents = routeQuestion("pipeline deals and data quality hygiene");
        const unique = new Set(agents);
        expect(unique.size).toBe(agents.length);
    });
    it("never exceeds MAX_AGENTS", () => {
        const agents = routeQuestion("everything pipeline deals data quality hygiene forecast");
        expect(agents.length).toBeLessThanOrEqual(3);
    });
    it("is case-insensitive", () => {
        const lower = routeQuestion("pipeline");
        const upper = routeQuestion("PIPELINE");
        expect(lower).toEqual(upper);
    });
});
