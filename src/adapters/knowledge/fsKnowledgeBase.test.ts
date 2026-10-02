import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsKnowledgeBase } from "./fsKnowledgeBase.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kb-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createFsKnowledgeBase", () => {
  it("loads sections from markdown files only, sorted by file name", async () => {
    await writeFile(join(dir, "b.md"), "## Two\nSecond.");
    await writeFile(join(dir, "a.md"), "## One\nFirst.");
    await writeFile(join(dir, "notes.txt"), "ignored");

    const sections = await createFsKnowledgeBase(dir).load();

    expect(sections.map((s) => `${s.source}:${s.title}`)).toEqual(["a.md:One", "b.md:Two"]);
  });

  it("returns an empty list when the folder does not exist", async () => {
    expect(await createFsKnowledgeBase(join(dir, "missing")).load()).toEqual([]);
  });
});
