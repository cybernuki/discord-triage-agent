import { describe, expect, it } from "vitest";
import { parseSections, selectSections, type KnowledgeSection } from "./knowledge.js";

describe("parseSections", () => {
  it("splits a markdown file into sections by heading", () => {
    const md = "# Billing\n\nIntro text.\n\n## Refunds\nRefunds take 5 days.\n\n## Invoices\nDownload them from Settings.\n";
    const sections = parseSections("billing.md", md);
    expect(sections.map((s) => s.title)).toEqual(["Billing", "Refunds", "Invoices"]);
    expect(sections[1]).toMatchObject({ source: "billing.md", body: "Refunds take 5 days." });
  });

  it("skips sections with an empty body", () => {
    expect(parseSections("a.md", "# Only a title\n")).toEqual([]);
  });

  it("keeps text before the first heading under the file name", () => {
    const [s] = parseSections("notes.md", "Loose text here.");
    expect(s).toMatchObject({ title: "notes.md", body: "Loose text here." });
  });
});

const sec = (title: string, body: string): KnowledgeSection => ({ source: "faq.md", title, body });

describe("selectSections", () => {
  const sections = [
    sec("Reset your password", "Use the forgot password link on the login page."),
    sec("Refund policy", "Refunds are processed within five business days."),
    sec("Export data", "Use the export button to download a CSV."),
  ];

  it("ranks sections by keyword overlap, title weighted higher", () => {
    const picked = selectSections("How do I reset my password?", sections, 2);
    expect(picked[0]?.title).toBe("Reset your password");
  });

  it("ignores stop words and punctuation", () => {
    expect(selectSections("the, a, of?!", sections, 3)).toEqual([]);
  });

  it("returns at most `limit` sections and drops zero-score ones", () => {
    const picked = selectSections("refund export", sections, 5);
    expect(picked.map((s) => s.title).sort()).toEqual(["Export data", "Refund policy"]);
    expect(selectSections("refund export", sections, 1)).toHaveLength(1);
  });

  it("is case-insensitive", () => {
    expect(selectSections("REFUNDS", sections, 1)[0]?.title).toBe("Refund policy");
  });
});
