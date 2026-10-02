import type { TriageResult } from "./types.js";

export type Action =
  | { type: "post_summary" }
  | { type: "draft_answer" }
  | { type: "offer_issue_template" }
  | { type: "flag_for_human" };

export interface RoutingOptions {
  answerAgentEnabled: boolean;
}

/**
 * Pure routing table: triage result in, ordered list of actions out.
 * The adapters decide how each action is carried out.
 */
export function decideActions(result: TriageResult, options: RoutingOptions): Action[] {
  const actions: Action[] = [{ type: "post_summary" }];

  if (result.category === "question" && !result.needsHuman && options.answerAgentEnabled) {
    actions.push({ type: "draft_answer" });
  }
  if (result.category === "bug") {
    actions.push({ type: "offer_issue_template" });
  }
  if (result.needsHuman) {
    actions.push({ type: "flag_for_human" });
  }
  return actions;
}
