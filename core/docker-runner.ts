/**
 * LeClaw — Docker Runner
 *
 * Runs agents in isolated Docker containers for process-level security
 * and resource containment. Each agent gets its own container that:
 *   - Is resource-limited (512 MB RAM, 0.5 CPU)
 *   - Exits cleanly after the agent completes
 *   - Never persists state between runs
 *
 * Falls back to direct in-process execution if Docker is not available.
 *
 * Published image: leclaw/runner:<version>
 * To build locally: npm run docker:build
 * To push:          npm run docker:push
 */

import { spawn, execFileSync } from "child_process";
import type { Rapport } from "./base.js";

// Matches the npm package version — bump together on release
export const DOCKER_IMAGE = "leclaw/runner:0.3.5";

// Per-agent timeout. Generous to allow large HubSpot portals.
const TIMEOUT_MS = 120_000;

// ── Docker availability ───────────────────────────────────────────────────────

let _dockerAvailable: boolean | null = null;

/**
 * Returns true if Docker is installed and the daemon is running.
 * Result is cached after the first call.
 */
export function isDockerAvailable(): boolean {
  if (_dockerAvailable !== null) return _dockerAvailable;
  try {
    execFileSync("docker", ["info"], { stdio: "pipe" });
    _dockerAvailable = true;
  } catch {
    _dockerAvailable = false;
  }
  return _dockerAvailable;
}

// ── Image management ──────────────────────────────────────────────────────────

let _imagePulled = false;

/**
 * Pulls the runner image if it's not already present locally.
 * Called once per CLI session — subsequent calls are no-ops.
 */
export async function ensureImage(onPull?: (image: string) => void): Promise<void> {
  if (_imagePulled) return;

  // Check if the image exists locally
  try {
    execFileSync("docker", ["image", "inspect", DOCKER_IMAGE], { stdio: "pipe" });
    _imagePulled = true;
    return;
  } catch {
    // Not found locally — pull it
  }

  onPull?.(DOCKER_IMAGE);

  await new Promise<void>((resolve, reject) => {
    const pull = spawn("docker", ["pull", DOCKER_IMAGE], { stdio: "inherit" });
    pull.on("close", (code) => {
      if (code === 0) { _imagePulled = true; resolve(); }
      else reject(new Error(`docker pull failed with code ${code}`));
    });
  });
}

// ── Container execution ───────────────────────────────────────────────────────

export interface DockerRunOptions {
  hubspotToken: string;
  anthropicKey?: string;
}

/**
 * Runs a single agent in an isolated Docker container.
 *
 * The container:
 *   - Receives credentials via environment variables
 *   - Is limited to 512 MB RAM and 0.5 CPU cores
 *   - Is removed automatically after it exits
 *   - Has no write access to the host filesystem
 *
 * Returns the Rapport parsed from the container's stdout.
 * Throws if the container exits non-zero or times out.
 */
export async function runAgentInDocker(
  agentName: string,
  opts: DockerRunOptions,
): Promise<Rapport> {
  const args = [
    "run",
    "--rm",                          // clean up after exit
    "--memory", "512m",              // RAM cap
    "--cpus",   "0.5",              // CPU cap
    "--no-new-privileges",           // no privilege escalation
    "-e", `HUBSPOT_TOKEN=${opts.hubspotToken}`,
  ];

  if (opts.anthropicKey) {
    args.push("-e", `ANTHROPIC_API_KEY=${opts.anthropicKey}`);
  }

  args.push(DOCKER_IMAGE, agentName);

  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Agent "${agentName}" timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(stderr.trim() || `Container exited with code ${code}`));
        return;
      }

      const line = stdout.trim();
      try {
        const rapport = JSON.parse(line) as Rapport;
        resolve(rapport);
      } catch {
        reject(new Error(`Invalid output from container: ${line.slice(0, 120)}`));
      }
    });
  });
}
