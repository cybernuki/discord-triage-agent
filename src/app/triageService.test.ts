import { describe, expect, it, vi } from "vitest";
import { createTriageService } from "./triageService.js";
import type { Answerer, Classifier, KnowledgeBase } from "../domain/ports.js";
import type { TriageJudgment } from "../domain/types.js";

const judgment = (over: Partial<TriageJudgment> = {}): TriageJudgment => ({
  category: "question",
  categoryConfidence: 0.95,
  urgencyScore: 0.2,
  urgencyConfidence: 0.9,
  needsHumanProbability: 0.05,
  ...over,
});

const knowledge: KnowledgeBase = {
  load: async () => [
    { source: "faq.md", title: "Reset password", body: "Use the forgot password link." },
    { source: "faq.md", title: "Refunds", body: "Five business days." },
  ],
};

const classifierReturning = (j: TriageJudgment): Classifier => ({ classify: async () => j });

describe("triage service", () => {
  it("drafts an answer from the selected FAQ sections for a confident question", async () => {
    const answerer: Answerer = { answer: vi.fn(async () => "Use the forgot password link.") };
    const service = createTriageService({ classifier: classifierReturning(judgment()), knowledge, answerer, threshold: 0.6 });

    const outcome = await service.handle("How do I reset my password?");

    expect(outcome.actions.map((a) => a.type)).toEqual(["post_summary", "draft_answer"]);
    expect(outcome.answer).toBe("Use the forgot password link.");
    expect(answerer.answer).toHaveBeenCalledWith("How do I reset my password?", [
      expect.objectContaining({ title: "Reset password" }),
    ]);
  });

  it("does not call the answerer when the agent is off", async () => {
    const service = createTriageService({ classifier: classifierReturning(judgment()), knowledge, threshold: 0.6 });
    const outcome = await service.handle("How do I reset my password?");
    expect(outcome.actions.map((a) => a.type)).toEqual(["post_summary"]);
    expect(outcome.answer).toBeUndefined();
  });

  it("builds the issue template for a bug", async () => {
    const service = createTriageService({
      classifier: classifierReturning(judgment({ category: "bug", urgencyScore: 2 })),
      knowledge,
      threshold: 0.6,
    });
    const outcome = await service.handle("Export crashes");
    expect(outcome.actions.map((a) => a.type)).toContain("offer_issue_template");
    expect(outcome.issueTemplate).toContain("> Export crashes");
    expect(outcome.issueTemplate).toContain("Urgency: high");
  });

  it("falls back to a human hand-off when the classifier fails", async () => {
    const classifier: Classifier = { classify: async () => { throw new Error("network down"); } };
    const outcome = await createTriageService({ classifier, knowledge, threshold: 0.6 }).handle("hello");
    expect(outcome.result.reasons).toEqual(["classifier_unavailable"]);
    expect(outcome.actions.map((a) => a.type)).toEqual(["post_summary", "flag_for_human"]);
  });

  it("flags for a human when the answerer fails, instead of dropping the question", async () => {
    const answerer: Answerer = { answer: async () => { throw new Error("throttled"); } };
    const service = createTriageService({ classifier: classifierReturning(judgment()), knowledge, answerer, threshold: 0.6 });
    const outcome = await service.handle("How do I reset my password?");
    expect(outcome.answer).toBeUndefined();
    expect(outcome.actions.map((a) => a.type)).toEqual(["post_summary", "flag_for_human"]);
  });

  it("dryRun classifies without side effects or answers", async () => {
    const answerer: Answerer = { answer: vi.fn(async () => "x") };
    const service = createTriageService({ classifier: classifierReturning(judgment()), knowledge, answerer, threshold: 0.6 });
    const result = await service.dryRun("How do I reset my password?");
    expect(result.category).toBe("question");
    expect(answerer.answer).not.toHaveBeenCalled();
  });
});
