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

  it("describes the cold strip without cross-chart highlight claims", () => {
    const blob = [
      meta.description,
      meta.journey?.pointer ?? "",
      meta.journey?.keyboard ?? "",
      meta.journey?.touch ?? "",
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/cold|date|retreat|minard/);
    expect(blob).not.toMatch(/select point|clear selection/);
    expect(blob).not.toMatch(/highlight|linked|same station|lights the/);
  });

  it("ships a journey pointer for pin/hover on each panel", () => {
    const pointer = meta.journey?.pointer ?? "";
    expect(pointer).toMatch(/pin|hover|inspect|date/i);
    expect(pointer.toLowerCase()).not.toMatch(/select point|clear selection|highlight/);
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
