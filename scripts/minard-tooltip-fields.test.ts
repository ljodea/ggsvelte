/**
 * Minard tooltip field policy: survivors + date (when present) only.
 * Empty dates never become tooltip rows; direction/long/lat stay out.
 */
import { describe, expect, it } from "bun:test";

import { minardColdStations, minardTroopsWithCold } from "../examples/path/trajectory/data.ts";
import {
  coldStripTooltipFields,
  mapMarchTooltipFields,
  mapRowIdentity,
  stationKeyFromInspectRow,
} from "../examples/path/trajectory/tooltip.ts";

describe("mapMarchTooltipFields", () => {
  it("shows survivors only when date is empty (advance / non-station)", () => {
    expect(mapMarchTooltipFields({ survivors: 340000, date: "", direction: "Advance" })).toEqual([
      { label: "Survivors", value: "340,000" },
    ]);
  });

  it("shows survivors and date on a cold-aligned retreat vertex", () => {
    expect(
      mapMarchTooltipFields({
        survivors: 37000,
        date: "Nov 09",
        direction: "Retreat",
        long: 33.3,
        lat: 54.8,
      }),
    ).toEqual([
      { label: "Survivors", value: "37,000" },
      { label: "Date", value: "Nov 09" },
    ]);
  });

  it("never includes direction, long, or lat", () => {
    const fields = mapMarchTooltipFields({
      survivors: 20000,
      date: "Nov 28",
      direction: "Retreat",
      long: 28.5,
      lat: 54.2,
    });
    const labels = fields.map((f) => f.label.toLowerCase());
    expect(labels).not.toContain("direction");
    expect(labels).not.toContain("long");
    expect(labels).not.toContain("lat");
    expect(labels).not.toContain("longitude");
    expect(labels).not.toContain("latitude");
  });
});

describe("coldStripTooltipFields", () => {
  it("shows temperature and date when date is present", () => {
    expect(coldStripTooltipFields({ temp: -21, date: "Nov 14", long: 32 })).toEqual([
      { label: "Temperature", value: "−21 °Réaumur" },
      { label: "Date", value: "Nov 14" },
    ]);
  });

  it("omits the date row when Minard left the reading blank", () => {
    expect(coldStripTooltipFields({ temp: -11, date: "", long: 29.2 })).toEqual([
      { label: "Temperature", value: "−11 °Réaumur" },
    ]);
  });
});

describe("stationKeyFromInspectRow", () => {
  it("returns stationKey when non-empty", () => {
    expect(stationKeyFromInspectRow({ stationKey: "33.2", date: "Nov 09" })).toBe("33.2");
  });

  it("returns null for empty stationKey, missing row, or blank", () => {
    expect(stationKeyFromInspectRow({ stationKey: "", survivors: 340000 })).toBeNull();
    expect(stationKeyFromInspectRow(null)).toBeNull();
    expect(stationKeyFromInspectRow(undefined)).toBeNull();
    expect(stationKeyFromInspectRow({ survivors: 100 })).toBeNull();
  });
});

describe("mapRowIdentity", () => {
  it("gives cold stations their stationKey and troops unique non-link keys", () => {
    const stationKeys = minardColdStations.map((row) =>
      mapRowIdentity(row as unknown as Record<string, unknown>),
    );
    const troopKeys = minardTroopsWithCold.map((row) =>
      mapRowIdentity(row as unknown as Record<string, unknown>),
    );
    expect(new Set(stationKeys).size).toBe(stationKeys.length);
    expect(new Set(troopKeys).size).toBe(troopKeys.length);
    // No path vertex reuses a station identity — prevents INTERACTION_DUPLICATE_KEY.
    for (const key of stationKeys) {
      expect(troopKeys).not.toContain(key);
    }
    // Stamped troops still expose stationKey for oninspect linking.
    const nov09 = minardTroopsWithCold.find(
      (r) => r.date === "Nov 09" && r.leg === "Column 1 Retreat",
    );
    expect(nov09?.stationKey).toBe("33.2");
    expect(mapRowIdentity(nov09 as unknown as Record<string, unknown>)).not.toBe("33.2");
  });
});
