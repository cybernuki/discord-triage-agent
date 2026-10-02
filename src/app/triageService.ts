import { buildIssueTemplate } from "../domain/issueTemplate.js";
import { selectSections } from "../domain/knowledge.js";
import type { Answerer, Classifier, KnowledgeBase, Logger } from "../domain/ports.js";
import { decideActions, type Action } from "../domain/router.js";
import { resolveTriage, unavailableTriage } from "../domain/triage.js";
import type { TriageResult } from "../domain/types.js";

export interface TriageServiceDeps {
  classifier: Classifier;
  knowledge: KnowledgeBase;
  /** When omitted, the answer agent is considered off. */
  answerer?: Answerer;
  threshold: number;
  /** How many FAQ sections are passed to the model. */
  maxSections?: number;
  logger?: Logger;
}

/** Everything the Discord layer needs to render a reaction to one message. */
export interface TriageOutcome {
  result: TriageResult;
  actions: Action[];
  answer?: string;
  issueTemplate?: string;
}

export interface TriageService {
  handle(text: string): Promise<TriageOutcome>;
  /** Classification only: no answer drafting. Used by `/triage`. */
  dryRun(text: string): Promise<TriageResult>;
}

export function createTriageService(deps: TriageServiceDeps): TriageService {
  const { classifier, knowledge, answerer, threshold, maxSections = 3, logger } = deps;

  async function classify(text: string): Promise<TriageResult> {
    try {
      return resolveTriage(await classifier.classify(text), threshold);
    } catch (error) {
      logger?.error("classifier failed, handing off to a human", { error: String(error) });
      return unavailableTriage();
    }
  }

  return {
    dryRun: classify,

    async handle(text) {
      const result = await classify(text);
      const actions = decideActions(result, { answerAgentEnabled: answerer !== undefined });
      const outcome: TriageOutcome = { result, actions };

      if (actions.some((a) => a.type === "draft_answer") && answerer) {
        try {
          const context = selectSections(text, await knowledge.load(), maxSections);
          outcome.answer = await answerer.answer(text, context);
        } catch (error) {
          logger?.error("answer agent failed, flagging for a human", { error: String(error) });
          outcome.actions = actions.filter((a) => a.type !== "draft_answer").concat({ type: "flag_for_human" });
        }
      }
      if (actions.some((a) => a.type === "offer_issue_template")) {
        outcome.issueTemplate = buildIssueTemplate(text, result.urgency);
      }
      return outcome;
    },
  };
}
