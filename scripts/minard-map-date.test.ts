/**
 * Cold dates stamp onto Column-1 retreat vertices for the map path pin.
 * Live Example maps label:"date" on minardTroopsWithCold (inspect-only path).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  attachColdDatesToTroops,
  buildColdStations,
  minardCold,
  minardTroops,
  minardTroopsWithCold,
} from "../examples/path/trajectory/data.ts";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");

describe("attachColdDatesToTroops", () => {
  it("stamps Nov 09 on the nearest Column-1 retreat vertex (long 33.3)", () => {
    const stations = buildColdStations(minardCold, minardTroops);
    const rows = attachColdDatesToTroops(minardTroops, stations);
    const hit = rows.find((r) => r.long === 33.3 && r.leg === "Column 1 Retreat");
    expect(hit).toMatchObject({
      date: "Nov 09",
      stationKey: "33.2",
      survivors: 37000,
    });
  });

  it("leaves Advance vertices without a cold date", () => {
    const stations = buildColdStations(minardCold, minardTroops);
    const rows = attachColdDatesToTroops(minardTroops, stations);
    for (const row of rows.filter((r) => r.direction === "Advance")) {
      expect(row.date).toBe("");
      expect(row.stationKey).toBe("");
    }
  });

  it("exports the prebuilt troop table for the example", () => {
    expect(minardTroopsWithCold).toEqual(
      attachColdDatesToTroops(minardTroops, buildColdStations(minardCold, minardTroops)),
    );
  });
});

describe("path/trajectory Example map date tooltip wiring", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("maps label to date on the stamped troop path so the pin can show the date", () => {
    expect(source).toContain("minardTroopsWithCold");
    // Match the open tag after data={minardTroopsWithCold} only (not rivers).
    const path = source.match(/<GeomPath\s+data=\{minardTroopsWithCold\}[\s\S]*?\/>/)?.[0];
    expect(path).toBeDefined();
    expect(path!).toMatch(/label:\s*["']date["']/);
    expect(path!).not.toContain("inspect={false}");
  });

  it("does not mount a second cold-station point layer on the map", () => {
    const mapPlot = (source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [])[0] ?? "";
    expect(mapPlot).not.toMatch(/data=\{minardColdStations\}/);
  });

  it("keeps the portable map spec on the stamped troop path with date labels", () => {
    const spec = readFileSync(join(ROOT, "examples/path/trajectory/spec.ts"), "utf8");
    expect(spec).toContain("minardTroopsWithCold");
    expect(spec).toMatch(/label:\s*["']date["']/);
    expect(spec).not.toMatch(/gg\(minardTroops\b/);
  });
});
