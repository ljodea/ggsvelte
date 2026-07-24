/**
 * Suite-wide ban on classification labels over code blocks ("Fragment",
 * "Complete file", "Complete command", "Complete example").
 *
 * The reader can see whether a block is a fragment; the filename or prose says
 * the rest. The label was injected by the shared markdown renderer, so the ban
 * is asserted on rendered output for every guide page — not only on the one
 * page that motivated the removal — plus a source scan so nobody reintroduces
 * a hand-written label in a Svelte route.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import lifecycle from "../lifecycle.json";
import { guidePages, type LifecycleDoc, renderMarkdown } from "./gen-llms.ts";

const LABEL_CLASS = "guide-code-classification";
const LABEL_TEXTS = /<p[^>]*>(Fragment|Complete file|Complete command|Complete example)<\/p>/;

const DOCS_SRC = new URL("../apps/docs/src", import.meta.url).pathname;

function walk(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      out.push(...walk(path));
    } else if (/\.(svelte|css|ts)$/.test(entry) && !entry.endsWith("generated.ts")) {
      out.push(path);
    }
  }
  return out;
}

describe("code blocks carry no classification label", () => {
  it("renders every guide page without a label", () => {
    const pages = guidePages(lifecycle as unknown as LifecycleDoc);
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) {
      const html = renderMarkdown(page.markdown);
      expect(html).not.toContain(LABEL_CLASS);
      expect(html).not.toMatch(LABEL_TEXTS);
    }
  });

  it("keeps the label out of docs source", () => {
    const offenders = walk(DOCS_SRC).filter((path) =>
      readFileSync(path, "utf8").includes(LABEL_CLASS),
    );
    expect(offenders).toEqual([]);
  });
});
