import { describe, expect, it } from "vitest";
import { formatVersion } from "./version.js";

describe("formatVersion", () => {
  it("formats the version alone", () => {
    expect(formatVersion("0.1.0")).toBe("discord-triage-agent v0.1.0");
  });

  it("appends a short commit when it looks like a git hash", () => {
    expect(formatVersion("0.1.0", "ABCDEF1234567")).toBe("discord-triage-agent v0.1.0 (commit abcdef1)");
  });

  it("ignores a malformed commit", () => {
    expect(formatVersion("0.1.0", "not-a-hash")).toBe("discord-triage-agent v0.1.0");
    expect(formatVersion("0.1.0", "")).toBe("discord-triage-agent v0.1.0");
  });
});
