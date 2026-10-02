import type { APIEmbed } from "discord.js";
import type { TriageResult, Urgency } from "../../domain/types.js";

const COLORS: Record<Urgency, number> = { low: 0x57f287, medium: 0xfee75c, high: 0xed4245 };

const labels: Record<TriageResult["category"], string> = {
  bug: "Bug",
  question: "Question",
  feature_request: "Feature request",
  other: "Other",
};

const reasonText: Record<TriageResult["reasons"][number], string> = {
  low_confidence: "Classifier confidence is below the threshold",
  flagged_by_classifier: "Classifier flagged this for a person",
  classifier_unavailable: "Classifier unavailable",
};

const percent = (n: number): string => `${Math.round(n * 100)}%`;

/** Compact summary posted as a reply to a support message. */
export function buildSummaryEmbed(result: TriageResult): APIEmbed {
  return {
    title: `Triage: ${labels[result.category]}`,
    color: COLORS[result.urgency],
    fields: [
      { name: "Urgency", value: result.urgency, inline: true },
      { name: "Confidence", value: percent(result.confidence), inline: true },
      { name: "Needs a human", value: result.needsHuman ? "Yes" : "No", inline: true },
    ],
    ...(result.reasons.length > 0 ? { footer: { text: result.reasons.map((r) => reasonText[r]).join(" | ") } } : {}),
  };
}

/** Verbose variant for `/triage`: also shows what the classifier picked before the threshold. */
export function buildDryRunEmbed(result: TriageResult, threshold: number): APIEmbed {
  const base = buildSummaryEmbed(result);
  return {
    ...base,
    title: `Dry run: ${labels[result.category]}`,
    fields: [
      ...(base.fields ?? []),
      { name: "Raw category", value: labels[result.rawCategory], inline: true },
      { name: "P(needs human)", value: percent(result.needsHumanProbability), inline: true },
      { name: "Threshold", value: percent(threshold), inline: true },
    ],
  };
}

export function buildAnswerEmbed(answer: string): APIEmbed {
  const limit = 3900;
  return {
    title: "Suggested answer (AI draft)",
    description: answer.length > limit ? `${answer.slice(0, limit)}…` : answer,
    footer: { text: "Drafted from the FAQ. A team member will confirm if this does not help." },
  };
}

export const issueTemplateMessage = (template: string): string =>
  `This looks like a bug. Here is a pre-filled report you can complete:\n\`\`\`md\n${template}\n\`\`\``;
