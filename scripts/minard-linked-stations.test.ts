/**
 * Minard path/trajectory must NOT link map ↔ cold strip.
 *
 * HistData::Minard.temp has 9 retreat temperature readings; Column-1 retreat
 * has 19 path vertices. They are different series (Minard's original layout).
 * Nearest-longitude joins invent false station pairs (ghost rings, sticky
 * highlights on the last matched reading). Charts stay independent Inspect
 * panels that share longitude only by axis limits.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const INTERACTION_API = join(ROOT, "scripts/example-interaction-api.test.ts");

describe("path/trajectory has no map↔strip link", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("does not share a createPlotInteraction controller", () => {
    expect(source).not.toContain("createPlotInteraction");
    expect(source).not.toContain("interactionScope");
    expect(source).not.toMatch(/\{interaction\}/);
    expect(source).not.toContain("setSelection");
    expect(source).not.toContain("oninspect");
  });

  it("never enables Select-point dual-tool chrome", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    expect(plots.length).toBe(2);
    for (const plot of plots) {
      expect(plot).not.toMatch(/select=\{\{\s*type:\s*["']point["']/);
      expect(plot).not.toMatch(/tool=["']point["']/);
    }
  });

  it("does not mount cold-station ring anchors on the map", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    const mapPlot = plots[0] ?? "";
    expect(mapPlot).not.toMatch(/data=\{minardColdStations\}/);
    expect(mapPlot).not.toMatch(/data=\{minardCold\}/);
    // Map troop path is the plain march table — no stamped stationKey join.
    expect(mapPlot).toContain("minardTroops");
    expect(mapPlot).not.toContain("minardTroopsWithCold");
  });

  it("cold strip uses raw Minard.temp rows (not a join table)", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    const coldPlot = plots[1] ?? "";
    expect(coldPlot).toContain("minardCold");
    expect(coldPlot).not.toContain("minardColdStations");
  });
});

describe("example-interaction-api has no Minard linked-view exception", () => {
  it("does not allowlist path/trajectory for shared controller APIs", () => {
    const gate = readFileSync(INTERACTION_API, "utf8");
    expect(gate).not.toMatch(/LINKED_VIEW_ALLOWLIST[\s\S]*path\/trajectory/);
  });
});
