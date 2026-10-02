import type { TriageJudgment, TriageReason, TriageResult, Urgency } from "./types.js";

/** A classifier "needs human" probability at or above this value hands the message to a person. */
const NEEDS_HUMAN_CUTOFF = 0.5;

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** Maps the expected score on the 0..2 urgency rubric to a label. */
function urgencyFromScore(score: number): Urgency {
  const s = clamp(score, 0, 2);
  if (s < 0.5) return "low";
  if (s < 1.5) return "medium";
  return "high";
}

/**
 * Applies the confidence policy to raw judgments.
 *
 * - Category confidence below `threshold` falls back to "other" and needs a human.
 * - Urgency confidence below `threshold` falls back to "medium" (no strong claim either way).
 * - The classifier can independently flag a message for a human.
 */
export function resolveTriage(judgment: TriageJudgment, threshold: number): TriageResult {
  if (!(threshold >= 0 && threshold <= 1)) {
    throw new RangeError(`Confidence threshold must be between 0 and 1, got ${threshold}`);
  }

  const reasons: TriageReason[] = [];
  const lowConfidence = judgment.categoryConfidence < threshold;
  if (lowConfidence) reasons.push("low_confidence");

  const flagged = judgment.needsHumanProbability >= NEEDS_HUMAN_CUTOFF;
  if (flagged) reasons.push("flagged_by_classifier");

  return {
    category: lowConfidence ? "other" : judgment.category,
    rawCategory: judgment.category,
    confidence: judgment.categoryConfidence,
    urgency: judgment.urgencyConfidence < threshold ? "medium" : urgencyFromScore(judgment.urgencyScore),
    needsHuman: lowConfidence || flagged,
    needsHumanProbability: judgment.needsHumanProbability,
    reasons,
  };
}

/** Result used when the classifier cannot be reached: never guess, hand off to a person. */
export function unavailableTriage(): TriageResult {
  return {
    category: "other",
    rawCategory: "other",
    confidence: 0,
    urgency: "medium",
    needsHuman: true,
    needsHumanProbability: 1,
    reasons: ["classifier_unavailable"],
  };
}
