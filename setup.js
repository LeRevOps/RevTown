#!/usr/bin/env node
/**
 * LeClaw Setup Wizard
 * Run: npx leclaw setup
 */

import readline from "readline";
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const askSecret = (question) =>
  new Promise((resolve) => {
    process.stdout.write(question);
    let value = "";
    const onData = (char) => {
      char = char.toString();
      if (char === "\n" || char === "\r" || char === "\u0004") {
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value.trim());
      } else if (char === "\u0003") {
        process.exit();
      } else if (char === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + "*".repeat(value.length));
        }
      } else {
        value += char;
        process.stdout.write("*");
      }
    };
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", onData);
    } else {
      rl.question(question, resolve);
    }
  });

const dim    = (s) => `\x1b[2m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

function openBrowser(url) {
  try {
    const cmd = process.platform === "win32" ? `start "" "${url}"` :
                process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function testHubSpot(token) {
  try {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filterGroups: [], limit: 1 }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const data = await res.json();
    return { ok: true, count: data.total };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testAnthropic(key) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function testSlack(webhook) {
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "🦀 LeClaw connected successfully." }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log();
  console.log(cyan("┌─────────────────────────────────────────────────┐"));
  console.log(cyan("│") + bold("  LeClaw · Setup                                 ") + cyan("│"));
  console.log(cyan("│") + dim("  connect your CRM and AI in under 2 minutes     ") + cyan("│"));
  console.log(cyan("└─────────────────────────────────────────────────┘"));
  console.log();

  const env = {};

  // ── STEP 1: HubSpot ──────────────────────────────────────────────────────────

  console.log(bold("Step 1 of 3 — Connect HubSpot"));
  console.log();
  console.log("  LeClaw needs a HubSpot Private App token to read your CRM.");
  console.log("  Here's how to create one:");
  console.log();
  console.log(`  ${cyan("1.")} Opening HubSpot in your browser...`);
  console.log(`  ${cyan("2.")} Click ${bold('"Create private app"')}`);
  console.log(`  ${cyan("3.")} Give it any name — e.g. ${dim('"LeClaw"')}`);
  console.log(`  ${cyan("4.")} Go to the ${bold("Scopes")} tab, search for ${yellow("crm")} and enable:`);
  console.log();
  console.log(`       ${yellow("CRM")} ${dim("— covers contacts, companies, deals, and more")}`);
  console.log();
  console.log(`  ${cyan("5.")} Click ${bold('"Create app"')} then copy the token`);
  console.log();

  const hubspotUrl = "https://app.hubspot.com/private-apps";
  const opened = openBrowser(hubspotUrl);
  if (opened) {
    console.log(dim(`  Opened: ${hubspotUrl}`));
  } else {
    console.log(dim(`  Open this URL in your browser:`));
    console.log(dim(`  ${hubspotUrl}`));
  }
  console.log();

  let hubspotConnected = false;
  while (!hubspotConnected) {
    const token = await askSecret("  Paste your HubSpot token: ");
    if (!token) {
      console.log(dim("  Skipped — you can add HUBSPOT_TOKEN to .env later\n"));
      break;
    }

    process.stdout.write("  Verifying... ");
    const result = await testHubSpot(token);

    if (result.ok) {
      console.log(green(`✓ Connected — ${Number(result.count ?? 0).toLocaleString()} contacts`));
      env.HUBSPOT_TOKEN = token;
      hubspotConnected = true;
    } else {
      console.log(red(`✗ Failed — ${result.error}`));
      console.log();
      console.log("  Common issues:");
      console.log(dim("  · Token copied incorrectly — make sure you copied the full token"));
      console.log(dim("  · Missing scopes — check that all 3 scopes above are enabled"));
      console.log(dim("  · Wrong account — make sure you're in the right HubSpot portal"));
      console.log();
      const retry = await ask("  Try again? (y/n): ");
      if (retry.trim().toLowerCase() !== "y") {
        console.log(dim("  Skipped — add HUBSPOT_TOKEN to .env manually later\n"));
        break;
      }
      console.log();
    }
  }

  console.log();

  // ── STEP 2: Anthropic ────────────────────────────────────────────────────────

  console.log(bold("Step 2 of 3 — Connect AI (Anthropic)"));
  console.log();
  console.log("  LeClaw uses Claude to summarize findings and answer questions.");
  console.log();
  console.log(`  ${cyan("1.")} Opening Anthropic Console in your browser...`);
  console.log(`  ${cyan("2.")} Click ${bold('"Create API Key"')}`);
  console.log(`  ${cyan("3.")} Copy the key`);
  console.log();

  const anthropicUrl = "https://console.anthropic.com/settings/keys";
  const openedAnthropic = openBrowser(anthropicUrl);
  if (openedAnthropic) {
    console.log(dim(`  Opened: ${anthropicUrl}`));
  } else {
    console.log(dim(`  Open this URL in your browser:`));
    console.log(dim(`  ${anthropicUrl}`));
  }
  console.log();

  let anthropicConnected = false;
  while (!anthropicConnected) {
    const key = await askSecret("  Paste your Anthropic API key: ");
    if (!key) {
      console.log(dim("  Skipped — you can add ANTHROPIC_API_KEY to .env later\n"));
      break;
    }

    process.stdout.write("  Verifying... ");
    const result = await testAnthropic(key);

    if (result.ok) {
      console.log(green("✓ Connected"));
      env.ANTHROPIC_API_KEY = key;
      anthropicConnected = true;
    } else {
      console.log(red("✗ Failed — key may be invalid or have no credits"));
      const retry = await ask("  Try again? (y/n): ");
      if (retry.trim().toLowerCase() !== "y") {
        console.log(dim("  Skipped — add ANTHROPIC_API_KEY to .env manually later\n"));
        break;
      }
      console.log();
    }
  }

  console.log();

  // ── STEP 3: Slack (optional) ─────────────────────────────────────────────────

  console.log(bold("Step 3 of 3 — Connect Slack") + dim(" (optional)"));
  console.log();

  const slackAnswer = await ask("  Get agent reports in Slack? (y/n): ");

  if (slackAnswer.trim().toLowerCase() === "y") {
    console.log();
    console.log(`  ${cyan("1.")} Opening Slack API in your browser...`);
    console.log(`  ${cyan("2.")} Create or select an app → Incoming Webhooks → Add New Webhook`);
    console.log(`  ${cyan("3.")} Choose a channel and copy the webhook URL`);
    console.log();

    const slackUrl = "https://api.slack.com/apps";
    const openedSlack = openBrowser(slackUrl);
    if (openedSlack) {
      console.log(dim(`  Opened: ${slackUrl}`));
    } else {
      console.log(dim(`  Open this URL: ${slackUrl}`));
    }
    console.log();

    const webhook = await askSecret("  Paste your Slack webhook URL: ");
    if (webhook) {
      process.stdout.write("  Sending test message... ");
      const result = await testSlack(webhook);
      if (result.ok) {
        console.log(green("✓ Test message sent — check your Slack channel"));
        env.SLACK_WEBHOOK_URL = webhook;
      } else {
        console.log(red("✗ Failed — check your webhook URL"));
        console.log(dim("  You can add SLACK_WEBHOOK_URL to .env manually later"));
      }
    }
  } else {
    console.log(dim("  Skipped — add SLACK_WEBHOOK_URL to .env later if needed"));
  }

  console.log();

  // ── WRITE .ENV ───────────────────────────────────────────────────────────────

  if (Object.keys(env).length === 0) {
    console.log(yellow("No credentials saved — .env not created."));
    console.log(dim("Run npx leclaw setup again when you're ready.\n"));
    rl.close();
    return;
  }

  const envPath = path.join(process.cwd(), ".env");
  const envContent = Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";

  if (fs.existsSync(envPath)) {
    const overwrite = await ask(".env already exists. Overwrite? (y/n): ");
    if (overwrite.trim().toLowerCase() !== "y") {
      console.log(dim("\nSetup cancelled — existing .env kept.\n"));
      rl.close();
      return;
    }
  }

  fs.writeFileSync(envPath, envContent);

  // ── DONE ─────────────────────────────────────────────────────────────────────

  console.log();
  console.log(cyan("┌─────────────────────────────────────────────────┐"));
  console.log(cyan("│") + green("  ✓ Setup complete                                ") + cyan("│"));
  console.log(cyan("└─────────────────────────────────────────────────┘"));
  console.log();

  const saved = Object.keys(env).join(", ");
  console.log(dim(`  Saved: ${saved}`));
  console.log();

  rl.close();

  // Launch Le Directeur immediately
  if (env.HUBSPOT_TOKEN && env.ANTHROPIC_API_KEY) {
    console.log("  Starting Le Directeur...");
    console.log();
    const cliPath = new URL("cli/index.js", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
    const child = spawn(process.execPath, [cliPath], { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("exit", (code) => process.exit(code ?? 0));
  } else {
    console.log(`  Run ${cyan("npx leclaw")} when you're ready.\n`);
  }
}

main().catch((err) => {
  console.error(red("\nSetup error: " + err.message));
  rl.close();
  process.exit(1);
});
