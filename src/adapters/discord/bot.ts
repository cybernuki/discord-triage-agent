import { Client, Events, GatewayIntentBits } from "discord.js";
import type { Logger } from "../../domain/ports.js";
import { commandDefinitions, createCommandHandler, type CommandHandlerOptions } from "./commands.js";
import { createMessageHandler, type TriageHandler } from "./messageHandler.js";

export interface BotOptions {
  token: string;
  /** Register commands for one guild (instant) instead of globally (can take up to an hour). */
  guildId?: string;
  channelIds: ReadonlySet<string>;
  triage: TriageHandler;
  threshold: number;
  versionText: string;
  logger: Logger;
}

/** Thin gateway wiring: everything interesting lives in the handlers, which are tested without Discord. */
export function createBot(options: BotOptions): { client: Client; start(): Promise<void> } {
  const { token, guildId, channelIds, triage, threshold, versionText, logger } = options;
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  const onMessage = createMessageHandler({ channelIds, triage, logger });
  const commandOptions: CommandHandlerOptions = { triage, threshold, versionText };
  const onCommand = createCommandHandler(commandOptions);

  client.on(Events.MessageCreate, (message) => void onMessage(message));
  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    onCommand(interaction).catch((error: unknown) => logger.error("command failed", { error: String(error) }));
  });
  client.on(Events.Error, (error) => logger.error("discord client error", { error: String(error) }));

  client.once(Events.ClientReady, async (ready) => {
    logger.info("bot ready", { user: ready.user.tag, channels: channelIds.size });
    try {
      if (guildId) await ready.guilds.cache.get(guildId)?.commands.set(commandDefinitions);
      else await ready.application.commands.set(commandDefinitions);
    } catch (error) {
      logger.error("failed to register slash commands", { error: String(error) });
    }
  });

  return { client, start: async () => void (await client.login(token)) };
}
