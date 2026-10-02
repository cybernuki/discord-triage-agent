import { describe, expect, it } from "vitest";
import { buildAnswerPrompt, ANSWER_SYSTEM_PROMPT } from "./answerPrompt.js";

describe("buildAnswerPrompt", () => {
  it("includes each section with its source and the question", () => {
    const p = buildAnswerPrompt("How do refunds work?", [
      { source: "billing.md", title: "Refunds", body: "Five business days." },
    ]);
    expect(p).toContain("[billing.md] Refunds");
    expect(p).toContain("Five business days.");
    expect(p).toContain("How do refunds work?");
  });

  it("states explicitly when no context was found", () => {
    expect(buildAnswerPrompt("Anything?", [])).toContain("No relevant FAQ entries");
  });

  it("system prompt restricts the model to the context and treats it as data", () => {
    expect(ANSWER_SYSTEM_PROMPT).toMatch(/only/i);
    expect(ANSWER_SYSTEM_PROMPT).toMatch(/data/i);
  });
});
