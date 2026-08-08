/**
 * HistData integrity for Minard's cold strip — 9 temperature readings, not a
 * join product. Linking was abandoned because troop vertices and cold readings
 * are different series (see minard-linked-stations.test.ts).
 */
import { describe, expect, it } from "bun:test";

import { minardCold, minardTroops } from "../examples/path/trajectory/data.ts";

describe("HistData Minard.temp transcription", () => {
  it("has exactly nine cold readings (HistData::Minard.temp)", () => {
    expect(minardCold).toHaveLength(9);
  });

  it("matches the known HistData long/temp/date table", () => {
    // Worked values from HistData::Minard.temp (and stdlib-js transcription).
    // Fifth reading date is blank in the source.
    expect(minardCold).toEqual([
      { long: 37.6, temp: 0, date: "Oct 18" },
      { long: 36, temp: 0, date: "Oct 24" },
      { long: 33.2, temp: -9, date: "Nov 09" },
      { long: 32, temp: -21, date: "Nov 14" },
      { long: 29.2, temp: -11, date: "" },
      { long: 28.5, temp: -20, date: "Nov 28" },
      { long: 27.2, temp: -24, date: "Dec 01" },
      { long: 26.7, temp: -30, date: "Dec 06" },
      { long: 25.3, temp: -26, date: "Dec 07" },
    ]);
  });

  it("has more Column-1 retreat vertices than cold readings (series mismatch)", () => {
    const retreat = minardTroops.filter((t) => t.leg === "Column 1 Retreat");
    expect(retreat.length).toBeGreaterThan(minardCold.length);
    expect(retreat.length).toBe(19);
  });

  it("does not export a nearest-longitude station join", async () => {
    const data = await import("../examples/path/trajectory/data.ts");
    expect("buildColdStations" in data).toBe(false);
    expect("attachColdDatesToTroops" in data).toBe(false);
    expect("minardColdStations" in data).toBe(false);
    expect("minardTroopsWithCold" in data).toBe(false);
  });
});
