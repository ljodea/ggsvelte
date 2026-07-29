import { describe, expect, it } from "bun:test";

import { CATEGORICAL_PALETTES } from "../apps/docs/src/lib/catalog/themes.ts";
import { paletteSpecimenChart } from "../apps/docs/src/lib/theme-specimens/palette-bars.ts";

describe("paletteSpecimenChart", () => {
  it("returns exactly capacity categories for every showcase palette", () => {
    for (const palette of CATEGORICAL_PALETTES) {
      const chart = paletteSpecimenChart(palette.capacity);
      expect(chart.rows.length, palette.name).toBe(palette.capacity);
      const labels = new Set(chart.rows.map((row) => row.category));
      expect(labels.size, palette.name).toBe(palette.capacity);
    }
  });

  it("picks capacity-matched historical series", () => {
    expect(paletteSpecimenChart(2).title).toContain("polio");
    expect(paletteSpecimenChart(3).rows.map((r) => r.category)).toEqual([
      "Vaccinated",
      "Placebo",
      "Not inoculated",
    ]);
    expect(paletteSpecimenChart(4).title).toContain("Armada");
    expect(paletteSpecimenChart(8).rows).toHaveLength(8);
    expect(paletteSpecimenChart(10).rows).toHaveLength(10);
    expect(paletteSpecimenChart(12).title).toContain("Langren");
    expect(paletteSpecimenChart(12).flip).toBe(true);
    expect(paletteSpecimenChart(15).title).toContain("chest");
    expect(paletteSpecimenChart(20).title).toContain("cholera");
    expect(paletteSpecimenChart(24).rows).toHaveLength(24);
  });

  it("rejects capacities outside the curated range", () => {
    expect(() => paletteSpecimenChart(0)).toThrow(/1\.\./);
    expect(() => paletteSpecimenChart(25)).toThrow(/1\.\./);
  });
});
