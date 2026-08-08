/**
 * Gallery meta: dual inspect panels that share longitude, not linked selection.
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

  it("tags inspect without linked-views (series are independent)", () => {
    expect(meta.tags).toContain("inspect");
    expect(meta.tags).toContain("path");
    expect(meta.tags).not.toContain("linked-views");
  });

  it("describes the chart without cross-chart highlight claims", () => {
    const blob = meta.description.toLowerCase();
    expect(blob).toMatch(/path|strength|temperature/);
    expect(blob).not.toMatch(/select point|clear selection/);
    expect(blob).not.toMatch(/highlight|linked|same station|lights the/);
  });

  it("ships no Interaction modality copy (layout-only journey)", () => {
    expect(meta.journey?.pointer).toBeUndefined();
    expect(meta.journey?.keyboard).toBeUndefined();
    expect(meta.journey?.touch).toBeUndefined();
  });
});

describe("path/trajectory cold subtitle", () => {
  it("does not teach linking between strip and map", () => {
    const source = readFileSync(EXAMPLE, "utf8");
    expect(source).not.toMatch(/Select a reading to highlight the same station/);
    expect(source).not.toMatch(/mark the same station|linked station|highlight the same/i);
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
