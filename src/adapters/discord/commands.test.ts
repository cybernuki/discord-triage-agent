import { describe, expect, it, vi } from "vitest";
import { commandDefinitions, createCommandHandler, type CommandInteraction } from "./commands.js";
import type { TriageResult } from "../../domain/types.js";

const result: TriageResult = {
  category: "question",
  rawCategory: "question",
  confidence: 0.9,
  urgency: "low",
  needsHuman: false,
  needsHumanProbability: 0.05,
  reasons: [],
};

const interaction = (commandName: string, text = "hello"): CommandInteraction & Record<string, ReturnType<typeof vi.fn>> =>
  ({
    commandName,
    options: { getString: vi.fn(() => text) },
    reply: vi.fn(async () => undefined),
    deferReply: vi.fn(async () => undefined),
    editReply: vi.fn(async () => undefined),
  }) as never;

const handler = () => {
  const triage = { handle: vi.fn(), dryRun: vi.fn(async () => result) };
  return { triage, onCommand: createCommandHandler({ triage, threshold: 0.6, versionText: "discord-triage-agent v0.1.0" }) };
};

describe("slash commands", () => {
  it("declares /version and /triage", () => {
    expect(commandDefinitions.map((c) => c.name)).toEqual(["version", "triage"]);
  });

  it("/version replies with the version text", async () => {
    const i = interaction("version");
    await handler().onCommand(i);
    expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: "discord-triage-agent v0.1.0" }));
  });

  it("/triage defers, runs the dry run and edits the reply with an embed", async () => {
    const { onCommand, triage } = handler();
    const i = interaction("triage", "how do I reset my password");

    await onCommand(i);

    expect(i.deferReply).toHaveBeenCalled();
    expect(triage.dryRun).toHaveBeenCalledWith("how do I reset my password");
    expect(i.editReply).toHaveBeenCalledWith({ embeds: [expect.objectContaining({ title: "Dry run: Question" })] });
  });
});
