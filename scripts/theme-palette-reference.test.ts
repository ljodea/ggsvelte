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

describe("theme reference catalog", () => {
  it("lists a shell for every registered theme name", () => {
    expect(THEME_SHELLS.map((s) => s.name)).toEqual([...THEME_NAMES]);
    expect(themeComponentName("economist_white")).toBe("ThemeEconomistwhite");
    expect(themeComponentName("solarized_2dark")).toBe("ThemeSolarized2dark");
    expect(themeComponentName("excel_new")).toBe("ThemeExcelnew");
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
});

describe("palette reference catalog", () => {
  it("covers every registered scheme name", () => {
    expect(CATEGORICAL_SCHEME_REFS.map((s) => s.name)).toEqual([...CATEGORICAL_SCHEME_NAMES]);
    expect(SEQUENTIAL_SCHEME_REFS.map((s) => s.name)).toEqual([...SEQUENTIAL_SCHEME_NAMES]);
  });

  it("maps categorical schemes to discrete scale helpers", () => {
    const tableau = CATEGORICAL_SCHEME_REFS.find((s) => s.name === "tableau10");
    expect(tableau?.helpers).toContain("ScaleColorDiscrete");
    expect(tableau?.helpers).toContain("ScaleFillDiscrete");

    const set2 = CATEGORICAL_SCHEME_REFS.find((s) => s.name === "Set2");
    expect(set2?.helpers).toContain("ScaleColorBrewer");

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
