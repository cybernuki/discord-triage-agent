import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";

const base = {
  DISCORD_TOKEN: "token",
  SUPPORT_CHANNEL_IDS: "123456789012345678, 223456789012345678",
  TYPESAFE_API_KEY: "key",
};

describe("loadConfig", () => {
  it("parses a minimal environment and applies defaults", () => {
    const c = loadConfig(base);
    expect(c.channelIds).toEqual(new Set(["123456789012345678", "223456789012345678"]));
    expect(c.threshold).toBe(0.6);
    expect(c.answerAgent).toEqual({ enabled: false });
    expect(c.knowledgeDir).toBe("knowledge");
  });

  it("reports every missing variable by name", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    try {
      loadConfig({});
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("DISCORD_TOKEN");
      expect(message).toContain("SUPPORT_CHANNEL_IDS");
      expect(message).toContain("TYPESAFE_API_KEY");
    }
  });

  it("treats empty strings (as left in a copied .env) as unset", () => {
    expect(() => loadConfig({ ...base, DISCORD_TOKEN: "" })).toThrow(/DISCORD_TOKEN/);
    expect(loadConfig({ ...base, DISCORD_GUILD_ID: "" }).guildId).toBeUndefined();
  });

  it("rejects malformed channel ids", () => {
    expect(() => loadConfig({ ...base, SUPPORT_CHANNEL_IDS: "general" })).toThrow(/SUPPORT_CHANNEL_IDS/);
  });

  it("rejects a threshold outside 0..1", () => {
    expect(() => loadConfig({ ...base, TRIAGE_CONFIDENCE_THRESHOLD: "1.5" })).toThrow(/TRIAGE_CONFIDENCE_THRESHOLD/);
  });

  it("requires a Bedrock model id when the answer agent is on", () => {
    expect(() => loadConfig({ ...base, ANSWER_AGENT: "on" })).toThrow(/BEDROCK_MODEL_ID/);
    const c = loadConfig({ ...base, ANSWER_AGENT: "on", BEDROCK_MODEL_ID: "some.model", AWS_REGION: "eu-west-1" });
    expect(c.answerAgent).toEqual({ enabled: true, modelId: "some.model", region: "eu-west-1" });
  });

  it("rejects an unknown ANSWER_AGENT value", () => {
    expect(() => loadConfig({ ...base, ANSWER_AGENT: "maybe" })).toThrow(/ANSWER_AGENT/);
  });
});
