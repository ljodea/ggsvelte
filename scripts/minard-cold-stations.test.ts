/**
 * Minard cold-strip stations join Column-1 retreat vertices by nearest
 * longitude so the two charts share a durable stationKey for linking.
 *
 * Worked values are from HistData::Minard.temp + Minard.troops (see
 * examples/path/trajectory/data.ts), not recomputed from the implementation.
 */
import { describe, expect, it } from "bun:test";

import {
  buildColdStations,
  minardCold,
  minardColdStations,
  minardTroops,
} from "../examples/path/trajectory/data.ts";

describe("buildColdStations", () => {
  it("returns one station per cold reading (9 in the HistData table)", () => {
    const stations = buildColdStations(minardCold, minardTroops);
    expect(stations).toHaveLength(9);
  });

  it("joins Nov 09 (long 33.2) to the nearest Column-1 retreat vertex", () => {
    const nov09 = buildColdStations(minardCold, minardTroops).find((s) => s.date === "Nov 09");
    expect(nov09).toEqual({
      stationKey: "33.2",
      long: 33.2,
      lat: 54.8,
      temp: -9,
      date: "Nov 09",
      survivors: 37000,
      direction: "Retreat",
    });
  });

  it("keeps an empty date when Minard left the reading blank", () => {
    const blank = buildColdStations(minardCold, minardTroops).find((s) => s.long === 29.2);
    expect(blank?.date).toBe("");
    expect(blank?.stationKey).toBe("29.2");
    expect(blank?.survivors).toBe(20000);
    // Column 1 Retreat vertex at long 29.2 (exact match)
    expect(blank?.lat).toBe(54.3);
  });

  it("never attaches Advance vertices (cold is retreat-only)", () => {
    for (const station of buildColdStations(minardCold, minardTroops)) {
      expect(station.direction).toBe("Retreat");
    }
  });

  it("uses unique stationKey values so linked identity is 1:1", () => {
    const keys = buildColdStations(minardCold, minardTroops).map((s) => s.stationKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("exports the prebuilt table used by the example", () => {
    expect(minardColdStations).toEqual(buildColdStations(minardCold, minardTroops));
  });
});
