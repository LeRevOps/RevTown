#!/usr/bin/env node
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
import { buildSynthesisPrompt, buildSynthesisPromptNoData, } from "../core/synthesis.js";
import { isDockerAvailable, ensureImage, runAgentInDocker, } from "../core/docker-runner.js";
dotenv.config();
// ── Setup subcommand ──────────────────────────────────────────────────────────
if (process.argv[2] === "setup") {
    const { spawn } = await import("child_process");
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const setupPath = new URL("../setup.js", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
    const child = spawn(process.execPath, [setupPath], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code ?? 0));
    // Wait for child to finish — don't fall through to main CLI
    await new Promise(() => { });
}
// ── ANSI helpers ──────────────────────────────────────────────────────────────
const C = {
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    reset: "\x1b[0m",
};
function cyan(s) { return `${C.cyan}${s}${C.reset}`; }
function green(s) { return `${C.green}${s}${C.reset}`; }
function yellow(s) { return `${C.yellow}${s}${C.reset}`; }
function dim(s) { return `${C.dim}${s}${C.reset}`; }
function bold(s) { return `${C.bold}${s}${C.reset}`; }
// ── Word wrap ─────────────────────────────────────────────────────────────────
function wordWrap(text, width = 60) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
        if (current.length === 0) {
            current = word;
        }
        else if (current.length + 1 + word.length <= width) {
            current += " " + word;
        }
        else {
            lines.push(current);
            current = word;
        }
    }
    if (current)
        lines.push(current);
    return lines.join("\n");
}
async function fetchAccountInfo(token) {
    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
    const body = JSON.stringify({ filterGroups: [], limit: 1 });
    const [contactRes, dealRes] = await Promise.all([
        fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", { method: "POST", headers, body }),
        fetch("https://api.hubapi.com/crm/v3/objects/deals/search", { method: "POST", headers, body }),
    ]);
    let contactCount = "?";
    let dealCount = "?";
    if (contactRes.ok) {
        const data = await contactRes.json();
        contactCount = Number(data.total ?? 0).toLocaleString();
    }
    if (dealRes.ok) {
        const data = await dealRes.json();
        dealCount = Number(data.total ?? 0).toLocaleString();
    }
    return { contactCount, dealCount };
}
// ── Rapport → RapportSummary ──────────────────────────────────────────────────
function toRapportSummary(rapport) {
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
    const useDocker = isDockerAvailable();
    if (!hubspotToken) {
        console.error("\x1b[31mError:\x1b[0m HUBSPOT_TOKEN is not set.\n\n" +
            "First time? Run the setup wizard:\n\n" +
            "  \x1b[36mnpx leclaw setup\x1b[0m\n\n" +
            "Or add it manually to your .env file:\n\n" +
            "  HUBSPOT_TOKEN=pat-na1-...\n\n" +
            "\x1b[2mCreate a HubSpot private app at:\n" +
            "  app.hubspot.com → Settings → Integrations → Private Apps\x1b[0m\n");
        process.exit(1);
    }
    if (!anthropicKey) {
        console.error("\x1b[31mError:\x1b[0m ANTHROPIC_API_KEY is not set.\n\n" +
            "First time? Run the setup wizard:\n\n" +
            "  \x1b[36mnpx leclaw setup\x1b[0m\n\n" +
            "Or add it manually to your .env file:\n\n" +
            "  ANTHROPIC_API_KEY=sk-ant-...\n\n" +
            "\x1b[2mGet your key at: console.anthropic.com\x1b[0m\n");
        process.exit(1);
    }
    // 2. Fetch account info
    let accountInfo = { contactCount: "?", dealCount: "?" };
    try {
        accountInfo = await fetchAccountInfo(hubspotToken);
    }
    catch {
        // Non-fatal — we'll show ? in the header
    }
    // 3. Ensure Docker image is ready (non-blocking pull if needed)
    if (useDocker) {
        try {
            await ensureImage((image) => {
                console.log(dim(`Pulling Docker image ${image} (first run only)...`));
            });
        }
        catch {
            // Pull failed — we'll fall back to direct execution silently
        }
    }
    // 4. Print welcome header
    const dockerBadge = useDocker ? dim(" · 🐳 Docker") : "";
    console.log();
    console.log(cyan("┌─────────────────────────────────────────────────┐"));
    console.log(cyan("│") + bold("  Revtown · Le Directeur                         ") + cyan("│"));
    console.log(cyan("│") + dim("  orchestrateur · posez une question             ") + cyan("│"));
    console.log(cyan("└─────────────────────────────────────────────────┘"));
    console.log();
    console.log(green("Connecté à HubSpot") +
        dim(` · ${accountInfo.contactCount} contacts · ${accountInfo.dealCount} deals`) +
        dockerBadge);
    console.log();
    console.log(dim("Type a question or \"exit\" to quit."));
    console.log();
    // 5. Start readline REPL
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
            const dockerLabel = useDocker ? dim(" 🐳") : "";
            const agentLines = agentNames.map((name) => `  ${dim("↳")} ${cyan(name)}${dockerLabel}    ${dim("running...")}`);
            agentLines.forEach((line) => console.log(line));
            // Run agents sequentially, overwrite each line on completion
            const rapports = [];
            const cursorUp = (n) => process.stdout.write(`\x1b[${n}A`);
            for (let i = 0; i < agentNames.length; i++) {
                const agentName = agentNames[i];
                const agent = agentRegistry[agentName];
                let rapport = null;
                try {
                    if (useDocker) {
                        rapport = await runAgentInDocker(agentName, { hubspotToken, anthropicKey });
                    }
                    else {
                        rapport = await runAgent(agent, { hubspotToken, anthropicKey });
                    }
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    // Move cursor to the right line and overwrite
                    const linesFromBottom = agentNames.length - i;
                    cursorUp(linesFromBottom);
                    process.stdout.write(`\r  ${dim("↳")} ${cyan(agentName)}${dockerLabel}    ${yellow("! error: " + message.slice(0, 50))}\n`);
                    // Move cursor back to bottom
                    process.stdout.write(`\x1b[${linesFromBottom - 1}B`);
                }
                if (!rapport)
                    continue;
                rapports.push(rapport);
                // Overwrite this agent's status line
                const linesFromBottom = agentNames.length - i;
                cursorUp(linesFromBottom);
                process.stdout.write(`\r  ${dim("↳")} ${cyan(agentName)}${dockerLabel}    ` +
                    green(`\u2713 ${rapport.score}/100`) +
                    dim(` \u00B7 ${rapport.totalIssues} issues`) +
                    "\n");
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
            const summaries = rapports.map(toRapportSummary);
            const totalIssues = summaries.reduce((sum, r) => sum + r.totalIssues, 0);
            // Choose prompt based on whether issues were found
            const synthesisPrompt = totalIssues === 0
                ? buildSynthesisPromptNoData(trimmed)
                : buildSynthesisPrompt(trimmed, summaries);
            // Call Sonnet for synthesis
            let synthesis = null;
            try {
                synthesis = await callClaude(synthesisPrompt, anthropicKey, {
                    model: "claude-sonnet-4-6",
                    maxTokens: 600,
                });
            }
            catch {
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
