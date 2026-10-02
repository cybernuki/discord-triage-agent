import { z } from "zod";

export class ConfigError extends Error {
  override name = "ConfigError";
}

const channelId = z.string().regex(/^\d{17,20}$/, "must be a Discord snowflake (17-20 digits)");

const schema = z.object({
  DISCORD_TOKEN: z.string({ error: "is required" }).min(1, "is required"),
  DISCORD_GUILD_ID: z.string().optional(),
  SUPPORT_CHANNEL_IDS: z
    .string({ error: "is required (comma-separated channel IDs)" })
    .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(channelId).min(1, "needs at least one channel ID")),
  TYPESAFE_API_KEY: z.string({ error: "is required" }).min(1, "is required"),
  TRIAGE_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  ANSWER_AGENT: z.enum(["on", "off"]).default("off"),
  BEDROCK_MODEL_ID: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  KNOWLEDGE_DIR: z.string().default("knowledge"),
  BUILD_COMMIT: z.string().optional(),
});

export type AnswerAgentConfig = { enabled: false } | { enabled: true; modelId: string; region: string };

export interface Config {
  discordToken: string;
  guildId: string | undefined;
  channelIds: ReadonlySet<string>;
  typesafeApiKey: string;
  threshold: number;
  answerAgent: AnswerAgentConfig;
  knowledgeDir: string;
  buildCommit: string | undefined;
}

/** Parses and validates the environment. Throws a ConfigError listing every problem at once. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  // A copied `.env.example` leaves empty values behind; treat them as unset.
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = schema.safeParse(cleaned);

  const problems = parsed.success
    ? []
    : parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
  if (parsed.success && parsed.data.ANSWER_AGENT === "on" && !parsed.data.BEDROCK_MODEL_ID) {
    problems.push("  - BEDROCK_MODEL_ID: is required when ANSWER_AGENT=on");
  }
  if (problems.length > 0 || !parsed.success) {
    throw new ConfigError(`Invalid configuration:\n${problems.join("\n")}\nSee .env.example for the full list.`);
  }

  const e = parsed.data;
  return {
    discordToken: e.DISCORD_TOKEN,
    guildId: e.DISCORD_GUILD_ID,
    channelIds: new Set(e.SUPPORT_CHANNEL_IDS),
    typesafeApiKey: e.TYPESAFE_API_KEY,
    threshold: e.TRIAGE_CONFIDENCE_THRESHOLD,
    answerAgent:
      e.ANSWER_AGENT === "on" && e.BEDROCK_MODEL_ID
        ? { enabled: true, modelId: e.BEDROCK_MODEL_ID, region: e.AWS_REGION }
        : { enabled: false },
    knowledgeDir: e.KNOWLEDGE_DIR,
    buildCommit: e.BUILD_COMMIT,
  };
}
