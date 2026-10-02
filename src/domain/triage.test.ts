import { describe, expect, it } from "vitest";
import { resolveTriage, unavailableTriage } from "./triage.js";
import type { TriageJudgment } from "./types.js";

const judgment = (over: Partial<TriageJudgment> = {}): TriageJudgment => ({
  category: "bug",
  categoryConfidence: 0.9,
  urgencyScore: 1,
  urgencyConfidence: 0.9,
  needsHumanProbability: 0.1,
  ...over,
});

describe("resolveTriage", () => {
  it("keeps the category when confidence clears the threshold", () => {
    const r = resolveTriage(judgment(), 0.6);
    expect(r.category).toBe("bug");
    expect(r.rawCategory).toBe("bug");
    expect(r.needsHuman).toBe(false);
    expect(r.reasons).toEqual([]);
  });

  it("accepts a confidence exactly equal to the threshold", () => {
    expect(resolveTriage(judgment({ categoryConfidence: 0.6 }), 0.6).category).toBe("bug");
  });

  it("falls back to 'other' and needs-human below the threshold, keeping the raw pick", () => {
    const r = resolveTriage(judgment({ category: "question", categoryConfidence: 0.59 }), 0.6);
    expect(r.category).toBe("other");
    expect(r.rawCategory).toBe("question");
    expect(r.needsHuman).toBe(true);
    expect(r.reasons).toContain("low_confidence");
  });

  it("flags for a human when the classifier says so, without changing the category", () => {
    const r = resolveTriage(judgment({ needsHumanProbability: 0.5 }), 0.6);
    expect(r.category).toBe("bug");
    expect(r.needsHuman).toBe(true);
    expect(r.reasons).toEqual(["flagged_by_classifier"]);
  });

  it("does not flag just under 0.5", () => {
    expect(resolveTriage(judgment({ needsHumanProbability: 0.49 }), 0.6).needsHuman).toBe(false);
  });

  it("can report both reasons at once", () => {
    const r = resolveTriage(judgment({ categoryConfidence: 0.2, needsHumanProbability: 0.9 }), 0.6);
    expect(r.reasons).toEqual(["low_confidence", "flagged_by_classifier"]);
  });

  it.each([
    [0, "low"],
    [0.49, "low"],
    [0.5, "medium"],
    [1, "medium"],
    [1.49, "medium"],
    [1.5, "high"],
    [2, "high"],
  ] as const)("maps urgency score %s to %s", (urgencyScore, expected) => {
    expect(resolveTriage(judgment({ urgencyScore }), 0.6).urgency).toBe(expected);
  });

  it("defaults to medium urgency when urgency confidence is below the threshold", () => {
    expect(resolveTriage(judgment({ urgencyScore: 2, urgencyConfidence: 0.3 }), 0.6).urgency).toBe("medium");
  });

  it("clamps out-of-range scores instead of throwing", () => {
    expect(resolveTriage(judgment({ urgencyScore: 7 }), 0.6).urgency).toBe("high");
    expect(resolveTriage(judgment({ urgencyScore: -3 }), 0.6).urgency).toBe("low");
  });

  it.each([-0.1, 1.1, Number.NaN])("rejects an invalid threshold (%s)", (t) => {
    expect(() => resolveTriage(judgment(), t)).toThrow(RangeError);
  });
});

describe("unavailableTriage", () => {
  it("degrades to a human hand-off", () => {
    const r = unavailableTriage();
    expect(r.category).toBe("other");
    expect(r.needsHuman).toBe(true);
    expect(r.reasons).toEqual(["classifier_unavailable"]);
  });
});
