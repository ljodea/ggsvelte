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
      { name: "few", scheme: "tableau10" },
      { name: "clean", scheme: "flexoki" },
      { name: "fivethirtyeight", scheme: "tableau10" },
      { name: "economist", scheme: "flexoki" },
      { name: "tufte", scheme: "colorblind" },
      { name: "linedraw", scheme: "colorblind" },
      { name: "void", scheme: "colorblind" },
      { name: "test", scheme: "colorblind" },
    ]);
    expect(THEME_OPTIONS.map((theme) => theme.name)).not.toContain("grey");
    expect(THEME_OPTIONS.map((theme) => theme.name)).not.toContain("gray");

    expect(CATEGORICAL_PALETTES).toEqual([
      {
        name: "observable10",
        label: "Observable 10",
        capacity: 10,
        colors: [
          "#4269d0",
          "#efb118",
          "#ff725c",
          "#6cc5b0",
          "#3ca951",
          "#ff8ab7",
          "#a463f2",
          "#97bbf5",
          "#9c6b4e",
          "#9498a0",
        ],
      },
      {
        name: "ipsum",
        label: "Ipsum",
        capacity: 9,
        colors: [
          "#d18975",
          "#8fd175",
          "#3f2d54",
          "#75b8d1",
          "#2d543d",
          "#c9d175",
          "#d1ab75",
          "#d175b8",
          "#758bd1",
        ],
      },
      {
        name: "flexoki",
        label: "Flexoki",
        capacity: 8,
        colors: [
          "#D14D41",
          "#DA702C",
          "#D0A215",
          "#879A39",
          "#3AA99F",
          "#4385BE",
          "#8B7EC8",
          "#CE5D97",
        ],
      },
      {
        name: "tableau10",
        label: "Tableau 10",
        capacity: 10,
        colors: [
          "#4E79A7",
          "#F28E2B",
          "#E15759",
          "#76B7B2",
          "#59A14F",
          "#EDC948",
          "#B07AA1",
          "#FF9DA7",
          "#9C755F",
          "#BAB0AC",
        ],
      },
      {
        name: "colorblind",
        label: "Colorblind",
        capacity: 8,
        colors: [
          "#000000",
          "#E69F00",
          "#56B4E9",
          "#009E73",
          "#F0E442",
          "#0072B2",
          "#D55E00",
          "#CC79A7",
        ],
      },
      {
        name: "Set1",
        label: "Set1",
        capacity: 9,
        colors: [
          "#e41a1c",
          "#377eb8",
          "#4daf4a",
          "#984ea3",
          "#ff7f00",
          "#ffff33",
          "#a65628",
          "#f781bf",
          "#999999",
        ],
      },
      {
        name: "Set2",
        label: "Set2",
        capacity: 8,
        colors: [
          "#66c2a5",
          "#fc8d62",
          "#8da0cb",
          "#e78ac3",
          "#a6d854",
          "#ffd92f",
          "#e5c494",
          "#b3b3b3",
        ],
      },
      {
        name: "Set3",
        label: "Set3",
        capacity: 12,
        colors: [
          "#8dd3c7",
          "#ffffb3",
          "#bebada",
          "#fb8072",
          "#80b1d3",
          "#fdb462",
          "#b3de69",
          "#fccde5",
          "#d9d9d9",
          "#bc80bd",
          "#ccebc5",
          "#ffed6f",
        ],
      },
      {
        name: "Dark2",
        label: "Dark2",
        capacity: 8,
        colors: [
          "#1b9e77",
          "#d95f02",
          "#7570b3",
          "#e7298a",
          "#66a61e",
          "#e6ab02",
          "#a6761d",
          "#666666",
        ],
      },
      {
        name: "Paired",
        label: "Paired",
        capacity: 12,
        colors: [
          "#a6cee3",
          "#1f78b4",
          "#b2df8a",
          "#33a02c",
          "#fb9a99",
          "#e31a1c",
          "#fdbf6f",
          "#ff7f00",
          "#cab2d6",
          "#6a3d9a",
          "#ffff99",
          "#b15928",
        ],
      },
      {
        name: "Accent",
        label: "Accent",
        capacity: 8,
        colors: [
          "#7fc97f",
          "#beaed4",
          "#fdc086",
          "#ffff99",
          "#386cb0",
          "#f0027f",
          "#bf5b17",
          "#666666",
        ],
      },
      {
        name: "hue",
        label: "Hue",
        capacity: 10,
        colors: [
          "#ff794d",
          "#ffe44d",
          "#afff4d",
          "#4dff55",
          "#4dffc1",
          "#4dd2ff",
          "#4d67ff",
          "#9d4dff",
          "#ff4df6",
          "#ff4d8b",
        ],
      },
      {
        name: "grey",
        label: "Grey",
        capacity: 10,
        colors: [
          "#333333",
          "#444444",
          "#555555",
          "#666666",
          "#777777",
          "#888888",
          "#999999",
          "#aaaaaa",
          "#bbbbbb",
          "#cccccc",
        ],
      },
      {
        name: "gray",
        label: "Gray",
        capacity: 10,
        colors: [
          "#333333",
          "#444444",
          "#555555",
          "#666666",
          "#777777",
          "#888888",
          "#999999",
          "#aaaaaa",
          "#bbbbbb",
          "#cccccc",
        ],
      },
    ]);

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
  it("keeps key and month breaks stable for TemperaturesSpecimen", () => {
    expect(TEMPERATURES_CHART.key).toBe("id");
    expect([...TEMPERATURES_CHART.monthBreaks]).toEqual([...MONTH_BREAKS]);
  });
});
