import { describe, expect, it } from "bun:test";

import {
  CATEGORICAL_PALETTES,
  THEME_OPTIONS,
  VIRIDIS_COLORS,
} from "../apps/docs/src/lib/catalog/themes.ts";
import { colorBehaviorEvidence } from "../apps/docs/src/lib/color-evidence.ts";

describe("themes catalog", () => {
  it("projects every public theme and categorical palette without docs-owned colors", () => {
    expect(THEME_OPTIONS.map(({ name }) => name)).toEqual([
      "default",
      "light",
      "dark",
      "minimal",
      "ggplot2",
      "classic",
      "hrbr",
      "few",
      "clean",
      "fivethirtyeight",
      "economist",
      "tufte",
    ]);

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

  it("reports incompatible schemes and palette exhaustion through public boundaries", () => {
    expect(colorBehaviorEvidence()).toEqual({
      incompatible: {
        code: "scale-scheme-type",
        path: "/scales/color/scheme",
        message: 'The sequential scheme "viridis" cannot be used with an ordinal color scale.',
        fix: "Use a categorical scheme or provide an ordinal range of CSS colors.",
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
