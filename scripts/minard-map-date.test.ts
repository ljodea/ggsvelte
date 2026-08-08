/**
 * Slice B/C: map-panel tooltips carry Minard's cold date on station points.
 * attachColdDatesToTroops remains available for stamped troop tables; the live
 * Example maps label:"date" on minardColdStations points only (unique keys).
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

  it("maps label to date on cold-station points so map pin shows the date", () => {
    expect(source).toContain("minardColdStations");
    const stationPoint = source.match(
      /<GeomPoint[\s\S]*?data=\{minardColdStations\}[\s\S]*?\/>/,
    )?.[0];
    expect(stationPoint).toBeDefined();
    expect(stationPoint!).toMatch(/label:\s*["']date["']/);
    expect(stationPoint!).not.toContain("inspect={false}");
  });

  it("keeps the march path free of stationKey collisions (plain minardTroops)", () => {
    const mapPlot = (source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [])[0] ?? "";
    expect(mapPlot).toMatch(/data=\{minardTroops\}/);
    expect(mapPlot).not.toContain("minardTroopsWithCold");
  });
});
