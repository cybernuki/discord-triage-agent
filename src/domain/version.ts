const PRODUCT = "discord-triage-agent";

/** Formats the `/version` reply. The commit is optional and shown only when it looks like a git hash. */
export function formatVersion(version: string, commit?: string): string {
  const hash = commit?.trim().toLowerCase() ?? "";
  const short = /^[0-9a-f]{7,40}$/.test(hash) ? ` (commit ${hash.slice(0, 7)})` : "";
  return `${PRODUCT} v${version}${short}`;
}
