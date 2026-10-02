import { statSync, writeFileSync } from "node:fs";

export const HEARTBEAT_FILE = process.env["HEARTBEAT_FILE"] ?? "/tmp/triage-agent.heartbeat";
const MAX_AGE_MS = 90_000;
const INTERVAL_MS = 30_000;

/** True when the heartbeat file was touched recently enough to call the process healthy. */
export function isFresh(mtimeMs: number, nowMs: number, maxAgeMs = MAX_AGE_MS): boolean {
  return nowMs - mtimeMs <= maxAgeMs;
}

export function isHealthy(file = HEARTBEAT_FILE, nowMs = Date.now()): boolean {
  try {
    return isFresh(statSync(file).mtimeMs, nowMs);
  } catch {
    return false;
  }
}

/** Touches the file while `isReady()` holds. Docker's HEALTHCHECK reads it via `healthcheck.js`. */
export function startHeartbeat(isReady: () => boolean, file = HEARTBEAT_FILE): NodeJS.Timeout {
  const beat = (): void => {
    if (isReady()) writeFileSync(file, String(Date.now()));
  };
  beat();
  const timer = setInterval(beat, INTERVAL_MS);
  timer.unref();
  return timer;
}
