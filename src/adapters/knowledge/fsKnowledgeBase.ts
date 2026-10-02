import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseSections, type KnowledgeSection } from "../../domain/knowledge.js";
import type { KnowledgeBase } from "../../domain/ports.js";

/** Reads every `*.md` file in a folder on each call, so FAQs can be edited without a restart. */
export function createFsKnowledgeBase(directory: string): KnowledgeBase {
  return {
    async load() {
      let files: string[];
      try {
        files = (await readdir(directory)).filter((f) => f.toLowerCase().endsWith(".md")).sort();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
      }
      const sections: KnowledgeSection[] = [];
      for (const file of files) {
        sections.push(...parseSections(file, await readFile(join(directory, file), "utf8")));
      }
      return sections;
    },
  };
}
