import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { APIEmbed } from "discord.js";
import { buildDryRunEmbed } from "./embeds.js";
import type { TriageHandler } from "./messageHandler.js";

export const commandDefinitions = [
  new SlashCommandBuilder().setName("version").setDescription("Show the running bot version").toJSON(),
  new SlashCommandBuilder()
    .setName("triage")
    .setDescription("Dry run: show how a message would be classified (nothing is posted)")
    .addStringOption((o) => o.setName("text").setDescription("The message to classify").setRequired(true).setMaxLength(1000))
    .toJSON(),
];

/** The slice of a discord.js ChatInputCommandInteraction used here. */
export interface CommandInteraction {
  commandName: string;
  options: { getString(name: string, required: true): string };
  reply(payload: { content: string; flags: MessageFlags.Ephemeral }): Promise<unknown>;
  deferReply(options: { flags: MessageFlags.Ephemeral }): Promise<unknown>;
  editReply(payload: { embeds: APIEmbed[] }): Promise<unknown>;
}

export interface CommandHandlerOptions {
  triage: TriageHandler;
  threshold: number;
  versionText: string;
}

export function createCommandHandler({ triage, threshold, versionText }: CommandHandlerOptions) {
  return async function onCommand(interaction: CommandInteraction): Promise<void> {
    switch (interaction.commandName) {
      case "version":
        await interaction.reply({ content: versionText, flags: MessageFlags.Ephemeral });
        return;
      case "triage": {
        // Classification can exceed Discord's 3s acknowledgement window, so defer first.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const result = await triage.dryRun(interaction.options.getString("text", true));
        await interaction.editReply({ embeds: [buildDryRunEmbed(result, threshold)] });
        return;
      }
      default:
        await interaction.reply({ content: "Unknown command.", flags: MessageFlags.Ephemeral });
    }
  };
}
