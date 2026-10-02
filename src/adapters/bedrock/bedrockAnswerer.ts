import type { ConverseCommandInput, ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { ANSWER_SYSTEM_PROMPT, buildAnswerPrompt } from "../../domain/answerPrompt.js";
import type { Answerer } from "../../domain/ports.js";

/** The one Bedrock call this adapter needs; wired to the real SDK in `app/main.ts`. */
export type Converse = (input: ConverseCommandInput) => Promise<ConverseCommandOutput>;

export interface BedrockAnswererOptions {
  modelId: string;
  converse: Converse;
  maxTokens?: number;
}

export function createBedrockAnswerer({ modelId, converse, maxTokens = 600 }: BedrockAnswererOptions): Answerer {
  return {
    async answer(question, context) {
      const response = await converse({
        modelId,
        system: [{ text: ANSWER_SYSTEM_PROMPT }],
        messages: [{ role: "user", content: [{ text: buildAnswerPrompt(question, context) }] }],
        inferenceConfig: { maxTokens, temperature: 0.2 },
      });

      const text = (response.output?.message?.content ?? [])
        .map((block) => block.text ?? "")
        .join("")
        .trim();
      if (!text) throw new Error("Bedrock returned an empty answer");
      return text;
    },
  };
}
