import { describe, expect, it, vi } from "vitest";
import { createJevClassifier, toJudgment, type SystemOneClient, type TriageAnswers } from "./jevClassifier.js";

const answers = (over: { category?: string; confidence?: number } = {}): TriageAnswers =>
  ({
    category: {
      type: "choice",
      choice: over.category ?? "bug",
      confidence: over.confidence ?? 0.82,
      probabilities: { bug: 0.82, question: 0.1, feature_request: 0.05, other: 0.03 },
    },
    urgency: { type: "score", score: 1.6, confidence: 0.7, legend: {}, probabilities: {} },
    needs_human: { type: "noul", noul: 0.12 },
  }) as unknown as TriageAnswers;

describe("toJudgment", () => {
  it("maps Jev answers into the domain judgment", () => {
    expect(toJudgment(answers())).toEqual({
      category: "bug",
      categoryConfidence: 0.82,
      urgencyScore: 1.6,
      urgencyConfidence: 0.7,
      needsHumanProbability: 0.12,
    });
  });

  it("rejects a category outside the known set", () => {
    expect(() => toJudgment(answers({ category: "banana" }))).toThrow(/unknown category/);
  });
});

describe("createJevClassifier", () => {
  it("sends the message as state with all three questions in one request", async () => {
    const systemOne = vi.fn(async () => ({ answers: answers() }));
    const client: SystemOneClient = { systemOne };

    const judgment = await createJevClassifier(client).classify("the export is broken");

    expect(judgment.category).toBe("bug");
    expect(systemOne).toHaveBeenCalledTimes(1);
    const request = (systemOne.mock.calls as unknown as [{ state: unknown; questions: Record<string, unknown> }][])[0]![0];
    expect(request.state).toEqual({ message: "the export is broken" });
    expect(Object.keys(request.questions)).toEqual(["category", "urgency", "needs_human"]);
  });

  it("propagates transport errors so the service can degrade", async () => {
    const client: SystemOneClient = { systemOne: () => Promise.reject(new Error("timeout")) };
    await expect(createJevClassifier(client).classify("x")).rejects.toThrow("timeout");
  });
});
