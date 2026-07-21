/**
 * M1 scale surface: log/time continuous scales, config semantics (domain
 * pinning, nice, zero, reverse), time/log tick generation, label format
 * strings, sequential color ramps, and the theme registry.
 */
import { THEME_NAMES } from "@ggsvelte/spec";
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it } from "bun:test";

import { formatTime, numberFormatter } from "../src/layout/format.ts";
import { defaultLogTickFormat, logTicks } from "../src/layout/ticks.ts";
import { defaultTimeTickFormat, timeTicks } from "../src/layout/time.ts";
import { rampColor, trainSequential, VIRIDIS_RAMP_10 } from "../src/scales/color.ts";
import { ScaleConfigError, trainBand, trainContinuous } from "../src/scales/train.ts";
import { scaleTransform } from "../src/scales/transform.ts";
import {
  BUILTIN_THEMES,
  LEGACY_BUILTIN_THEMES,
  resolveTheme,
  themeVar,
  UnknownThemeError,
} from "../src/theme.ts";

const DAY = 86_400_000;

describe("trainContinuous — config semantics", () => {
  const data = [Float64Array.from([3, 7, 42])];

  it("nices by default; nice:false keeps the raw extent", () => {
    expect(trainContinuous(data).scale.domain).toEqual([0, 45]);
    expect(trainContinuous(data, { nice: false }).scale.domain).toEqual([3, 42]);
  });

  it("explicit domain pins (nice/zero ignored) and normalizes accordingly", () => {
    const { scale } = trainContinuous(data, { domain: [0, 100], zero: true, nice: true });
    expect(scale.domain).toEqual([0, 100]);
    expect(scale.normalize(50)).toBe(0.5);
  });

  it("zero: true extends the domain to include 0", () => {
    const { scale } = trainContinuous(data, { zero: true, nice: false });
    expect(scale.domain).toEqual([0, 42]);
  });

  it("reverse flips normalize output", () => {
    const { scale } = trainContinuous(data, { domain: [0, 10], reverse: true });
    expect(scale.normalize(0)).toBe(1);
    expect(scale.normalize(10)).toBe(0);
  });

  it("zero-variance domains pad symmetrically (failure policy)", () => {
    const { scale } = trainContinuous([Float64Array.from([5, 5])], { nice: false });
    expect(scale.domain).toEqual([4.5, 5.5]);
  });
});

describe("trainContinuous — transformed-space (log10) training", () => {
  const log10 = scaleTransform("log10");

  it("trains affine over transformed evidence and inverse-projects a semantic domain", () => {
    // Evidence is ALREADY transformed (pre-stat log10 of 1,10,100,1000 = 0,1,2,3);
    // the trainer never re-forwards it.
    const training = trainContinuous([Float64Array.from([0, 1, 2, 3])], {
      transform: log10,
      nice: false,
    });
    expect(training.scale.type).toBe("linear");
    expect(training.scale.transform).toBe("log10");
    expect(training.scale.domain).toEqual([1, 1000]);
    // normalize forwards once: normalize(10) = affine(log10(10)=1) = 1/3.
    expect(training.scale.normalize(10)).toBeCloseTo(1 / 3, 12);
    expect(training.scale.normalizeTransformed(1)).toBeCloseTo(1 / 3, 12);
    expect(Number.isNaN(training.scale.normalize(0))).toBe(true);
    expect(Number.isNaN(training.scale.normalize(-5))).toBe(true);
  });

  it("REFUSES an explicit domain outside the transform's valid range", () => {
    expect(() =>
      trainContinuous([Float64Array.from([0, 1])], { transform: log10, domain: [0, 10] }),
    ).toThrow(ScaleConfigError);
    expect(() =>
      trainContinuous([Float64Array.from([0, 1])], { transform: log10, domain: [-1, 10] }),
    ).toThrow(/valid range/);
  });

  it("empty transformed evidence falls back to a default domain", () => {
    const training = trainContinuous([Float64Array.from([])], { transform: log10 });
    expect(training.empty).toBe(true);
    // fallback transformed window [0, 1] inverse-projects to semantic [1, 10].
    expect(training.scale.domain).toEqual([1, 10]);
  });
});

describe("trainContinuous — time scales", () => {
  it("uses the raw extent (never niced) and pads zero-variance by half a day", () => {
    const t0 = Date.UTC(2026, 0, 15);
    const t1 = Date.UTC(2026, 2, 20);
    const { scale } = trainContinuous([Float64Array.from([t0, t1])], { type: "time" });
    expect(scale.domain).toEqual([t0, t1]);
    const single = trainContinuous([Float64Array.from([t0])], { type: "time" });
    expect(single.scale.domain).toEqual([t0 - DAY / 2, t0 + DAY / 2]);
  });
});

describe("trainBand — pinned domains and reverse", () => {
  it("explicit domain pins order and membership", () => {
    const scale = trainBand([["b", "a", "z"]], { domain: ["a", "b", "c"] });
    expect(scale.domain).toEqual(["a", "b", "c"]);
    expect(scale.normalize("z")).toBeUndefined(); // out-of-domain drops
    expect(scale.normalize("a")).toBeCloseTo(1 / 6, 12);
  });

  it("reverse flips band centers", () => {
    const scale = trainBand([["a", "b"]], { reverse: true });
    expect(scale.normalize("a")).toBe(0.75);
    expect(scale.normalize("b")).toBe(0.25);
  });
});

describe("time ticks", () => {
  it("year spans tick on year starts with %Y labels", () => {
    const result = timeTicks(Date.UTC(2020, 3, 1), Date.UTC(2026, 8, 1), 7);
    expect(result.unit).toBe("year");
    expect(result.values.map((v) => defaultTimeTickFormat(v))).toEqual([
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
    ]);
  });

  it("month spans tick on month starts (multi-scale labels: year at January)", () => {
    const result = timeTicks(Date.UTC(2025, 10, 15), Date.UTC(2026, 2, 10), 5);
    expect(result.unit).toBe("month");
    expect(result.values.map((v) => defaultTimeTickFormat(v))).toEqual([
      "Dec",
      "2026",
      "Feb",
      "Mar",
    ]);
  });

  it("day spans tick on UTC midnights", () => {
    const result = timeTicks(Date.UTC(2026, 0, 1, 6), Date.UTC(2026, 0, 5, 18), 5);
    expect(result.unit).toBe("day");
    for (const v of result.values) {
      expect(new Date(v).getUTCHours()).toBe(0);
    }
    expect(defaultTimeTickFormat(result.values[0]!)).toBe("Jan 02");
  });

  it("hour/minute spans use aligned fixed intervals with %H:%M labels", () => {
    const result = timeTicks(Date.UTC(2026, 0, 1, 9, 3), Date.UTC(2026, 0, 1, 11, 57), 6);
    expect(result.unit).toBe("minute");
    expect(result.step).toBe(30);
    expect(defaultTimeTickFormat(result.values[0]!)).toBe("09:30");
  });

  it("week spans align to ISO Mondays", () => {
    const result = timeTicks(Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 15), 6);
    expect(result.unit).toBe("week");
    for (const v of result.values) {
      expect(new Date(v).getUTCDay()).toBe(1); // Monday
    }
  });
});

describe("log ticks", () => {
  it("few decades get 1/2/5 mantissas", () => {
    expect(logTicks(1, 100, 6)).toEqual([1, 2, 5, 10, 20, 50, 100]);
  });

  it("many decades fall back to spaced powers of ten", () => {
    const ticks = logTicks(1, 1e12, 5);
    expect(ticks.length).toBeLessThanOrEqual(8);
    for (const t of ticks) {
      expect(Math.log10(t) % 1).toBeCloseTo(0, 9);
    }
  });

  it("formats plain numbers, exponential beyond 1e6", () => {
    expect(defaultLogTickFormat(100)).toBe("100");
    expect(defaultLogTickFormat(0.01)).toBe("0.01");
    expect(defaultLogTickFormat(1e7)).toBe("1e7");
  });
});

describe("label format strings", () => {
  it("numeric formats: d, ,d, .2f, .0%, ~s", () => {
    expect(numberFormatter("d").format(1234.6)).toBe("1235");
    expect(numberFormatter(",d").format(1234567)).toBe("1,234,567");
    expect(numberFormatter(".2f").format(12.3456)).toBe("12.35");
    expect(numberFormatter(".0%").format(0.421)).toBe("42%");
    expect(numberFormatter("~s").format(1500)).toBe("1.5k");
    expect(numberFormatter("~s").format(0.002)).toBe("2m");
  });

  it("unknown formats report ok: false (fallback, never throw)", () => {
    const f = numberFormatter("bogus");
    expect(f.ok).toBe(false);
    expect(f.format(3)).toBe("3");
  });

  it("time formats: strftime subset over UTC", () => {
    const ms = Date.UTC(2026, 6, 9, 14, 5, 7);
    expect(formatTime(ms, "%Y-%m-%d")).toBe("2026-07-09");
    expect(formatTime(ms, "%b %e, %Y")).toBe("Jul 9, 2026");
    expect(formatTime(ms, "%H:%M:%S")).toBe("14:05:07");
    expect(formatTime(ms, "100%%")).toBe("100%");
  });
});

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
