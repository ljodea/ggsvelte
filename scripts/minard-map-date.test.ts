/**
 * Map panel uses plain minardTroops (survivors on the band). Cold dates live
 * only on the temperature strip — not stamped onto path vertices via a
 * nearest-longitude join that invents false station pairs.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");
const SPEC = join(ROOT, "examples/path/trajectory/spec.ts");

describe("path/trajectory map uses plain troop path (no cold stamp)", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("march path data is minardTroops, not a cold-joined table", () => {
    expect(source).toContain("minardTroops");
    expect(source).not.toContain("minardTroopsWithCold");
    const path = source.match(/<GeomPath\s+data=\{minardTroops\}[\s\S]*?\/>/)?.[0];
    expect(path).toBeDefined();
    expect(path!).not.toContain("inspect={false}");
    // Custom content: survivors only — no kitchen-sink label:date on the map path.
    expect(source).toContain("mapMarchTooltipFields");
    expect(path!).not.toMatch(/label:\s*["']date["']/);
  });

  it("mounts no cold points on the map panel", () => {
    const mapPlot = (source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [])[0] ?? "";
    expect(mapPlot).not.toMatch(/data=\{minardCold/);
  });

  it("portable map spec uses plain minardTroops without cold ring anchors", () => {
    const spec = readFileSync(SPEC, "utf8");
    expect(spec).toContain("minardTroops");
    expect(spec).not.toContain("minardTroopsWithCold");
    expect(spec).not.toContain("minardColdStations");
    expect(spec).not.toMatch(/\.geomPoint\(/);
  });
});
