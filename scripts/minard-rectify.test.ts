/**
 * Minard: no dual-tool rail; clean custom tooltips; no false map↔strip link.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const META = join(ROOT, "examples/path/trajectory/meta.json");

describe("path/trajectory no dual-tool rail", () => {
  const source = readFileSync(EXAMPLE, "utf8");
  const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];

  it("has exactly two plots", () => {
    expect(plots.length).toBe(2);
  });

  it("drops Select-point chrome enablers (select type point, tool=point)", () => {
    expect(source).not.toMatch(/select=\{\{\s*type:\s*["']point["']/);
    expect(source).not.toMatch(/tool=["']point["']/);
  });

  it("keeps Inspect pin on both plots", () => {
    for (const plot of plots) {
      expect(plot).toMatch(/<Inspect\b[\s\S]*?\bpin\b/);
    }
  });

  it("uses custom Inspect content instead of kitchen-sink defaults", () => {
    expect(source).toMatch(/content=\{/);
    expect(source).toContain("mapMarchTooltipFields");
    expect(source).toContain("coldStripTooltipFields");
  });

  it("uses plain troop path (no cold-station stamp for linking)", () => {
    const mapPlot = plots[0] ?? "";
    expect(mapPlot).toContain("minardTroops");
    expect(mapPlot).not.toContain("minardTroopsWithCold");
    expect(mapPlot).not.toContain("createPlotInteraction");
  });

  it("does not force Select-point or same-station highlight copy in the cold subtitle", () => {
    expect(source).not.toMatch(/Select a reading to highlight the same station/);
    expect(source).not.toMatch(/mark the same station/i);
  });
});

describe("path/trajectory meta after drop false link", () => {
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    description: string;
    tags: string[];
    journey?: { pointer?: string; keyboard?: string; touch?: string };
  };

  it("tags inspect without linked-views", () => {
    expect(meta.tags).toContain("inspect");
    expect(meta.tags).not.toContain("linked-views");
  });

  it("describes the march without cross-chart highlight language", () => {
    const blob = meta.description.toLowerCase();
    expect(blob).not.toMatch(/select point|clear selection|tool rail/);
    expect(blob).toMatch(/cold|retreat|men|path/);
    expect(blob).not.toMatch(/highlight|same station|lights the|linked/);
  });
});
