import { describe, expect, it, vi } from "vitest";
import type { ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockAnswerer } from "./bedrockAnswerer.js";

const reply = (...texts: string[]): ConverseCommandOutput =>
  ({ output: { message: { role: "assistant", content: texts.map((text) => ({ text })) } } }) as ConverseCommandOutput;

describe("createBedrockAnswerer", () => {
  it("sends the system prompt, FAQ context and question, and returns the text", async () => {
    const converse = vi.fn(async () => reply("Use the ", "forgot password link."));
    const answerer = createBedrockAnswerer({ modelId: "test-model", converse });

    const text = await answerer.answer("How do I reset it?", [{ source: "faq.md", title: "Reset", body: "Use the link." }]);

    expect(text).toBe("Use the forgot password link.");
    const input = (converse.mock.calls as unknown as [{ modelId: string; system: unknown[]; messages: { content: { text: string }[] }[] }][])[0]![0];
    expect(input.modelId).toBe("test-model");
    expect(input.system).toHaveLength(1);
    expect(input.messages[0]!.content[0]!.text).toContain("[faq.md] Reset");
    expect(input.messages[0]!.content[0]!.text).toContain("How do I reset it?");
  });

  it("throws on an empty completion so the caller can hand off to a human", async () => {
    const answerer = createBedrockAnswerer({ modelId: "m", converse: async () => reply("  ") });
    await expect(answerer.answer("q", [])).rejects.toThrow(/empty/);
  });
});
