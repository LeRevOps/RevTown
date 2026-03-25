import { describe, it, expect } from "vitest";
import { calculateScore } from "./base.js";
function makeResult(severity, count, escalatedCount = 0) {
    return {
        check: {
            id: `test_${severity}`,
            label: `Test ${severity}`,
            objectType: "contacts",
            filterGroups: [],
            properties: ["email"],
            severity,
            fix: "Fix it",
            getName: (r) => r.id,
        },
        count,
        escalatedCount,
        samples: [],
    };
}
describe("calculateScore", () => {
    it("returns 100 when there are no issues", () => {
        expect(calculateScore([])).toBe(100);
    });
    it("returns 100 when all checks have zero count", () => {
        const results = [makeResult("critical", 0), makeResult("warning", 0)];
        expect(calculateScore(results)).toBe(100);
    });
    it("penalizes critical issues more than warnings", () => {
        const withCritical = [makeResult("critical", 5)];
        const withWarning = [makeResult("warning", 5)];
        expect(calculateScore(withCritical)).toBeLessThan(calculateScore(withWarning));
    });
    it("penalizes warnings more than info", () => {
        const withWarning = [makeResult("warning", 5)];
        const withInfo = [makeResult("info", 5)];
        expect(calculateScore(withWarning)).toBeLessThan(calculateScore(withInfo));
    });
    it("never goes below 0", () => {
        const results = [makeResult("critical", 10000)];
        expect(calculateScore(results)).toBeGreaterThanOrEqual(0);
    });
    it("never exceeds 100", () => {
        expect(calculateScore([])).toBeLessThanOrEqual(100);
    });
    it("escalated issues add to penalty", () => {
        const withEscalation = [makeResult("warning", 5, 3)];
        const withoutEscalation = [makeResult("warning", 5, 0)];
        expect(calculateScore(withEscalation)).toBeLessThan(calculateScore(withoutEscalation));
    });
    it("produces integer scores", () => {
        const results = [makeResult("warning", 7)];
        const score = calculateScore(results);
        expect(Number.isInteger(score)).toBe(true);
    });
});
