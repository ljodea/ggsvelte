import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import {
  CATEGORICAL_SCHEME_REFS,
  PALETTE_HELPER_GROUPS,
  SEQUENTIAL_SCHEME_REFS,
} from "../apps/docs/src/lib/catalog/palette-reference.ts";
import {
  ALL_THEME_ROLES,
  THEME_COLOR_ROLES,
  THEME_SHELLS,
  themeComponentName,
} from "../apps/docs/src/lib/catalog/theme-reference.ts";
import {
  CATEGORICAL_SCHEME_NAMES,
  SEQUENTIAL_SCHEME_NAMES,
  THEME_NAMES,
} from "../packages/spec/src/schema-names.ts";

const THEMES_PAGE = readFileSync(
  join(import.meta.dir, "../apps/docs/src/routes/reference/themes/+page.svelte"),
  "utf8",
);

describe("theme reference catalog", () => {
  it("lists a shell for every registered theme name", () => {
    expect(THEME_SHELLS.map((s) => s.name)).toEqual([...THEME_NAMES]);
    expect(themeComponentName("economist_white")).toBe("ThemeEconomistwhite");
    expect(themeComponentName("solarized_2dark")).toBe("ThemeSolarized2dark");
    expect(themeComponentName("stata_s1color")).toBe("ThemeStatas1color");
    expect(THEME_SHELLS.find((s) => s.name === "grey")?.aliasOf).toBe("ggplot2");
    expect(THEME_SHELLS.find((s) => s.name === "gray")?.aliasOf).toBe("ggplot2");
  });

  it("covers color/interaction roles used for chrome recovery", () => {
    const names = new Set(THEME_COLOR_ROLES.map((r) => r.name));
    const required = [
      "ink",
      "paper",
      "interactionInk",
      "interactionMuted",
      "focusRing",
      "tooltipPaper",
      "tooltipInk",
      "tooltipBorder",
    ] as const;
    for (const role of required) {
      expect(names.has(role), role).toBe(true);
    }
    expect(ALL_THEME_ROLES.length).toBeGreaterThan(THEME_COLOR_ROLES.length);
  });

  it("documents elevated tooltip chrome on low-contrast built-ins", () => {
    // Author-facing contract from tooltip-contrast-defaults PR 4: these named
    // bases ship tip roles off the chart surface; object ThemeSpecs keep that
    // package unless tip roles are set.
    const elevated = [
      "solarized",
      "solarized_2",
      "solarizeddark",
      "solarized_2dark",
      "dark",
      "hcdark",
      "fivethirtyeight",
      "economist",
    ] as const;
    for (const name of elevated) {
      expect(THEMES_PAGE.includes(name), name).toBe(true);
    }
    expect(THEMES_PAGE).toMatch(/elevated tooltip/i);
    expect(THEMES_PAGE).toMatch(/elevated package unless[\s\S]*tooltipPaper/i);
  });
});

describe("palette reference catalog", () => {
  it("covers every registered scheme name", () => {
    expect(CATEGORICAL_SCHEME_REFS.map((s) => s.name)).toEqual([...CATEGORICAL_SCHEME_NAMES]);
    expect(SEQUENTIAL_SCHEME_REFS.map((s) => s.name)).toEqual([...SEQUENTIAL_SCHEME_NAMES]);
  });

  it("maps categorical schemes to discrete scale helpers", () => {
    const colorblind = CATEGORICAL_SCHEME_REFS.find((s) => s.name === "colorblind");
    expect(colorblind?.helpers).toContain("ScaleColorDiscrete");
    expect(colorblind?.helpers).toContain("ScaleFillDiscrete");

    const dark2 = CATEGORICAL_SCHEME_REFS.find((s) => s.name === "Dark2");
    expect(dark2?.helpers).toContain("ScaleColorBrewer");

    const hue = CATEGORICAL_SCHEME_REFS.find((s) => s.name === "hue");
    expect(hue?.helpers).toContain("ScaleColorHue");
  });

  it("maps sequential schemes to continuous helpers", () => {
    const viridis = SEQUENTIAL_SCHEME_REFS.find((s) => s.name === "viridis");
    expect(viridis?.helpers).toContain("ScaleColorViridisC");
    expect(viridis?.helpers).toContain("ScaleColorContinuous");

    const blues = SEQUENTIAL_SCHEME_REFS.find((s) => s.name === "Blues");
    expect(blues?.helpers).toContain("ScaleColorDistiller");
  });

  it("documents helper groups for discrete and continuous families", () => {
    expect(PALETTE_HELPER_GROUPS.map((g) => g.id)).toEqual(["discrete", "continuous"]);
  });
});
