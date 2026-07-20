import { describe, expect, it } from "bun:test";

import { DOCS_SEARCH_INDEX } from "../apps/docs/src/lib/generated/search-index.ts";
import { searchDocs } from "../apps/docs/src/lib/search.ts";

const winners = [
  ["scale-scheme-type", "/guide/errors#scale-scheme-type"],
  ["GGPlot", "/guide/lifecycle#ggsvelte-svelte"],
  ["--max-marks", "/reference/cli#max-marks"],
  ["date axis", "/guide/scales-guides#date-and-time-axes"],
  ["tooltip", "/guide/inspect-pin"],
  ["server render", "/guide/server-rendering-export"],
  ["canvas selection", "/guide/rendering-performance#canvas-and-interaction"],
] as const;

describe("Docs search ranking", () => {
  for (const [query, href] of winners) {
    it(`ranks ${query} to its literal focused destination`, () => {
      expect(searchDocs(query, DOCS_SEARCH_INDEX)[0]?.href).toBe(href);
    });
  }

  it("returns no fake results for empty input and applies a deterministic bound", () => {
    expect(searchDocs("", DOCS_SEARCH_INDEX)).toEqual([]);
    expect(searchDocs("   ", DOCS_SEARCH_INDEX)).toEqual([]);
    expect(searchDocs("chart", DOCS_SEARCH_INDEX, 4)).toHaveLength(4);
    expect(searchDocs("chart", DOCS_SEARCH_INDEX, 4)).toEqual(
      searchDocs(" CHART ", DOCS_SEARCH_INDEX, 4),
    );
  });

  it("requires every query token and suppresses duplicate destinations", () => {
    const results = searchDocs("canvas selection", DOCS_SEARCH_INDEX);
    expect(results.length).toBeGreaterThan(0);
    expect(new Set(results.map((result) => result.href)).size).toBe(results.length);
  });
});
