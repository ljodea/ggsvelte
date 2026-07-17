/**
 * LOC ratchet for the GGPlot.svelte god-object extraction program.
 *
 * Ceilings are append-only history: each completed slice must leave the file
 * strictly smaller than the prior ceiling. Resolves the source via
 * import.meta.url so the assertion is CWD-independent.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Append-only history of per-slice line ceilings (strictly decreasing). */
const CEILINGS: readonly { readonly slice: string; readonly ceiling: number }[] = [
  { slice: "s1-target", ceiling: 3400 },
  // Post-extraction ratchet: actual line count + 20 headroom.
  { slice: "s1-final", ceiling: 3390 },
  // S2 legend-filter controller + PlotLegendFilters: actual 3025 + 20.
  { slice: "s2-final", ceiling: 3045 },
  // S3 legend-focus controller: actual 2668 + 20.
  { slice: "s3-final", ceiling: 2688 },
  // S4 zoom controller: actual 2570 + 20.
  { slice: "s4-final", ceiling: 2590 },
];

// Resolve via import.meta (never CWD). Node SSR suite only — uses node:fs.
const ggplotPath = join(import.meta.dirname, "../src/lib/GGPlot.svelte");

describe("GGPlot.svelte size ratchet", () => {
  it("stays at or under the latest slice ceiling", () => {
    const source = readFileSync(ggplotPath, "utf8");
    const lines = source.split("\n").length;
    const latest = CEILINGS.at(-1)!;
    expect(
      lines,
      `GGPlot.svelte is ${lines} lines (ceiling ${latest.ceiling} for ${latest.slice})`,
    ).toBeLessThanOrEqual(latest.ceiling);
  });

  it("records strictly decreasing ceilings", () => {
    for (let i = 1; i < CEILINGS.length; i++) {
      expect(
        CEILINGS[i].ceiling,
        `ceiling for ${CEILINGS[i].slice} must be < ${CEILINGS[i - 1].slice}`,
      ).toBeLessThan(CEILINGS[i - 1].ceiling);
    }
  });

  it("does not reference runPipeline anywhere in the host file", () => {
    const source = readFileSync(ggplotPath, "utf8");
    expect(source).not.toMatch(/\brunPipeline\b/);
  });
});
