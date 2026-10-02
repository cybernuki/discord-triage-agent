import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isFresh, isHealthy } from "./heartbeat.js";

describe("heartbeat", () => {
  it("is fresh within the max age and stale beyond it", () => {
    expect(isFresh(1_000, 60_000)).toBe(true);
    expect(isFresh(1_000, 200_000)).toBe(false);
  });

  it("is unhealthy when the file is missing", () => {
    expect(isHealthy(join(tmpdir(), "does-not-exist.heartbeat"))).toBe(false);
  });

  it("is healthy right after the file is written", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hb-"));
    const file = join(dir, "beat");
    writeFileSync(file, "1");
    expect(isHealthy(file)).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
});
