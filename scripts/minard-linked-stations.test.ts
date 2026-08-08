/**
 * Minard map ↔ cold strip link via inspect-driven selection (no Select-point
 * dual-tool rail). Shared createPlotInteraction + oninspect setSelection.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const INTERACTION_API = join(ROOT, "scripts/example-interaction-api.test.ts");

describe("path/trajectory inspect-driven cold-station link", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("shares a createPlotInteraction controller across both plots", () => {
    expect(source).toContain("createPlotInteraction");
    expect(source).toContain("interactionScope");
    expect(source).toMatch(/\{interaction\}/);
  });

  it("never enables Select-point dual-tool chrome", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    expect(plots.length).toBe(2);
    for (const plot of plots) {
      expect(plot).not.toMatch(/select=\{\{\s*type:\s*["']point["']/);
      expect(plot).not.toMatch(/tool=["']point["']/);
    }
  });

  it("wires oninspect to setSelection by stationKey (sticky; no wipe on clear)", () => {
    expect(source).toContain("oninspect");
    expect(source).toContain("setSelection");
    expect(source).toContain("stationKeyFromInspectRow");
    // Sticky link: clear / empty stationKey must not clearSelection (cross-chart look).
    expect(source).not.toContain("clearSelection");
  });

  it("puts cold stations on the strip and as map ring owners", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    const mapPlot = plots[0] ?? "";
    const coldPlot = plots[1] ?? "";
    expect(mapPlot).toMatch(/data=\{minardColdStations\}/);
    expect(coldPlot).toMatch(/minardColdStations/);
  });
});

describe("example-interaction-api allowlist for Minard link", () => {
  it("allowlists path/trajectory for shared controller APIs", () => {
    const gate = readFileSync(INTERACTION_API, "utf8");
    expect(gate).toMatch(/LINKED_VIEW_ALLOWLIST[\s\S]*path\/trajectory/);
  });
});
