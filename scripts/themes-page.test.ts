import { describe, expect, it } from "bun:test";

import {
  CATEGORICAL_PALETTES,
  THEME_OPTIONS,
  VIRIDIS_COLORS,
} from "../apps/docs/src/lib/catalog/themes.ts";
import { colorBehaviorEvidence } from "./color-evidence.ts";
import {
  MONTH_BREAKS,
  RASTER_Z_DOMAIN,
  THEME_SPECIMENS,
} from "../apps/docs/src/lib/theme-specimens/catalog.ts";
import { TEMPERATURES_CHART } from "../apps/docs/src/lib/theme-specimens/temperatures-chart.ts";

describe("themes catalog", () => {
  it("projects every public theme and categorical palette without docs-owned colors", () => {
    // grey/gray alias ggplot2 (#824) — one picker row (ggplot2), not three.
    expect(THEME_OPTIONS.map(({ name, scheme }) => ({ name, scheme }))).toEqual([
      { name: "default", scheme: "observable10" },
      { name: "light", scheme: "tableau10" },
      { name: "dark", scheme: "flexoki" },
      { name: "minimal", scheme: "colorblind" },
      { name: "ggplot2", scheme: "observable10" },
      { name: "classic", scheme: "tableau10" },
      { name: "bw", scheme: "tableau10" },
      { name: "hrbr", scheme: "ipsum" },
      { name: "few", scheme: "few" },
      { name: "clean", scheme: "flexoki" },
      { name: "fivethirtyeight", scheme: "fivethirtyeight" },
      { name: "economist", scheme: "economist" },
      { name: "tufte", scheme: "colorblind" },
      { name: "linedraw", scheme: "colorblind" },
      { name: "void", scheme: "colorblind" },
      { name: "stata", scheme: "stata" },
      { name: "stata_s1color", scheme: "stata" },
      { name: "solarized", scheme: "solarized" },
      { name: "solarizeddark", scheme: "solarized" },
      { name: "economist_white", scheme: "economist" },
      { name: "solarized_2", scheme: "solarized" },
      { name: "solarized_2dark", scheme: "solarized" },
      { name: "wsj", scheme: "wsj" },
      { name: "gdocs", scheme: "gdocs" },
      { name: "hc", scheme: "tableau10" },
      { name: "hcdark", scheme: "flexoki" },
      { name: "pander", scheme: "pander" },
      { name: "base", scheme: "tableau10" },
      { name: "igray", scheme: "tableau10" },
      { name: "map", scheme: "colorblind" },
      { name: "solid", scheme: "colorblind" },
      { name: "test", scheme: "colorblind" },
    ]);
    expect(THEME_OPTIONS.map((theme) => theme.name)).not.toContain("grey");
    expect(THEME_OPTIONS.map((theme) => theme.name)).not.toContain("gray");

    const byName = new Map(CATEGORICAL_PALETTES.map((p) => [p.name, p]));
    for (const name of ["observable10", "stata", "tableau10", "gdocs", "pander", "grey"] as const) {
      expect(byName.get(name), name).toBeDefined();
    }
    // Removed spreadsheet/Highcharts/extra-Stata schemes must not reappear.
    const paletteNames = new Set(CATEGORICAL_PALETTES.map((p) => p.name as string));
    for (const name of [
      "stata_s1color",
      "stata_s1rcolor",
      "stata_mono",
      "hc",
      "hc_dark",
      "calc",
      "excel",
      "excel_fill",
      "excel_new",
    ]) {
      expect(paletteNames.has(name), name).toBe(false);
    }
    expect(byName.get("stata")!.capacity).toBe(15);
    expect(byName.get("gdocs")!.capacity).toBeGreaterThan(0);
    // Registry size is owned by schema-names; keep a lower bound so shrinks fail.
    expect(CATEGORICAL_PALETTES.length).toBeGreaterThanOrEqual(35);
    expect(CATEGORICAL_PALETTES.map((palette) => palette.name)).not.toContain("gray");

    expect(VIRIDIS_COLORS).toEqual([
      "#440154",
      "#482878",
      "#3e4989",
      "#31688e",
      "#26828e",
      "#1f9e89",
      "#35b779",
      "#6ece58",
      "#b5de2b",
      "#fde725",
    ]);
  });

  it("lists every non-alias theme as a full-width specimen with a real chart kind", () => {
    // THEME_OPTIONS already drops grey/gray aliases (#824) — specimens match 1:1.
    expect(THEME_SPECIMENS.map((specimen) => specimen.name)).toEqual(
      THEME_OPTIONS.map((theme) => theme.name),
    );
    for (const specimen of THEME_SPECIMENS) {
      expect(specimen.caption.length).toBeGreaterThan(12);
      expect(specimen.caption.length).toBeLessThanOrEqual(96);
      expect(specimen.scheme).toBe(
        THEME_OPTIONS.find((theme) => theme.name === specimen.name)!.scheme,
      );
    }
    expect(new Set(THEME_SPECIMENS.map((specimen) => specimen.kind)).size).toBeGreaterThanOrEqual(
      6,
    );
    expect(RASTER_Z_DOMAIN[0]).toBeLessThan(RASTER_Z_DOMAIN[1]);
    // Macdonell man-counts (thumbnail window); mid pin sits inside observed z.
    expect(RASTER_Z_DOMAIN[0]).toBeGreaterThan(0);
    expect(RASTER_Z_DOMAIN[1]).toBeLessThanOrEqual(100);
  });

  it("reports incompatible schemes and palette exhaustion through public boundaries", () => {
    expect(colorBehaviorEvidence()).toEqual({
      incompatible: {
        code: "scale-scheme-type",
        path: "/scales/color/scheme",
        message: 'The categorical scheme "ipsum" cannot be used with a sequential color scale.',
        fix: 'Use "viridis" or provide a sequential range of #rgb/#rrggbb stops.',
      },
      cycle: {
        code: "palette-exhausted",
        message:
          "More than 2 discrete values; cycling the palette. Consider an explicit domain or a larger range. (Warned once.)",
      },
      error: {
        code: "palette-exhausted",
        path: "/scales/color",
        message:
          "Palette exhausted: 3 discrete values but range has only 2 entries and onExhaust is 'error'. Provide a larger range or an explicit domain.",
      },
    });
  });
});

describe("hero temperatures chart config", () => {
  it("keeps month breaks stable for TemperaturesSpecimen (no plot key)", () => {
    // Row identity defaults to id/index — chart config no longer carries key.
    expect("key" in TEMPERATURES_CHART).toBe(false);
    expect([...TEMPERATURES_CHART.monthBreaks]).toEqual([...MONTH_BREAKS]);
  });
});
