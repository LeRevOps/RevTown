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
import type { Rapport } from "./base.js";
export declare const DOCKER_IMAGE = "leclaw/runner:0.3.5";
/**
 * Returns true if Docker is installed and the daemon is running.
 * Result is cached after the first call.
 */
export declare function isDockerAvailable(): boolean;
/**
 * Pulls the runner image if it's not already present locally.
 * Called once per CLI session — subsequent calls are no-ops.
 */
export declare function ensureImage(onPull?: (image: string) => void): Promise<void>;
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
export declare function runAgentInDocker(agentName: string, opts: DockerRunOptions): Promise<Rapport>;
