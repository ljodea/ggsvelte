/**
 * Minard: no dual-tool rail; clean custom tooltips; inspect-driven link.
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

  it("stamps cold dates on the troop path for oninspect / tooltip rows", () => {
    const mapPlot = plots[0] ?? "";
    expect(mapPlot).toContain("minardTroopsWithCold");
  });

  it("does not force Select-point copy in the cold subtitle", () => {
    expect(source).not.toMatch(/Select a reading to highlight the same station/);
  });
});

describe("path/trajectory meta after inspect-link fix", () => {
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    description: string;
    tags: string[];
    journey?: { pointer?: string; keyboard?: string; touch?: string };
  };

  it("tags inspect and linked-views without promising Select-point chrome", () => {
    expect(meta.tags).toContain("inspect");
    expect(meta.tags).toContain("linked-views");
  });

  it("describes survivors, dates, and cross-chart highlight without tool rail language", () => {
    const blob = [
      meta.description,
      meta.journey?.pointer ?? "",
      meta.journey?.keyboard ?? "",
      meta.journey?.touch ?? "",
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).not.toMatch(/select point|clear selection|tool rail/);
    expect(blob).toMatch(/pin|hover/);
    expect(blob).toMatch(/date|cold|survivors/);
    expect(blob).toMatch(/strip|below|other|highlight|same|lights/);
  });
});
