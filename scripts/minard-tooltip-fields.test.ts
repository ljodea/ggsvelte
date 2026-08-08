/**
 * Minard tooltip field policy: survivors only on the map; temperature + date
 * (when present) on the strip. Empty dates never become tooltip rows.
 * No stationKey / mapRowIdentity — linking is abandoned.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  coldStripTooltipFields,
  mapMarchTooltipFields,
} from "../examples/path/trajectory/tooltip.ts";

const ROOT = join(import.meta.dir, "..");
const TOOLTIP = join(ROOT, "examples/path/trajectory/tooltip.ts");

describe("mapMarchTooltipFields", () => {
  it("shows survivors only (dates live on the cold strip, not the path)", () => {
    expect(mapMarchTooltipFields({ survivors: 340000, date: "Oct 18" })).toEqual([
      { label: "Survivors", value: "340,000" },
    ]);
    expect(mapMarchTooltipFields({ survivors: 37000 })).toEqual([
      { label: "Survivors", value: "37,000" },
    ]);
  });

  it("never includes direction, long, lat, or date", () => {
    const fields = mapMarchTooltipFields({
      survivors: 20000,
      date: "Nov 28",
      direction: "Retreat",
      long: 28.5,
      lat: 54.2,
    });
    const labels = fields.map((f) => f.label.toLowerCase());
    expect(labels).toEqual(["survivors"]);
    expect(labels).not.toContain("direction");
    expect(labels).not.toContain("date");
    expect(labels).not.toContain("long");
    expect(labels).not.toContain("lat");
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

describe("tooltip module has no link helpers", () => {
  it("does not export stationKeyFromInspectRow or mapRowIdentity", () => {
    const source = readFileSync(TOOLTIP, "utf8");
    expect(source).not.toContain("stationKeyFromInspectRow");
    expect(source).not.toContain("mapRowIdentity");
  });
});
