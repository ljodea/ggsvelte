/**
 * Slice B: map-panel tooltips must carry Minard's cold date.
 * attachColdDatesToTroops stamps the nearest Column-1 retreat vertex;
 * the live Example maps label:"date" on that path so default Inspect shows it.
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

  it("uses the date-stamped troop table on the march path", () => {
    expect(source).toContain("minardTroopsWithCold");
    expect(source).toMatch(/data=\{minardTroopsWithCold\}/);
  });

  it("maps label to date on the inspectable troop path so pin shows the date", () => {
    // Slice from the troops data prop only (avoids matching the rivers GeomPath).
    const dataAt = source.indexOf("data={minardTroopsWithCold}");
    expect(dataAt).toBeGreaterThan(-1);
    const openAt = source.lastIndexOf("<GeomPath", dataAt);
    const closeAt = source.indexOf("/>", dataAt);
    expect(openAt).toBeGreaterThan(-1);
    expect(closeAt).toBeGreaterThan(openAt);
    const troopPath = source.slice(openAt, closeAt + 2);
    expect(troopPath).toMatch(/label:\s*["']date["']/);
    expect(troopPath).not.toContain("inspect={false}");
  });

  it("keeps cold-station points on the map with date in aes for pin targets", () => {
    expect(source).toContain("minardColdStations");
    const stationPoint = source.match(
      /<GeomPoint[\s\S]*?data=\{minardColdStations\}[\s\S]*?\/>/,
    )?.[0];
    expect(stationPoint).toBeDefined();
    expect(stationPoint!).toMatch(/label:\s*["']date["']/);
  });
});
