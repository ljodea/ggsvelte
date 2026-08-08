/**
 * Slice C: dual Minard charts share createPlotInteraction so clicking a cold
 * reading selects the same station on the march map (and vice versa).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const INTERACTION_API = join(ROOT, "scripts/example-interaction-api.test.ts");

describe("path/trajectory linked cold stations", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("shares one createPlotInteraction controller across both plots", () => {
    expect(source).toContain("createPlotInteraction");
    expect(source).toMatch(/interactionScope=\{scope\}/g);
    // Both GGPlots get the controller
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    expect(plots.length).toBe(2);
    for (const plot of plots) {
      expect(plot).toContain("{interaction}");
      expect(plot).toContain("interactionScope={scope}");
      expect(plot).toMatch(/select=\{\{\s*type:\s*["']point["']/);
    }
  });

  it("uses stationKey identity on both Inspect children", () => {
    const inspects = source.match(/<Inspect\b[^/]*\/>/g) ?? [];
    expect(inspects.length).toBeGreaterThanOrEqual(2);
    for (const inspect of inspects) {
      expect(inspect).toMatch(/identity=["']stationKey["']/);
    }
  });

  it("uses minardColdStations for cold-strip points (shared keys with the map)", () => {
    // Cold chart point layer must use stations so keys match the map points.
    expect(source).toMatch(/data=\{minardColdStations\}/);
    const coldPlot = (source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [])[1] ?? "";
    expect(coldPlot).toContain("data={minardColdStations}");
    expect(coldPlot).toMatch(/identity=["']stationKey["']/);
  });
});

describe("example-interaction-api allowlist for Minard dual-chart linking", () => {
  it("allows path/trajectory via LINKED_VIEW_ALLOWLIST", () => {
    const gate = readFileSync(INTERACTION_API, "utf8");
    expect(gate).toContain('LINKED_VIEW_ALLOWLIST = new Set(["path/trajectory"])');
  });
});
