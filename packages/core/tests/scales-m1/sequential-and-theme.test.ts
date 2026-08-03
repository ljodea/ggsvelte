/**
 * Sequential color ramps and theme registry (M1 scale surface companions).
 */
import { THEME_NAMES } from "@ggsvelte/spec";
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import {
  buildRampLut,
  rampColor,
  RAMP_LUT_STEPS,
  sampleRampLut,
  trainSequential,
  VIRIDIS_RAMP_10,
} from "../../src/scales/color.ts";
import { themed } from "../../src/theme-builtins.ts";
import {
  BUILTIN_THEMES,
  LEGACY_BUILTIN_THEMES,
  resolveTheme,
  themeVar,
  UnknownThemeError,
} from "../../src/theme.ts";

describe("sequential color", () => {
  it("interpolates the viridis ramp deterministically", () => {
    expect(rampColor(VIRIDIS_RAMP_10, 0)).toBe("#440154");
    expect(rampColor(VIRIDIS_RAMP_10, 1)).toBe("#fde725");
    expect(rampColor(["#000000", "#ffffff"], 0.5)).toBe("#808080");
  });

  it("maps the data extent, returns undefined for non-finite values", () => {
    const scale = trainSequential([0, 10]);
    expect(scale.colorOf(0)).toBe("#440154");
    expect(scale.colorOf(10)).toBe("#fde725");
    expect(scale.colorOf(null)).toBeUndefined();
    expect(scale.colorOf(Number.NaN)).toBeUndefined();
  });

  it("normalizes three-digit hex stops before interpolation", () => {
    const scale = trainSequential([0, 1], { range: ["#f00", "#00F"] });

    expect(scale.stops).toEqual(["#ff0000", "#0000ff"]);
    expect(scale.colorOf(0)).toBe("#ff0000");
    expect(scale.colorOf(0.5)).toBe("#800080");
    expect(scale.colorOf(1)).toBe("#0000ff");
  });

  it("refuses unsupported custom stops instead of emitting malformed colors", () => {
    expect(() => trainSequential([0, 1], { range: ["red", "blue"] })).toThrow(
      'Sequential color stops must use #rgb or #rrggbb syntax (got "red").',
    );
  });

  it("supports explicit domain, custom range, and reverse", () => {
    const scale = trainSequential([0, 1], {
      domain: [0, 100],
      range: ["#000000", "#ffffff"],
      reverse: true,
    });
    expect(scale.colorOf(0)).toBe("#ffffff");
    expect(scale.colorOf(100)).toBe("#000000");
    expect(scale.colorOf(50)).toBe("#808080");
  });

  it("trains a dense ramp LUT whose mid/endpoints match continuous rampColor", () => {
    const stops = ["#000000", "#ffffff"] as const;
    const lut = buildRampLut(stops, RAMP_LUT_STEPS);
    expect(lut).toHaveLength(RAMP_LUT_STEPS + 1);
    expect(sampleRampLut(lut, 0)).toBe(rampColor(stops, 0));
    expect(sampleRampLut(lut, 1)).toBe(rampColor(stops, 1));
    // 1024 steps → t=0.5 lands on an exact entry (same #808080 as continuous).
    expect(sampleRampLut(lut, 0.5)).toBe(rampColor(stops, 0.5));
    expect(sampleRampLut(lut, 0.5)).toBe("#808080");
  });

  it("uses the trained LUT for sequential colorOf at fixture midpoints", () => {
    const scale = trainSequential([0, 1], { range: ["#f00", "#00F"] });
    expect(scale.colorOf(0.5)).toBe("#800080");
    // Log-spaced endpoints and interior match the continuous log10 fixtures.
    const logScale = trainSequential([1, 1000], {
      transform: "log10",
      range: ["#000000", "#ffffff"],
    });
    expect(logScale.colorOf(1)).toBe("#000000");
    expect(logScale.colorOf(10)).toBe("#555555");
    expect(logScale.colorOf(100)).toBe("#aaaaaa");
    expect(logScale.colorOf(1000)).toBe("#ffffff");
  });
});

describe("theme registry", () => {
  const interactionColorRoles = [
    "interactionInk",
    "focusRing",
    "crosshair",
    "selectionFill",
    "selectionStroke",
    "tooltipPaper",
    "tooltipInk",
    "tooltipBorder",
    "toolActive",
  ] as const;

  it("keeps every edition theme table complete against the spec registry", () => {
    expect(Object.keys(BUILTIN_THEMES).toSorted()).toEqual([...THEME_NAMES].toSorted());
    expect(Object.keys(LEGACY_BUILTIN_THEMES).toSorted()).toEqual([...THEME_NAMES].toSorted());
  });

  it("resolves the edition-2 typography and structural theme tokens", () => {
    expect(resolveTheme()).toBe(BUILTIN_THEMES.default);
    expect(resolveTheme("default").fontFamily).toContain("Roboto Condensed");
    expect(resolveTheme("hrbr").axisLineX).toBe(false);
    expect(resolveTheme("classic").axisLineX).toBe(true);
    expect(resolveTheme("dark").paper).toBe("#16181d");
    expect(resolveTheme("light").gridWidth).toBe(0.25);
  });

  it("resolves theme_grey / theme_gray as aliases of the ggplot2 grey-panel look (#824)", () => {
    const ggplot2 = resolveTheme("ggplot2");
    // Prefer shared token maps (not a re-skin): same object identity as ggplot2.
    expect(resolveTheme("grey")).toBe(ggplot2);
    expect(resolveTheme("gray")).toBe(ggplot2);
    expect(BUILTIN_THEMES.grey).toBe(BUILTIN_THEMES.ggplot2);
    expect(BUILTIN_THEMES.gray).toBe(BUILTIN_THEMES.ggplot2);
    // Grey-panel signature (not the hrbr/default white panel).
    expect(ggplot2.panel).toBe("#ebebeb");
    expect(ggplot2.grid.toLowerCase()).toBe("#ffffff");
  });

  it("registers theme_test as a pinned high-contrast snapshot theme (#823)", () => {
    // Stability contract: fixed literals so product-theme sweeps (#753-style)
    // cannot silently retarget the test chrome. Not an alias of light/classic.
    expect(THEME_NAMES).toContain("test");
    expect(THEME_NAMES.at(-1)).toBe("test");
    const tokens = resolveTheme("test");
    expect(tokens.paper).toBe("#ffffff");
    expect(tokens.panel).toBe("#ffffff");
    expect(tokens.ink).toBe("#000000");
    expect(tokens.accent).toBe("#000000");
    expect(tokens.grid).toBe("#cccccc");
    expect(tokens.axisText).toBe("#000000");
    expect(tokens.axisLine).toBe("#000000");
    expect(tokens.tickColor).toBe("#000000");
    expect(tokens.panelBorder).toBe("#000000");
    expect(tokens.fontFamily).toBe("Helvetica, Arial, sans-serif");
    expect(tokens.fontSize).toBe(11);
    expect(tokens.axisTextSize).toBe(12);
    expect(tokens.titleSize).toBe(14);
    expect(tokens.subtitleSize).toBe(12);
    expect(tokens.axisTitleSize).toBe(11);
    expect(tokens.captionSize).toBe(9);
    expect(tokens.stripSize).toBe(11);
    expect(tokens.axisLineWidth).toBe(0.5);
    expect(tokens.tickWidth).toBe(0.5);
    expect(tokens.tickLength).toBe(4);
    expect(tokens.gridWidth).toBe(0.5);
    expect(tokens.panelBorderWidth).toBe(0.5);
    expect(tokens.ticksX).toBe(true);
    expect(tokens.ticksY).toBe(true);
    expect(tokens.gridX).toBe(true);
    expect(tokens.gridY).toBe(true);
    expect(tokens.axisLineX).toBe(true);
    expect(tokens.axisLineY).toBe(true);
    expect(tokens.showPanelBorder).toBe(true);
    // Not a silent alias of product themes that still evolve.
    expect(tokens.fontFamily).not.toBe(resolveTheme("default").fontFamily);
    expect(tokens.grid).not.toBe(resolveTheme("classic").grid);
  });

  it("registers theme_bw as a white-panel print theme distinct from light and ggplot2 (#820)", () => {
    // Independent contract from ggplot2's published complete-theme role:
    // white panel + grey grid + rectangular border (not grey-panel/white-grid
    // ggplot2, and not light's thinner/lighter chrome).
    expect(THEME_NAMES).toContain("bw");
    const bw = resolveTheme("bw");
    const light = resolveTheme("light");
    const ggplot2 = resolveTheme("ggplot2");

    expect(bw.paper).toBe("#ffffff");
    expect(bw.panel).toBe("#ffffff");
    expect(bw.grid).not.toBe("none");
    expect(bw.grid).not.toBe("#ffffff");
    expect(bw.showPanelBorder).toBe(true);
    expect(bw.ticksX).toBe(true);
    expect(bw.ticksY).toBe(true);
    expect(bw.axisLineX).toBe(false);
    expect(bw.axisLineY).toBe(false);
    expect(bw.axisTextSize).toBeGreaterThanOrEqual(12);
    expect(bw.panelBorder).toBe("#333333");
    expect(bw.grid).toBe("#e5e5e5");

    // Distinct from cousins that already ship.
    expect(bw.panel).not.toBe(ggplot2.panel);
    expect(bw.grid).not.toBe(ggplot2.grid);
    expect(bw.panelBorder).not.toBe(light.panelBorder);
    expect(bw.gridWidth).not.toBe(light.gridWidth);
  });

  it("resolves theme_linedraw as high-contrast black-line chrome (#821)", () => {
    const t = resolveTheme("linedraw");
    const classic = resolveTheme("classic");
    const ggplot2 = resolveTheme("ggplot2");

    // White panel (not ggplot2 grey); black monochrome chrome.
    expect(t.panel).toBe("#ffffff");
    expect(t.paper).toBe("#ffffff");
    expect(t.panel).not.toBe(ggplot2.panel);
    expect(t.ink.toLowerCase()).toBe("#000000");
    expect(t.grid.toLowerCase()).toBe("#000000");
    expect(t.panelBorder.toLowerCase()).toBe("#000000");
    expect(t.tickColor.toLowerCase()).toBe("#000000");
    expect(t.axisText.toLowerCase()).toBe("#000000");
    // Grid present (classic suppresses grid entirely).
    expect(t.gridX).toBe(true);
    expect(t.gridY).toBe(true);
    expect(classic.gridX).toBe(false);
    expect(t.showPanelBorder).toBe(true);
    expect(t.ticksX).toBe(true);
    expect(t.ticksY).toBe(true);
    expect(t.axisTextSize).toBeGreaterThanOrEqual(12);
    // Hairline black grid — not solid graph paper.
    expect(t.gridWidth).toBeLessThanOrEqual(0.35);
  });

  it("keeps axis tick labels readable on light/minimal family themes (#753)", () => {
    // 8.8px was unreadable next to 15px titles and ~12–16px tooltips on the
    // docs homepage hero. Floor is intentionally above 11 so axis chrome is
    // not fine print at 640×400.
    for (const name of [
      "light",
      "minimal",
      "ggplot2",
      "classic",
      "few",
      "bw",
      "linedraw",
      "grey",
      "gray",
      "test",
    ] as const) {
      expect(resolveTheme(name).axisTextSize, name).toBeGreaterThanOrEqual(12);
    }
    expect(resolveTheme("default").axisTitleSize).toBeGreaterThanOrEqual(11);
  });

  it("object themes override roles over a named base", () => {
    const tokens = resolveTheme({
      name: "dark",
      accent: "#ff0000",
      focusRing: "#00ff00",
      interactionMuted: 0.5,
      tooltipPaper: "#111111",
    });
    expect(tokens.accent).toBe("#ff0000");
    expect(tokens.ink).toBe(BUILTIN_THEMES.dark.ink);
    expect(tokens.focusRing).toBe("#00ff00");
    expect(tokens.interactionMuted).toBe(0.5);
    expect(tokens.tooltipPaper).toBe("#111111");
  });

  it("unknown names throw (tier-1 error) and themeVar wraps --gg-* vars", () => {
    expect(() => resolveTheme(fromAny("darkk"))).toThrow(UnknownThemeError);
    expect(themeVar("ink", BUILTIN_THEMES.default)).toBe("var(--gg-ink, #262626)");
  });

  it("resolves the complete interaction visual language as CSS-variable roles", () => {
    for (const name of Object.keys(BUILTIN_THEMES) as (keyof typeof BUILTIN_THEMES)[]) {
      const tokens = resolveTheme(name);
      for (const role of interactionColorRoles) {
        expect(tokens[role], `${name}.${role}`).toBeTruthy();
        expect(themeVar(role, tokens), `${name}.${role} CSS variable`).toBe(
          `var(--gg-${role}, ${tokens[role]})`,
        );
      }
      expect(tokens.interactionMuted, `${name}.interactionMuted`).toBeGreaterThan(0);
      expect(tokens.interactionMuted, `${name}.interactionMuted`).toBeLessThan(1);
      expect(themeVar("interactionMuted", tokens)).toBe(
        `var(--gg-interactionMuted, ${tokens.interactionMuted})`,
      );
    }

    expect(BUILTIN_THEMES.default.tooltipPaper).toBe(BUILTIN_THEMES.default.paper);
    expect(BUILTIN_THEMES.default.tooltipInk).toBe(BUILTIN_THEMES.default.ink);
    expect(BUILTIN_THEMES.dark.tooltipPaper).toBe(BUILTIN_THEMES.dark.paper);
    expect(BUILTIN_THEMES.dark.tooltipInk).toBe(BUILTIN_THEMES.dark.ink);
    expect(BUILTIN_THEMES.default.selectionFill).toContain("rgba(");
    expect(BUILTIN_THEMES.dark.selectionFill).toContain("rgba(");
  });

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

  it("LEGACY light/dark/minimal re-derive tip roles (no stale tip leak from foundation spread)", () => {
    // LEGACY variants must not inherit LEGACY_BASE tip colors as themed() overrides.
    expect(LEGACY_BUILTIN_THEMES.dark.tooltipPaper).toBe(LEGACY_BUILTIN_THEMES.dark.paper);
    expect(LEGACY_BUILTIN_THEMES.dark.tooltipInk).toBe(LEGACY_BUILTIN_THEMES.dark.ink);
    expect(LEGACY_BUILTIN_THEMES.dark.tooltipBorder).toBe(LEGACY_BUILTIN_THEMES.dark.grid);
    expect(LEGACY_BUILTIN_THEMES.dark.tooltipBorder).toBe("rgba(230,232,235,0.16)");

    expect(LEGACY_BUILTIN_THEMES.light.tooltipPaper).toBe(LEGACY_BUILTIN_THEMES.light.paper);
    expect(LEGACY_BUILTIN_THEMES.light.tooltipBorder).toBe(LEGACY_BUILTIN_THEMES.light.grid);

    expect(LEGACY_BUILTIN_THEMES.minimal.tooltipBorder).toBe(LEGACY_BUILTIN_THEMES.minimal.grid);
    expect(LEGACY_BUILTIN_THEMES.minimal.tooltipBorder).toBe("rgba(128,128,128,0.12)");
  });
});
