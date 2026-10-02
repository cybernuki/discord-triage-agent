export const CATEGORIES = ["bug", "question", "feature_request", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const URGENCIES = ["low", "medium", "high"] as const;
export type Urgency = (typeof URGENCIES)[number];

/**
 * Raw, typed judgments as produced by a classifier, before any policy is applied.
 * Probabilities and confidences are in the range 0..1.
 */
export interface TriageJudgment {
  category: Category;
  /** Concentration of the category distribution (how sure the classifier is of `category`). */
  categoryConfidence: number;
  /** Expected position on the urgency rubric: 0 = low, 1 = medium, 2 = high. May be fractional. */
  urgencyScore: number;
  urgencyConfidence: number;
  /** Probability that a person should look at this message. */
  needsHumanProbability: number;
}

export type TriageReason = "low_confidence" | "flagged_by_classifier" | "classifier_unavailable";

/** The decision the rest of the system acts on. */
export interface TriageResult {
  /** Effective category after the confidence threshold ("other" when unsure). */
  category: Category;
  /** What the classifier picked before the threshold was applied. */
  rawCategory: Category;
  confidence: number;
  urgency: Urgency;
  needsHuman: boolean;
  needsHumanProbability: number;
  reasons: TriageReason[];
}
