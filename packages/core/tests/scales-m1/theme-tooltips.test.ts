/**
 * Theme registry: tooltip card elevation and sticky-when-elevated derivation
 * contracts (split from sequential-and-theme).
 */
import { describe, expect, it } from "bun:test";

import { themed } from "../../src/theme-builtins.ts";
import { BUILTIN_THEMES, LEGACY_BUILTIN_THEMES, resolveTheme } from "../../src/theme.ts";

describe("theme registry", () => {
  // #1069 — flat tooltip chrome only for unframed gridless themes (tufte/void).
  // Framed gridless themes (few/classic) keep panelBorder keylines.
  it("unframed gridless themes derive a flat tooltip keyline; framed ones keep panelBorder", () => {
    expect(BUILTIN_THEMES.tufte.grid).toBe("none");
    expect(BUILTIN_THEMES.tufte.tooltipBorder).toBe("transparent");
    expect(BUILTIN_THEMES.tufte.tooltipBorder).not.toBe(BUILTIN_THEMES.tufte.panelBorder);
    expect(BUILTIN_THEMES.void.grid).toBe("none");
    expect(BUILTIN_THEMES.void.tooltipBorder).toBe("transparent");

    // few: gridless but showPanelBorder — keep the panel border keyline.
    expect(BUILTIN_THEMES.few.grid).toBe("none");
    expect(BUILTIN_THEMES.few.showPanelBorder).toBe(true);
    expect(BUILTIN_THEMES.few.tooltipBorder).toBe(BUILTIN_THEMES.few.panelBorder);
    expect(BUILTIN_THEMES.few.tooltipBorder).not.toBe("transparent");

    // classic: gridless but axis lines — keep the panel border keyline.
    expect(BUILTIN_THEMES.classic.grid).toBe("none");
    expect(BUILTIN_THEMES.classic.axisLineX).toBe(true);
    expect(BUILTIN_THEMES.classic.tooltipBorder).toBe(BUILTIN_THEMES.classic.panelBorder);
    expect(BUILTIN_THEMES.classic.tooltipBorder).not.toBe("transparent");

    // Themes that still draw a grid keep a visible hairline from the grid color.
    expect(BUILTIN_THEMES.default.tooltipBorder).toBe(BUILTIN_THEMES.default.grid);
    expect(BUILTIN_THEMES.default.tooltipBorder).not.toBe("transparent");
    expect(BUILTIN_THEMES.light.tooltipBorder).toBe(BUILTIN_THEMES.light.grid);

    // Object overrides still win over the derivation.
    expect(resolveTheme({ name: "tufte", tooltipBorder: "#aabbcc" }).tooltipBorder).toBe("#aabbcc");
  });

  it("themed() accepts tooltip role overrides", () => {
    const tokens = themed({
      paper: "#111111",
      ink: "#eeeeee",
      tooltipPaper: "#222222",
      tooltipInk: "#ffffff",
      tooltipBorder: "#444444",
    });
    expect(tokens.tooltipPaper).toBe("#222222");
    expect(tokens.tooltipInk).toBe("#ffffff");
    expect(tokens.tooltipBorder).toBe("#444444");
  });

  it("object path sticky-when-elevated: pure themes still re-derive tip from paper", () => {
    const tokens = resolveTheme({ name: "default", paper: "#ffeeee" });
    expect(tokens.tooltipPaper).toBe("#ffeeee");
  });

  it("object path sticky-when-elevated: elevated base tips stick without explicit tip*", () => {
    // Synthetic complete theme: pure derivation would set tip = paper, but the
    // frozen entry elevates the tip package above that derivation.
    const elevated = themed({
      paper: "#16181d",
      panel: "#16181d",
      ink: "#e6e8eb",
      grid: "#3b3f46",
      tooltipPaper: "#22262d",
      tooltipInk: "#ffffff",
      tooltipBorder: "#555555",
    });
    const builtins = { ...BUILTIN_THEMES, default: elevated };
    const viaString = resolveTheme("default", builtins);
    const viaObject = resolveTheme({ name: "default", titleSize: 20 }, builtins);
    const viaAccentOnly = resolveTheme({ name: "default", accent: "#ff0000" }, builtins);

    expect(viaString.tooltipPaper).toBe("#22262d");
    expect(viaObject.tooltipPaper).toBe("#22262d");
    expect(viaObject.tooltipInk).toBe("#ffffff");
    expect(viaObject.tooltipBorder).toBe("#555555");
    expect(viaAccentOnly.tooltipPaper).toBe("#22262d");
    // Explicit tip still wins over sticky elevation.
    expect(resolveTheme({ name: "default", tooltipPaper: "#111111" }, builtins).tooltipPaper).toBe(
      "#111111",
    );
  });

  it("object path sticky-when-elevated: few/classic keep panelBorder keyline (no false-sticky)", () => {
    // Guards incomplete pureFromBase foundation lists that would re-derive
    // transparent borders for framed gridless themes.
    expect(resolveTheme({ name: "few", fontSize: 14 }).tooltipBorder).toBe(
      BUILTIN_THEMES.few.panelBorder,
    );
    expect(resolveTheme({ name: "classic", fontSize: 14 }).tooltipBorder).toBe(
      BUILTIN_THEMES.classic.panelBorder,
    );
    expect(resolveTheme({ name: "tufte", fontSize: 14 }).tooltipBorder).toBe("transparent");
  });

  it("Solarized family elevates tooltip cards above the reading surface", () => {
    const PROBLEM_SOLARIZED = [
      "solarized",
      "solarizeddark",
      "solarized_2",
      "solarized_2dark",
    ] as const;

    for (const name of PROBLEM_SOLARIZED) {
      const tokens = BUILTIN_THEMES[name];
      const readingSurface = tokens.paper === "none" ? tokens.panel : tokens.paper;
      const viaString = resolveTheme(name);
      const viaObject = resolveTheme({ name, titleSize: 20 });

      expect(viaString.tooltipPaper, name).toBe(tokens.tooltipPaper);
      expect(viaObject.tooltipPaper, name).toBe(tokens.tooltipPaper);
      expect(tokens.tooltipPaper, name).not.toBe(readingSurface);
      // LEGACY spreads edition-2 Solarized tips.
      expect(LEGACY_BUILTIN_THEMES[name].tooltipPaper, name).toBe(tokens.tooltipPaper);
    }

    // Exact Schoonover anchors (tip ink stronger than axis ink on low-contrast bases).
    expect(BUILTIN_THEMES.solarized.tooltipPaper).toBe("#eee8d5"); // base2
    expect(BUILTIN_THEMES.solarized.tooltipInk).toBe("#586e75"); // base01
    expect(BUILTIN_THEMES.solarized.tooltipBorder).toBe("#93a1a1"); // base1
    expect(BUILTIN_THEMES.solarized.tooltipInk).not.toBe(BUILTIN_THEMES.solarized.ink);

    expect(BUILTIN_THEMES.solarized_2.tooltipPaper).toBe("#fdf6e3"); // base3
    expect(BUILTIN_THEMES.solarized_2.tooltipInk).toBe("#586e75");
    expect(BUILTIN_THEMES.solarized_2.tooltipBorder).toBe("#93a1a1");

    expect(BUILTIN_THEMES.solarizeddark.tooltipPaper).toBe("#073642"); // base02
    expect(BUILTIN_THEMES.solarizeddark.tooltipInk).toBe("#93a1a1"); // base1
    expect(BUILTIN_THEMES.solarizeddark.tooltipBorder).toBe("#586e75"); // base01
    expect(BUILTIN_THEMES.solarizeddark.tooltipInk).not.toBe(BUILTIN_THEMES.solarizeddark.ink);

    expect(BUILTIN_THEMES.solarized_2dark.tooltipPaper).toBe("#002b36"); // base03
    expect(BUILTIN_THEMES.solarized_2dark.tooltipInk).toBe("#93a1a1");
    expect(BUILTIN_THEMES.solarized_2dark.tooltipBorder).toBe("#586e75");
  });

  it("elevates tooltip cards on dark, hcdark, fivethirtyeight, and economist", () => {
    // Edition-2 dark: paper only; ink/border stay derived.
    expect(BUILTIN_THEMES.dark.tooltipPaper).toBe("#22262d");
    expect(BUILTIN_THEMES.dark.tooltipPaper).not.toBe(BUILTIN_THEMES.dark.paper);
    expect(BUILTIN_THEMES.dark.tooltipInk).toBe(BUILTIN_THEMES.dark.ink);
    expect(BUILTIN_THEMES.dark.tooltipBorder).toBe(BUILTIN_THEMES.dark.grid);
    expect(resolveTheme({ name: "dark", accent: "#ff0000" }).tooltipPaper).toBe("#22262d");

    // hcdark: elevated fill + brighter tip ink; border tracks grid.
    expect(BUILTIN_THEMES.hcdark.tooltipPaper).toBe("#353538");
    expect(BUILTIN_THEMES.hcdark.tooltipInk).toBe("#E0E0E3");
    expect(BUILTIN_THEMES.hcdark.tooltipBorder).toBe(BUILTIN_THEMES.hcdark.grid);
    expect(resolveTheme({ name: "hcdark", titleSize: 20 }).tooltipPaper).toBe("#353538");

    // fivethirtyeight: white tip + soft grey border.
    expect(BUILTIN_THEMES.fivethirtyeight.tooltipPaper).toBe("#ffffff");
    expect(BUILTIN_THEMES.fivethirtyeight.tooltipInk).toBe(BUILTIN_THEMES.fivethirtyeight.ink);
    expect(BUILTIN_THEMES.fivethirtyeight.tooltipBorder).toBe("#d0d0d0");
    expect(resolveTheme({ name: "fivethirtyeight", titleSize: 20 }).tooltipPaper).toBe("#ffffff");

    // economist: same-hue lighter tip + tick-color border.
    expect(BUILTIN_THEMES.economist.tooltipPaper).toBe("#eef5f8");
    expect(BUILTIN_THEMES.economist.tooltipInk).toBe(BUILTIN_THEMES.economist.ink);
    expect(BUILTIN_THEMES.economist.tooltipBorder).toBe("#6794a7");
    expect(resolveTheme({ name: "economist", titleSize: 20 }).tooltipPaper).toBe("#eef5f8");

    // LEGACY non-dark problem names equal edition-2 tips via spread.
    for (const name of ["hcdark", "fivethirtyeight", "economist"] as const) {
      expect(LEGACY_BUILTIN_THEMES[name].tooltipPaper).toBe(BUILTIN_THEMES[name].tooltipPaper);
    }

    // Pure controls still hold.
    expect(BUILTIN_THEMES.default.tooltipPaper).toBe(BUILTIN_THEMES.default.paper);
    expect(BUILTIN_THEMES.ggplot2.tooltipPaper).toBe(BUILTIN_THEMES.ggplot2.paper);
  });
});
