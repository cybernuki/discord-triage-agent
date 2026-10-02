import { describe, expect, it } from "vitest";
import { buildAnswerEmbed, buildDryRunEmbed, buildSummaryEmbed, issueTemplateMessage } from "./embeds.js";
import type { TriageResult } from "../../domain/types.js";

const result = (over: Partial<TriageResult> = {}): TriageResult => ({
  category: "bug",
  rawCategory: "bug",
  confidence: 0.834,
  urgency: "high",
  needsHuman: false,
  needsHumanProbability: 0.12,
  reasons: [],
  ...over,
});

describe("embeds", () => {
  it("summarizes category, urgency, confidence and human need", () => {
    const e = buildSummaryEmbed(result());
    expect(e.title).toBe("Triage: Bug");
    expect(e.fields).toEqual([
      { name: "Urgency", value: "high", inline: true },
      { name: "Confidence", value: "83%", inline: true },
      { name: "Needs a human", value: "No", inline: true },
    ]);
    expect(e.footer).toBeUndefined();
  });

  it("explains why a human is needed", () => {
    const e = buildSummaryEmbed(result({ needsHuman: true, reasons: ["low_confidence"] }));
    expect(e.footer?.text).toMatch(/below the threshold/);
  });

  it("dry run exposes the raw category and the threshold", () => {
    const e = buildDryRunEmbed(result({ category: "other", rawCategory: "question" }), 0.6);
    const names = Object.fromEntries((e.fields ?? []).map((f) => [f.name, f.value]));
    expect(names["Raw category"]).toBe("Question");
    expect(names["Threshold"]).toBe("60%");
  });

  it("truncates oversized answers to fit an embed", () => {
    expect(buildAnswerEmbed("x".repeat(5000)).description?.length).toBeLessThanOrEqual(3901);
  });

  it("wraps the issue template in a code block", () => {
    expect(issueTemplateMessage("**Summary**")).toContain("```md\n**Summary**\n```");
  });
});
