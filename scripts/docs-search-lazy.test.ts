import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  loadDocsSearchIndex,
  resetDocsSearchIndexLoaderForTests,
} from "../apps/docs/src/lib/load-docs-search-index.ts";

const docsSrc = path.join(import.meta.dirname, "../apps/docs/src");

function walkFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") continue;
      out.push(...walkFiles(full));
      continue;
    }
    if (/\.(svelte|ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("docs search index lazy load (#948)", () => {
  it("loads the index once and reuses the same promise", async () => {
    resetDocsSearchIndexLoaderForTests();
    const first = loadDocsSearchIndex();
    const second = loadDocsSearchIndex();
    expect(second).toBe(first);
    const entries = await first;
    expect(entries.length).toBeGreaterThan(100);
    expect(entries.some((entry) => entry.href.includes("/guide/"))).toBe(true);
  });

  it("clears the cache after failure so a later open can retry", async () => {
    resetDocsSearchIndexLoaderForTests();
    const failing = loadDocsSearchIndex(() => Promise.reject(new Error("chunk missing")));
    let caught: unknown;
    try {
      await failing;
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("chunk missing");
    const recovered = await loadDocsSearchIndex(() =>
      Promise.resolve({
        DOCS_SEARCH_INDEX: [
          {
            id: "probe",
            kind: "page" as const,
            title: "Probe",
            summary: "ok",
            href: "/guide/getting-started",
            keywords: [],
            exact: [],
          },
        ],
      }),
    );
    expect(recovered).toHaveLength(1);
    expect(recovered[0]?.id).toBe("probe");
  });

  it("keeps the docs UI load path free of a static search-index import", () => {
    const offenders: string[] = [];
    for (const file of walkFiles(docsSrc)) {
      const rel = path.relative(docsSrc, file);
      if (rel === "lib/load-docs-search-index.ts") continue;
      const source = readFileSync(file, "utf8");
      if (
        /from\s*["'][^"']*generated\/search-index[^"']*["']/.test(source) &&
        !/import\s*\(\s*["'][^"']*generated\/search-index/.test(source)
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
