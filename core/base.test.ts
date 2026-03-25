import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentDefinition, Issue } from "./base.js";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("./hubspot-search.js", () => ({
  searchHubSpot: vi.fn(),
}));

// Mock global fetch for callClaude
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocks are set up
const { runAgent } = await import("./base.js");
const { searchHubSpot } = await import("./hubspot-search.js");
const mockSearch = vi.mocked(searchHubSpot);

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockSearchReturns(records: Array<{ id: string; properties: Record<string, string> }>) {
  mockSearch.mockImplementation(async (_token, _type, _filters, _props, onBatch) => {
    if (records.length > 0) await onBatch(records, records.length);
    return { total: records.length };
  });
}

function mockClaudeReturns(text: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ text }] }),
  });
}

const minimalAgent: AgentDefinition = {
  name: "test-agent",
  checks: [
    {
      id: "test_missing_email",
      label: "Contacts missing email",
      objectType: "contacts",
      filterGroups: [{ filters: [{ propertyName: "email", operator: "NOT_HAS_PROPERTY" }] }],
      properties: ["firstname", "email"],
      severity: "critical",
      fix: "Add an email",
      getName: (r) => r.properties.firstname || r.id,
    },
  ],
  summaryPrompt: (results) => `Summarize: ${results.length} checks`,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a rapport with the agent name", async () => {
    mockSearchReturns([]);
    const rapport = await runAgent(minimalAgent, { hubspotToken: "test-token" });
    expect(rapport.agentName).toBe("test-agent");
  });

  it("returns score 100 when no issues found", async () => {
    mockSearchReturns([]);
    const rapport = await runAgent(minimalAgent, { hubspotToken: "test-token" });
    expect(rapport.score).toBe(100);
    expect(rapport.totalIssues).toBe(0);
  });

  it("counts issues correctly", async () => {
    mockSearchReturns([
      { id: "1", properties: { firstname: "Alice" } },
      { id: "2", properties: { firstname: "Bob" } },
    ]);
    const rapport = await runAgent(minimalAgent, { hubspotToken: "test-token" });
    expect(rapport.totalIssues).toBe(2);
  });

  it("calls onIssue for each broken record", async () => {
    mockSearchReturns([
      { id: "1", properties: { firstname: "Alice" } },
      { id: "2", properties: { firstname: "Bob" } },
    ]);
    const issues: Issue[] = [];
    await runAgent(minimalAgent, {
      hubspotToken: "test-token",
      onIssue: (issue) => { issues.push(issue); },
    });
    expect(issues).toHaveLength(2);
    expect(issues[0].objectId).toBe("1");
    expect(issues[0].issueType).toBe("test_missing_email");
    expect(issues[0].severity).toBe("critical");
    expect(issues[0].fixSuggestion).toBe("Add an email");
  });

  it("includes check in rapport output", async () => {
    mockSearchReturns([{ id: "1", properties: { firstname: "Alice" } }]);
    const rapport = await runAgent(minimalAgent, { hubspotToken: "test-token" });
    expect(rapport.checks).toHaveLength(1);
    expect(rapport.checks[0].id).toBe("test_missing_email");
    expect(rapport.checks[0].count).toBe(1);
  });

  it("skips AI summary when no anthropicKey provided", async () => {
    mockSearchReturns([]);
    const rapport = await runAgent(minimalAgent, { hubspotToken: "test-token" });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(rapport.summary).toContain("0 issues");
  });

  it("calls Claude when anthropicKey is provided", async () => {
    mockSearchReturns([]);
    mockClaudeReturns("Everything looks clean.");
    const rapport = await runAgent(minimalAgent, {
      hubspotToken: "test-token",
      anthropicKey: "sk-ant-test",
    });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(rapport.summary).toBe("Everything looks clean.");
  });

  it("falls back to default summary if Claude fails", async () => {
    mockSearchReturns([]);
    mockFetch.mockResolvedValue({ ok: false });
    const rapport = await runAgent(minimalAgent, {
      hubspotToken: "test-token",
      anthropicKey: "sk-ant-test",
    });
    expect(rapport.summary).toContain("issues");
  });

  it("resolves function-based filterGroups fresh each run", async () => {
    const dynamicAgent: AgentDefinition = {
      ...minimalAgent,
      checks: [{
        ...minimalAgent.checks[0],
        filterGroups: () => [{
          filters: [{ propertyName: "hs_lastmodifieddate", operator: "LT", value: String(Date.now()) }],
        }],
      }],
    };
    mockSearchReturns([]);
    await runAgent(dynamicAgent, { hubspotToken: "test-token" });
    expect(mockSearch).toHaveBeenCalled();
    const calledFilters = mockSearch.mock.calls[0][2];
    expect(calledFilters[0].filters[0].propertyName).toBe("hs_lastmodifieddate");
  });

  it("merges dynamic checks from discoverChecks", async () => {
    const agentWithDiscovery: AgentDefinition = {
      ...minimalAgent,
      discoverChecks: async () => [{
        id: "dynamic_check",
        label: "Dynamic check",
        objectType: "contacts",
        filterGroups: [],
        properties: ["email"],
        severity: "info",
        fix: "Fix it",
        getName: (r) => r.id,
      }],
    };
    mockSearchReturns([]);
    const rapport = await runAgent(agentWithDiscovery, { hubspotToken: "test-token" });
    expect(rapport.checks.map(c => c.id)).toContain("dynamic_check");
  });
});

describe("runAgent escalation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs escalation check when base issues exist", async () => {
    const agentWithEscalation: AgentDefinition = {
      name: "test-escalation",
      checks: [{
        id: "missing_email",
        label: "Missing email",
        objectType: "contacts",
        filterGroups: [{ filters: [{ propertyName: "email", operator: "NOT_HAS_PROPERTY" }] }],
        properties: ["email"],
        severity: "warning",
        fix: "Add email",
        getName: (r) => r.id,
        escalateIf: {
          description: "contact has an open deal",
          filterGroups: [{ filters: [
            { propertyName: "email", operator: "NOT_HAS_PROPERTY" },
            { propertyName: "associations.deal", operator: "HAS_PROPERTY" },
          ]}],
          escalatedSeverity: "critical",
        },
      }],
      summaryPrompt: () => "summary",
    };

    // First call: base check returns 2 records
    // Second call: escalation returns 1 record
    mockSearch
      .mockImplementationOnce(async (_t, _o, _f, _p, onBatch) => {
        await onBatch([{ id: "1", properties: {} }, { id: "2", properties: {} }], 2);
        return { total: 2 };
      })
      .mockImplementationOnce(async (_t, _o, _f, _p, onBatch) => {
        await onBatch([{ id: "1", properties: {} }], 1);
        return { total: 1 };
      });

    const issues: Issue[] = [];
    const rapport = await runAgent(agentWithEscalation, {
      hubspotToken: "test-token",
      onIssue: (i) => { issues.push(i); },
    });

    expect(rapport.checks[0].escalatedCount).toBe(1);
    const escalatedIssues = issues.filter(i => i.issueType === "missing_email_escalated");
    expect(escalatedIssues).toHaveLength(1);
    expect(escalatedIssues[0].severity).toBe("critical");
    expect(escalatedIssues[0].fixSuggestion).toContain("URGENT");
  });

  it("skips escalation check when base count is zero", async () => {
    const agentWithEscalation: AgentDefinition = {
      name: "test-no-escalation",
      checks: [{
        id: "missing_email",
        label: "Missing email",
        objectType: "contacts",
        filterGroups: [],
        properties: ["email"],
        severity: "warning",
        fix: "Add email",
        getName: (r) => r.id,
        escalateIf: {
          description: "contact has deal",
          filterGroups: [],
          escalatedSeverity: "critical",
        },
      }],
      summaryPrompt: () => "summary",
    };

    mockSearchReturns([]); // base returns 0
    await runAgent(agentWithEscalation, { hubspotToken: "test-token" });

    // Only one search call (base check) — escalation skipped
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });
});
