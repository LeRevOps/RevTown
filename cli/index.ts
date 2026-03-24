/**
 * LeClaw — Le Directeur CLI
 *
 * Interactive REPL. Run with: npx leclaw
 *
 * Required env vars:
 *   HUBSPOT_TOKEN       HubSpot private app token
 *   ANTHROPIC_API_KEY   Anthropic API key
 */

import * as readline from "readline";
import * as dotenv from "dotenv";
import { runAgent, callClaude } from "../core/base.js";
import { agentRegistry } from "../core/registry.js";
import { routeQuestion } from "../core/routing.js";
import {
  buildSynthesisPrompt,
  buildSynthesisPromptNoData,
} from "../core/synthesis.js";
import type { RapportSummary } from "../core/synthesis.js";
import type { Rapport } from "../core/base.js";

dotenv.config();

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const C = {
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  dim:    "\x1b[2m",
  bold:   "\x1b[1m",
  reset:  "\x1b[0m",
};

function cyan(s: string)   { return `${C.cyan}${s}${C.reset}`; }
function green(s: string)  { return `${C.green}${s}${C.reset}`; }
function yellow(s: string) { return `${C.yellow}${s}${C.reset}`; }
function dim(s: string)    { return `${C.dim}${s}${C.reset}`; }
function bold(s: string)   { return `${C.bold}${s}${C.reset}`; }

// ── Word wrap ─────────────────────────────────────────────────────────────────

function wordWrap(text: string, width = 60): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines.join("\n");
}

// ── HubSpot account info ──────────────────────────────────────────────────────

interface AccountInfo {
  contactCount: string;
  dealCount: string;
}

async function fetchAccountInfo(token: string): Promise<AccountInfo> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const [contactRes, dealRes] = await Promise.all([
    fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", { headers }),
    fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=1", { headers }),
  ]);

  let contactCount = "?";
  let dealCount = "?";

  if (contactRes.ok) {
    const data = await contactRes.json();
    contactCount = String(data.total ?? "?");
  }
  if (dealRes.ok) {
    const data = await dealRes.json();
    dealCount = String(data.total ?? "?");
  }

  return { contactCount, dealCount };
}

// ── Rapport → RapportSummary ──────────────────────────────────────────────────

function toRapportSummary(rapport: Rapport): RapportSummary {
  return {
    agentName: rapport.agentName,
    score: rapport.score,
    totalIssues: rapport.totalIssues,
    summary: rapport.summary,
    topChecks: rapport.checks.map((c) => ({
      label: c.label,
      count: c.count,
      severity: c.severity,
    })),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Load env and validate
  const hubspotToken = process.env.HUBSPOT_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!hubspotToken) {
    console.error(
      "\x1b[31mError:\x1b[0m HUBSPOT_TOKEN is not set.\n" +
      "Add it to your .env file or export it in your shell:\n\n" +
      "  export HUBSPOT_TOKEN=pat-na1-...\n"
    );
    process.exit(1);
  }

  if (!anthropicKey) {
    console.error(
      "\x1b[31mError:\x1b[0m ANTHROPIC_API_KEY is not set.\n" +
      "Add it to your .env file or export it in your shell:\n\n" +
      "  export ANTHROPIC_API_KEY=sk-ant-...\n"
    );
    process.exit(1);
  }

  // 2. Fetch account info
  let accountInfo: AccountInfo = { contactCount: "?", dealCount: "?" };
  try {
    accountInfo = await fetchAccountInfo(hubspotToken);
  } catch {
    // Non-fatal — we'll show ? in the header
  }

  // 3. Print welcome header
  console.log();
  console.log(cyan("┌─────────────────────────────────────────────────┐"));
  console.log(cyan("│") + bold("  LeClaw · Le Directeur                          ") + cyan("│"));
  console.log(cyan("│") + dim("  orchestrateur · posez une question             ") + cyan("│"));
  console.log(cyan("└─────────────────────────────────────────────────┘"));
  console.log();
  console.log(
    green("Connecté à HubSpot") +
    dim(` · ${accountInfo.contactCount} contacts · ${accountInfo.dealCount} deals`)
  );
  console.log();
  console.log(dim("Type a question or \"exit\" to quit."));
  console.log();

  // 4. Start readline REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const prompt = () => {
    rl.question(cyan("> "), async (input) => {
      const trimmed = input.trim();

      // Exit
      if (trimmed === "exit" || trimmed === "quit") {
        console.log("\n" + dim("Au revoir.") + "\n");
        rl.close();
        process.exit(0);
        return;
      }

      // Empty input — re-prompt
      if (!trimmed) {
        prompt();
        return;
      }

      // Route question
      const agentNames = routeQuestion(trimmed);

      console.log("\n" + bold("Le Directeur dispatche les agents..."));
      console.log();

      // Print agent placeholders
      const agentLines: string[] = agentNames.map(
        (name) => `  ${dim("↳")} ${cyan(name)}    ${dim("running...")}`
      );
      agentLines.forEach((line) => console.log(line));

      // Run agents sequentially, overwrite each line on completion
      const rapports: Rapport[] = [];
      const cursorUp = (n: number) => process.stdout.write(`\x1b[${n}A`);

      for (let i = 0; i < agentNames.length; i++) {
        const agentName = agentNames[i];
        const agent = agentRegistry[agentName];

        let rapport: Rapport | null = null;

        try {
          rapport = await runAgent(agent, {
            hubspotToken,
            anthropicKey,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          // Move cursor to the right line and overwrite
          const linesFromBottom = agentNames.length - i;
          cursorUp(linesFromBottom);
          process.stdout.write(
            `\r  ${dim("↳")} ${cyan(agentName)}    ${yellow("! error: " + message.slice(0, 50))}\n`
          );
          // Move cursor back to bottom
          process.stdout.write(`\x1b[${linesFromBottom - 1}B`);
        }

        if (!rapport) continue;

        rapports.push(rapport);

        // Overwrite this agent's status line
        const linesFromBottom = agentNames.length - i;
        cursorUp(linesFromBottom);
        process.stdout.write(
          `\r  ${dim("↳")} ${cyan(agentName)}    ` +
          green(`\u2713 ${rapport.score}/100`) +
          dim(` \u00B7 ${rapport.totalIssues} issues`) +
          "\n"
        );
        // Move cursor back to the bottom line
        process.stdout.write(`\x1b[${linesFromBottom - 1}B`);
      }

      console.log();

      if (rapports.length === 0) {
        console.log(dim("No agents completed successfully."));
        console.log();
        prompt();
        return;
      }

      // Build rapport summaries
      const summaries: RapportSummary[] = rapports.map(toRapportSummary);
      const totalIssues = summaries.reduce((sum, r) => sum + r.totalIssues, 0);

      // Choose prompt based on whether issues were found
      const synthesisPrompt =
        totalIssues === 0
          ? buildSynthesisPromptNoData(trimmed)
          : buildSynthesisPrompt(trimmed, summaries);

      // Call Sonnet for synthesis
      let synthesis: string | null = null;
      try {
        synthesis = await callClaude(synthesisPrompt, anthropicKey, {
          model: "claude-sonnet-4-6",
          maxTokens: 600,
        });
      } catch {
        synthesis = "Le Directeur encountered an error during synthesis.";
      }

      // Print synthesis block
      const agentScoreLine = rapports
        .map((r) => `${dim(r.agentName)} (${r.score}/100)`)
        .join(dim(" · "));

      console.log();
      console.log(bold("Le Directeur · synthèse"));
      console.log(dim("─".repeat(48)));
      console.log();
      if (synthesis) {
        console.log(wordWrap(synthesis, 60));
      }
      console.log();
      console.log(dim("Agents: ") + agentScoreLine);
      console.log();

      prompt();
    });
  };

  prompt();
}

main().catch((err) => {
  console.error("\x1b[31mFatal error:\x1b[0m", err instanceof Error ? err.message : err);
  process.exit(1);
});
