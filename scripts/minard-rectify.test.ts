/**
 * Minard rectification: restore inspect-only dual chart (no dual-tool rail).
 * Linked Select-point chrome was a product misfit; cold dates stay on the path pin.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const META = join(ROOT, "examples/path/trajectory/meta.json");
const INTERACTION_API = join(ROOT, "scripts/example-interaction-api.test.ts");

describe("path/trajectory inspect-only rectification", () => {
  const source = readFileSync(EXAMPLE, "utf8");
  const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];

  it("has exactly two plots", () => {
    expect(plots.length).toBe(2);
  });

  it("drops dual-tool chrome enablers (select, tool=point, shared controller)", () => {
    expect(source).not.toMatch(/select=\{\{\s*type:\s*["']point["']/);
    expect(source).not.toMatch(/tool=["']point["']/);
    expect(source).not.toContain("createPlotInteraction");
    expect(source).not.toContain("interactionScope");
    expect(source).not.toMatch(/\{interaction\}/);
  });

  it("keeps Inspect pin on both plots without stationKey identity", () => {
    for (const plot of plots) {
      expect(plot).toMatch(/<Inspect\b[^>]*\bpin\b/);
      expect(plot).not.toMatch(/identity=["']stationKey["']/);
    }
  });

  it("uses stamped troop path so cold dates reach the map pin", () => {
    const mapPlot = plots[0] ?? "";
    expect(mapPlot).toContain("minardTroopsWithCold");
    expect(mapPlot).toMatch(/label:\s*["']date["']/);
    // Path is the primary inspectable family — no competing cold-station points.
    expect(mapPlot).not.toMatch(/data=\{minardColdStations\}/);
  });

  it("restores temperature-only cold strip data (minardCold)", () => {
    const coldPlot = plots[1] ?? "";
    expect(coldPlot).toMatch(/minardCold\b/);
    expect(coldPlot).not.toContain("minardColdStations");
  });

  it("does not promise Select-point linking in the cold subtitle", () => {
    expect(source).not.toMatch(/Select a reading to highlight/);
  });
});

describe("path/trajectory meta after rectification", () => {
  const meta = JSON.parse(readFileSync(META, "utf8")) as {
    description: string;
    tags: string[];
    journey?: { pointer?: string; keyboard?: string; touch?: string; references?: unknown[] };
  };

  it("drops linked-views discovery tag", () => {
    expect(meta.tags).not.toContain("linked-views");
    expect(meta.tags).toContain("inspect");
  });

  it("describes the figurative map and cold dates without Select-point chrome", () => {
    const blob = [
      meta.description,
      meta.journey?.pointer ?? "",
      meta.journey?.keyboard ?? "",
      meta.journey?.touch ?? "",
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).not.toMatch(/select point|clear selection|tool rail/);
    expect(blob).not.toMatch(/the other chart selects|highlight the same station/);
    expect(blob).toMatch(/inspect|pin|hover|date/);
  });
});

describe("example-interaction-api allowlist after Minard unlink", () => {
  it("no longer allowlists path/trajectory for createPlotInteraction", () => {
    const gate = readFileSync(INTERACTION_API, "utf8");
    expect(gate).not.toContain('LINKED_VIEW_ALLOWLIST = new Set(["path/trajectory"])');
    expect(gate).not.toMatch(/path\/trajectory.*allowlist|allowlist.*path\/trajectory/i);
  });
});
