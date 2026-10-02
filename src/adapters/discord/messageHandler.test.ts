import { describe, expect, it, vi } from "vitest";
import { createMessageHandler, type IncomingMessage, type TriageHandler } from "./messageHandler.js";
import type { TriageResult } from "../../domain/types.js";

const result: TriageResult = {
  category: "bug",
  rawCategory: "bug",
  confidence: 0.9,
  urgency: "medium",
  needsHuman: false,
  needsHumanProbability: 0.1,
  reasons: [],
};

const silent = { info: vi.fn(), error: vi.fn() };

const fakeMessage = (over: Partial<IncomingMessage> = {}) => {
  const reply = vi.fn<IncomingMessage["reply"]>(async () => undefined);
  const message: IncomingMessage = { author: { bot: false }, channelId: "100", content: "it crashes", reply, ...over };
  return { message, reply };
};

const triage = (outcome: Awaited<ReturnType<TriageHandler["handle"]>>): TriageHandler => ({
  handle: vi.fn(async () => outcome),
  dryRun: vi.fn(async () => result),
});

describe("message handler", () => {
  const channelIds = new Set(["100"]);

  it("ignores bots, other channels and empty messages", async () => {
    const t = triage({ result, actions: [{ type: "post_summary" }] });
    const onMessage = createMessageHandler({ channelIds, triage: t, logger: silent });

    await onMessage(fakeMessage({ author: { bot: true } }).message);
    await onMessage(fakeMessage({ channelId: "999" }).message);
    await onMessage(fakeMessage({ content: "   " }).message);

    expect(t.handle).not.toHaveBeenCalled();
  });

  it("replies with the summary embed and, for bugs, the issue template", async () => {
    const t = triage({
      result,
      actions: [{ type: "post_summary" }, { type: "offer_issue_template" }],
      issueTemplate: "**Summary**\n> it crashes",
    });
    const { message, reply } = fakeMessage();

    await createMessageHandler({ channelIds, triage: t, logger: silent })(message);

    expect(reply).toHaveBeenCalledTimes(2);
    expect(reply.mock.calls[0]![0]).toMatchObject({ embeds: [expect.objectContaining({ title: "Triage: Bug" })] });
    expect(reply.mock.calls[1]![0]).toMatchObject({ content: expect.stringContaining("pre-filled report") });
  });

  it("adds the answer embed when an answer was drafted", async () => {
    const t = triage({
      result: { ...result, category: "question" },
      actions: [{ type: "post_summary" }, { type: "draft_answer" }],
      answer: "Use the forgot password link.",
    });
    const { message, reply } = fakeMessage();

    await createMessageHandler({ channelIds, triage: t, logger: silent })(message);

    const payload = reply.mock.calls[0]![0] as { embeds: { title: string }[] };
    expect(payload.embeds.map((e) => e.title)).toEqual(["Triage: Question", "Suggested answer (AI draft)"]);
  });

  it("logs and swallows errors instead of crashing", async () => {
    const t: TriageHandler = { handle: async () => { throw new Error("boom"); }, dryRun: async () => result };
    const logger = { info: vi.fn(), error: vi.fn() };

    await expect(createMessageHandler({ channelIds, triage: t, logger })(fakeMessage().message)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
