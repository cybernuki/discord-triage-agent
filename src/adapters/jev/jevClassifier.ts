import { choice, noul, score, type SystemOneRequest, type SystemOneResult } from "@typesafe-ai/sdk";
import { CATEGORIES, type Category, type TriageJudgment } from "../../domain/types.js";
import type { Classifier } from "../../domain/ports.js";

/**
 * Three independent judgments over the same message, sent in ONE request.
 * They run in parallel on the model side and cannot see each other's answers.
 *
 * Question IDs are only for our code; the model sees `instructions` and `criteria`,
 * so each question carries its complete meaning.
 */
const QUESTIONS = {
  category: choice("Which kind of support message is `message`? Pick exactly one.", {
    bug: "Reports that something which should work is broken: errors, crashes, wrong results, unexpected behavior.",
    question: "Asks how to do something, how something works, or about policies, pricing or availability.",
    feature_request: "Asks for new functionality or a change to how something currently works.",
    other: "Greetings, chit-chat, praise or complaints with no concrete ask, spam, or too unclear to classify.",
  }),
  urgency: score("How urgent is `message` for the support team?", [
    "Low: no time pressure, curiosity or a nice-to-have.",
    "Medium: affects the author, but a workaround exists or the impact is limited.",
    "High: the author is blocked, there is data loss, an outage, a security concern or production impact.",
  ]),
  needs_human: noul("Should a team member personally look at `message` instead of an automated reply?", {
    true: "Account-specific data, billing disputes, security concerns, an upset or escalating author, or anything that cannot be answered from general documentation.",
    false: "A general question or report that documentation or a standard process can handle.",
  }),
} as const;

type Questions = typeof QUESTIONS;
export type TriageAnswers = SystemOneResult<Questions>["answers"];

/** The slice of the TypeSafe client this adapter needs; lets tests inject a fake. */
export interface SystemOneClient {
  systemOne(request: SystemOneRequest<Questions>): PromiseLike<{ answers: TriageAnswers }>;
}

const isCategory = (value: string): value is Category => (CATEGORIES as readonly string[]).includes(value);

/** Pure mapping from Jev answers to the domain's judgment type. */
export function toJudgment(answers: TriageAnswers): TriageJudgment {
  const picked = answers.category.choice;
  if (!isCategory(picked)) throw new Error(`Jev returned an unknown category: ${picked}`);

  return {
    category: picked,
    categoryConfidence: answers.category.confidence,
    urgencyScore: answers.urgency.score,
    urgencyConfidence: answers.urgency.confidence,
    needsHumanProbability: answers.needs_human.noul,
  };
}

export function createJevClassifier(client: SystemOneClient): Classifier {
  return {
    async classify(text) {
      const { answers } = await client.systemOne({ state: { message: text }, questions: QUESTIONS });
      return toJudgment(answers);
    },
  };
}
