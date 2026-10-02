import { readFileSync } from "node:fs";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { createBedrockAnswerer } from "./adapters/bedrock/bedrockAnswerer.js";
import { createBot } from "./adapters/discord/bot.js";
import { createJevClassifier } from "./adapters/jev/jevClassifier.js";
import { createFsKnowledgeBase } from "./adapters/knowledge/fsKnowledgeBase.js";
import { ConfigError, loadConfig } from "./app/config.js";
import { startHeartbeat } from "./app/heartbeat.js";
import { consoleLogger as logger } from "./app/logger.js";
import { createTriageService } from "./app/triageService.js";
import { formatVersion } from "./domain/version.js";

/** package.json is the single source of truth for the version. */
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

async function main(): Promise<void> {
  const config = loadConfig(process.env);

  // Composition root: the only place where concrete adapters are chosen and connected.
  const classifier = createJevClassifier(new TypeSafeClient({ apiKey: config.typesafeApiKey }));

  let answerer;
  if (config.answerAgent.enabled) {
    const bedrock = new BedrockRuntimeClient({ region: config.answerAgent.region });
    answerer = createBedrockAnswerer({
      modelId: config.answerAgent.modelId,
      converse: (input) => bedrock.send(new ConverseCommand(input)),
    });
  }

  const triage = createTriageService({
    classifier,
    knowledge: createFsKnowledgeBase(config.knowledgeDir),
    ...(answerer ? { answerer } : {}),
    threshold: config.threshold,
    logger,
  });

  const bot = createBot({
    token: config.discordToken,
    ...(config.guildId ? { guildId: config.guildId } : {}),
    channelIds: config.channelIds,
    triage,
    threshold: config.threshold,
    versionText: formatVersion(version, config.buildCommit),
    logger,
  });

  startHeartbeat(() => bot.client.isReady());
  logger.info("starting", { version, answerAgent: config.answerAgent.enabled, threshold: config.threshold });
  await bot.start();
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) console.error(error.message);
  else logger.error("fatal", { error: String(error) });
  process.exit(1);
});
