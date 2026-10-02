import type { Urgency } from "./types.js";

const MAX_QUOTED_CHARS = 1000;

const quote = (text: string): string =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

/** A pre-filled bug report the user can copy into their tracker of choice. */
export function buildIssueTemplate(message: string, urgency: Urgency): string {
  const trimmed = message.trim();
  const body = trimmed.length > MAX_QUOTED_CHARS ? `${trimmed.slice(0, MAX_QUOTED_CHARS)}…` : trimmed;

  return [
    "**Summary**",
    quote(body),
    "",
    "**Steps to reproduce**",
    "1. ",
    "2. ",
    "",
    "**Expected behavior**",
    "",
    "**Actual behavior**",
    "",
    `Urgency: ${urgency}`,
  ].join("\n");
}
