/** One heading-delimited chunk of a markdown FAQ file. */
export interface KnowledgeSection {
  source: string;
  title: string;
  body: string;
}

const HEADING = /^#{1,6}\s+(.*\S)\s*$/;

/** Splits markdown into sections by heading. Sections with an empty body are dropped. */
export function parseSections(source: string, markdown: string): KnowledgeSection[] {
  const sections: KnowledgeSection[] = [];
  let title = source;
  let lines: string[] = [];

  const flush = (): void => {
    const body = lines.join("\n").trim();
    if (body) sections.push({ source, title, body });
    lines = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const match = HEADING.exec(line);
    if (match) {
      flush();
      title = match[1] ?? source;
    } else {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "can", "do", "does", "for", "from", "how", "i", "in", "is", "it",
  "my", "of", "on", "or", "the", "to", "we", "what", "when", "where", "which", "with", "you", "your",
]);

const TITLE_WEIGHT = 3;

/** Lowercases, strips punctuation, drops stop words and applies a crude plural stem. */
function terms(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || STOP_WORDS.has(raw)) continue;
    out.add(raw.length > 3 && raw.endsWith("s") ? raw.slice(0, -1) : raw);
  }
  return out;
}

/**
 * Keyword-overlap ranking: a query term found in the title counts three times a term found in the body.
 * Deliberately simple (no embeddings); see the roadmap for the RAG upgrade path.
 */
export function selectSections(query: string, sections: KnowledgeSection[], limit: number): KnowledgeSection[] {
  const queryTerms = terms(query);
  if (queryTerms.size === 0) return [];

  return sections
    .map((section) => {
      const titleTerms = terms(section.title);
      const bodyTerms = terms(section.body);
      let score = 0;
      for (const term of queryTerms) {
        if (titleTerms.has(term)) score += TITLE_WEIGHT;
        if (bodyTerms.has(term)) score += 1;
      }
      return { section, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))
    .map((s) => s.section);
}
