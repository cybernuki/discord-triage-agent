import { describe, expect, it } from "vitest";
import { decideActions } from "./router.js";
import type { TriageResult } from "./types.js";

const result = (over: Partial<TriageResult> = {}): TriageResult => ({
  category: "other",
  rawCategory: "other",
  confidence: 0.9,
  urgency: "medium",
  needsHuman: false,
  needsHumanProbability: 0.1,
  reasons: [],
  ...over,
});

const types = (r: TriageResult, answerAgentEnabled: boolean) =>
  decideActions(r, { answerAgentEnabled }).map((a) => a.type);

describe("decideActions", () => {
  it("always starts with the summary", () => {
    expect(types(result(), false)[0]).toBe("post_summary");
  });

  it("drafts an answer for a confident question when the agent is on", () => {
    expect(types(result({ category: "question" }), true)).toEqual(["post_summary", "draft_answer"]);
  });

  it("does not draft an answer when the agent is off", () => {
    expect(types(result({ category: "question" }), false)).toEqual(["post_summary"]);
  });

  it("never drafts an answer when a human is needed, and flags instead", () => {
    expect(types(result({ category: "question", needsHuman: true }), true)).toEqual(["post_summary", "flag_for_human"]);
  });

  it("offers the issue template for bugs", () => {
    expect(types(result({ category: "bug" }), true)).toEqual(["post_summary", "offer_issue_template"]);
  });

  it("offers the template and flags a bug that also needs a human", () => {
    expect(types(result({ category: "bug", needsHuman: true }), false)).toEqual([
      "post_summary",
      "offer_issue_template",
      "flag_for_human",
    ]);
  });

  it("only summarizes feature requests", () => {
    expect(types(result({ category: "feature_request" }), true)).toEqual(["post_summary"]);
  });

  it("flags 'other' only when a human is needed", () => {
    expect(types(result({ category: "other", needsHuman: true }), true)).toEqual(["post_summary", "flag_for_human"]);
  });
});
