/**
 * Sequential color ramps and theme registry (M1 scale surface companions).
 */
import { THEME_NAMES } from "@ggsvelte/spec";
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { rampColor, trainSequential, VIRIDIS_RAMP_10 } from "../../src/scales/color.ts";
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
});
