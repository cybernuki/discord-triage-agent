import type { TriageJudgment } from "./types.js";
import type { KnowledgeSection } from "./knowledge.js";

/** Turns free text into typed judgments. Implemented by the Jev adapter. */
export interface Classifier {
  classify(text: string): Promise<TriageJudgment>;
}

/** Drafts a reply from supplied context. Implemented by the Bedrock adapter. */
export interface Answerer {
  answer(question: string, context: KnowledgeSection[]): Promise<string>;
}

/** Loads the FAQ sections the answerer may draw from. */
export interface KnowledgeBase {
  load(): Promise<KnowledgeSection[]>;
}
