import type { APIEmbed } from "discord.js";
import type { Logger } from "../../domain/ports.js";
import type { Action } from "../../domain/router.js";
import type { TriageResult } from "../../domain/types.js";
import { buildAnswerEmbed, buildSummaryEmbed, issueTemplateMessage } from "./embeds.js";

/** What the Discord layer needs from the application; satisfied by the app's triage service. */
export interface TriageHandler {
  handle(text: string): Promise<{ result: TriageResult; actions: Action[]; answer?: string; issueTemplate?: string }>;
  dryRun(text: string): Promise<TriageResult>;
}

/** The slice of a discord.js Message used here, so the handler is testable without a gateway. */
export interface IncomingMessage {
  author: { bot: boolean };
  channelId: string;
  content: string;
  reply(payload: { content?: string; embeds?: APIEmbed[]; allowedMentions: { repliedUser: false } }): Promise<unknown>;
}

export interface MessageHandlerOptions {
  channelIds: ReadonlySet<string>;
  triage: TriageHandler;
  logger: Logger;
}

export function createMessageHandler({ channelIds, triage, logger }: MessageHandlerOptions) {
  return async function onMessage(message: IncomingMessage): Promise<void> {
    if (message.author.bot || !channelIds.has(message.channelId)) return;
    const text = message.content.trim();
    if (!text) return;

    try {
      const outcome = await triage.handle(text);
      const embeds = [buildSummaryEmbed(outcome.result)];
      if (outcome.actions.some((a) => a.type === "draft_answer") && outcome.answer) {
        embeds.push(buildAnswerEmbed(outcome.answer));
      }

      const noReplyPing = { repliedUser: false } as const;
      await message.reply({ embeds, allowedMentions: noReplyPing });
      if (outcome.issueTemplate) {
        await message.reply({ content: issueTemplateMessage(outcome.issueTemplate), allowedMentions: noReplyPing });
      }
      logger.info("message triaged", {
        category: outcome.result.category,
        urgency: outcome.result.urgency,
        needsHuman: outcome.result.needsHuman,
        actions: outcome.actions.map((a) => a.type),
      });
    } catch (error) {
      // One bad message must never take the bot down.
      logger.error("failed to handle message", { error: String(error) });
    }
  };
}
