import type { Logger } from "../domain/ports.js";

/** One JSON object per line: easy to read locally and to ship to any log collector. */
export const consoleLogger: Logger = {
  info: (message, fields) => console.log(JSON.stringify({ level: "info", message, ...fields })),
  error: (message, fields) => console.error(JSON.stringify({ level: "error", message, ...fields })),
};
