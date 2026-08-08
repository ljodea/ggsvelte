/**
 * Gallery meta teaches inspect + cold dates + cross-chart highlight —
 * not Select-point dual-tool chrome.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const META = join(ROOT, "examples/path/trajectory/meta.json");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");

describe("path/trajectory meta polish", () => {
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    description: string;
    tags: string[];
    journey?: { pointer?: string; keyboard?: string; touch?: string };
  };

  it("tags the example for inspect + linked-views discovery", () => {
    expect(meta.tags).toContain("inspect");
    expect(meta.tags).toContain("path");
    expect(meta.tags).toContain("linked-views");
  });

  it("describes the cold strip and linked highlight without Select-point chrome", () => {
    expect(meta.description.toLowerCase()).toMatch(/cold|date|retreat|minard/);
    expect(meta.description.toLowerCase()).not.toMatch(/select point/);
  });

  it("ships a journey pointer for hover/pin + strip highlight", () => {
    const pointer = meta.journey?.pointer ?? "";
    expect(pointer).toMatch(/pin|hover|inspect|date/i);
    expect(pointer.toLowerCase()).not.toMatch(/select point|clear selection/);
    expect(pointer.toLowerCase()).toMatch(/strip|below|other|highlight|same/);
  });
});

describe("path/trajectory cold subtitle", () => {
  it("does not teach Select-point linking between strip and map", () => {
    const source = readFileSync(EXAMPLE, "utf8");
    expect(source).not.toMatch(/Select a reading to highlight the same station/);
  });

  it("keeps both plots free of forced point-select tool defaults", () => {
    const source = readFileSync(EXAMPLE, "utf8");
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    expect(plots.length).toBe(2);
    for (const plot of plots) {
      expect(plot).not.toMatch(/tool=["']point["']/);
      expect(plot).not.toMatch(/select=\{\{\s*type:\s*["']point["']/);
    }
  });
});
