import { describe, expect, it } from "vitest";
import { buildIssueTemplate } from "./issueTemplate.js";

describe("buildIssueTemplate", () => {
  it("pre-fills the report with the original message", () => {
    const t = buildIssueTemplate("The export button does nothing", "high");
    expect(t).toContain("**Summary**");
    expect(t).toContain("> The export button does nothing");
    expect(t).toContain("Urgency: high");
    expect(t).toContain("Steps to reproduce");
    expect(t).toContain("Expected behavior");
  });

  it("quotes every line of a multi-line message", () => {
    const t = buildIssueTemplate("line one\nline two", "low");
    expect(t).toContain("> line one\n> line two");
  });

  it("truncates very long messages", () => {
    const t = buildIssueTemplate("x".repeat(5000), "low");
    expect(t.length).toBeLessThan(1900);
    expect(t).toContain("…");
  });
});
