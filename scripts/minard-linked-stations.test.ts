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

  it("uses plot-level minardColdStations on the cold strip (shared rows for path+point)", () => {
    const coldPlot = (source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [])[1] ?? "";
    expect(coldPlot).toMatch(/data=\{minardColdStations\}/);
    // Layers inherit plot data — no second layer-local copy of stations.
    expect(coldPlot).not.toMatch(/<GeomPath[\s\S]*data=\{minardColdStations\}/);
    expect(coldPlot).not.toMatch(/<GeomPoint[\s\S]*data=\{minardColdStations\}/);
  });

  it("keeps map stationKey only on cold-station points (not the troop path)", () => {
    const mapPlot = (source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [])[0] ?? "";
    expect(mapPlot).toMatch(/data=\{minardTroops\}/);
    expect(mapPlot).toMatch(/data=\{minardColdStations\}/);
    // Path must not use the date-stamped table (would collide keys with points).
    expect(mapPlot).not.toContain("minardTroopsWithCold");
  });
});

describe("example-interaction-api allowlist for Minard dual-chart linking", () => {
  it("allows path/trajectory via LINKED_VIEW_ALLOWLIST", () => {
    const gate = readFileSync(INTERACTION_API, "utf8");
    expect(gate).toContain('LINKED_VIEW_ALLOWLIST = new Set(["path/trajectory"])');
  });
});
