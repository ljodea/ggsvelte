import { describe, expect, it } from "bun:test";
import {
  DEFAULT_LAYOUT_THEME,
  layout,
  layoutPass,
  marginDelta,
  type Domain,
  type LayoutInput,
  type LayoutTheme,
} from "../src/layout/layout.ts";
import { MetricsTableMeasurer } from "../src/layout/measure.ts";
import { FONT_METRICS } from "../src/layout/font-metrics.ts";
import type { PositionScaleSpec } from "@ggsvelte/spec";

const SPANISH = ["Resolución", "Corrección (errores o erratas)", "Sentencia", "Orden", "Otro"];
const bandX = (categories: string[], config: Partial<PositionScaleSpec> = {}): Domain => ({
  type: "band",
  categories,
  rawCategories: categories,
  band: {
    aesthetic: "x",
    panelIndex: 0,
    config: { type: "band", ...config },
  },
});
const MODE_RANK = { "single-line": 0, wrapped: 1, rotated: 2 } as const;

const measurer = new MetricsTableMeasurer(FONT_METRICS);
const theme: LayoutTheme = DEFAULT_LAYOUT_THEME;

const lin = (min: number, max: number): Domain => ({ type: "linear", min, max });
const band = (...categories: string[]): Domain => ({ type: "band", categories });

const base = (over: Partial<LayoutInput>): LayoutInput => ({
  width: 640,
  height: 400,
  x: lin(0, 100),
  y: lin(0, 1000),
  measurer,
  ...over,
});

describe("two-pass layout: ordinary cases", () => {
  it("converges on a typical plot and produces sane margins", () => {
    const r = layout(base({}));
    expect(r.converged).toBe(true);
    expect(r.degradations).toEqual([]);
    // Left margin fits the widest y label plus tick+gap.
    const widest = Math.max(
      ...r.y.ticks.map((t) => measurer.measureWidth(t.label, theme.fontSize)),
    );
    expect(r.margins.left).toBeGreaterThanOrEqual(widest + theme.tickLength + theme.tickLabelGap);
    // Quantized to the 4px grid.
    for (const side of [r.margins.top, r.margins.right, r.margins.bottom, r.margins.left]) {
      expect(side % theme.quantum).toBe(0);
    }
    expect(r.innerWidth).toBeGreaterThan(0.5 * 640);
    expect(r.innerHeight).toBeGreaterThan(0.5 * 400);
  });

  it("pass B wins when priors were way off (no third pass)", () => {
    // y labels are much wider than the 44px prior → pass A grows left a lot.
    const r = layout(base({ y: lin(1_000_000, 9_000_000) }));
    // Result is exactly a single re-run of the pass with pass-A margins.
    const again = layoutPass(r.passAMargins, base({ y: lin(1_000_000, 9_000_000) }), theme);
    expect(r.margins).toEqual(again.margins);
    expect(r.passes).toBe(2);
  });
});

describe("two-pass layout: fixtures", () => {
  it("long category labels: capped left margin + ellipsis truncation", () => {
    const r = layout(
      base({
        width: 400,
        y: band(
          "Government & Public Sector Organizations",
          "Energy — renewables and storage infrastructure",
          "Consumer discretionary (durables)",
          "IT",
        ),
      }),
    );
    expect(r.margins.left).toBeLessThanOrEqual(theme.maxMarginFraction * 400);
    expect(r.y.truncated).toBe(true);
    expect(r.degradations).toContain("y:truncate");
    const truncated = r.y.ticks.filter((t) => t.label.endsWith(theme.ellipsis));
    expect(truncated.length).toBeGreaterThan(0);
    // Short labels survive untouched.
    expect(r.y.ticks.find((t) => t.value === "IT")?.label).toBe("IT");
    // Every truncated label still fits the cap.
    for (const t of r.y.ticks) {
      const w = measurer.measureWidth(t.label, theme.fontSize);
      expect(w + theme.tickLength + theme.tickLabelGap).toBeLessThanOrEqual(
        theme.maxMarginFraction * 400 + theme.quantum,
      );
    }
  });

  it("tiny plot: margins stay within caps, inner area stays positive", () => {
    const r = layout(base({ width: 80, height: 60 }));
    expect(r.margins.left).toBeLessThanOrEqual(theme.maxMarginFraction * 80);
    expect(r.margins.right).toBeLessThanOrEqual(theme.maxMarginFraction * 80);
    expect(r.margins.top).toBeLessThanOrEqual(theme.maxMarginFraction * 60);
    expect(r.margins.bottom).toBeLessThanOrEqual(theme.maxMarginFraction * 60);
    expect(r.innerWidth).toBeGreaterThan(0);
    expect(r.innerHeight).toBeGreaterThan(0);
    expect(r.x.ticks.length).toBeGreaterThanOrEqual(2);
    expect(r.y.ticks.length).toBeGreaterThanOrEqual(2);
  });

  it("huge numbers: grouped labels degrade instead of blowing the margin", () => {
    const r = layout(base({ width: 300, height: 240, y: lin(0, 1e15) }));
    expect(r.margins.left).toBeLessThanOrEqual(theme.maxMarginFraction * 300);
    // Degradation happened (thinning and/or truncation), and it is recorded.
    expect(r.degradations.some((d) => d === "y:thin" || d === "y:truncate")).toBe(true);
  });

  it("huge numbers fit untouched when the plot is wide enough", () => {
    const r = layout(base({ width: 900, height: 500, y: lin(0, 1e15) }));
    expect(r.y.truncated).toBe(false);
    // "800,000,000,000,000"-class labels are wide; margin reflects it.
    expect(r.margins.left).toBeGreaterThan(80);
    expect(r.margins.left).toBeLessThanOrEqual(theme.maxMarginFraction * 900);
  });

  it("empty domains: no ticks, floor margins, tagged degradation", () => {
    const r = layout(base({ x: lin(NaN, NaN), y: band() }));
    expect(r.x.ticks).toEqual([]);
    expect(r.y.ticks).toEqual([]);
    expect(r.degradations).toContain("x:empty-domain");
    expect(r.degradations).toContain("y:empty-domain");
    expect(r.margins.left).toBeLessThanOrEqual(
      Math.ceil(theme.minMargins.left / theme.quantum) * theme.quantum,
    );
    expect(r.converged).toBe(true);
  });

  it("band x axis with many categories thins labels before truncating", () => {
    const cats = Array.from(
      { length: 40 },
      (_, i) => `Category number ${i + 1} — extended edition`,
    );
    const r = layout(base({ width: 240, x: { type: "band", categories: cats } }));
    expect(r.margins.right).toBeLessThanOrEqual(theme.maxMarginFraction * 240);
    // Thinning was tried first (labelEvery grew) before/instead of truncation.
    expect(r.x.labelEvery).toBeGreaterThan(1);
  });

  it("linear/temporal axes never rotate labels (rotation is band-only)", () => {
    // Non-band axes carry no rotation; band rotation lives on the guide plan, and
    // is exercised by the "measured band x-axis" suite below.
    const r = layout(base({}));
    expect(r.x.guidePlan?.bandLabelAngle).toBeUndefined();
    expect(r.x.ticks.every((t) => t.angle === undefined)).toBe(true);
  });
});

describe("measured band x-axis (planner integration)", () => {
  it("wraps long categorical x labels and grows the bottom margin, dropping none", () => {
    // 560px wide → inner band ≈ 103px: the labels wrap to two lines and fit.
    const r = layout(base({ width: 560, height: 300, x: bandX(SPANISH) }));
    expect(r.x.guidePlan?.bandLabelMode).toBe("wrapped");
    expect(r.x.ticks.every((t) => t.labeled)).toBe(true);
    // Two-line labels reserve more bottom than one line, but stay within the cap.
    const oneLine = theme.marginPriors.bottom;
    expect(r.margins.bottom).toBeGreaterThan(oneLine);
    expect(r.margins.bottom).toBeLessThanOrEqual(theme.maxMarginFraction * 300);
    expect(r.x.ticks.some((t) => (t.lines?.length ?? 1) === 2)).toBe(true);
  });

  it("rotates and truncates at narrow width, still labelling every bar", () => {
    const r = layout(base({ width: 240, height: 300, x: bandX(SPANISH) }));
    expect(r.x.guidePlan?.bandLabelMode).toBe("rotated");
    expect([-45, -90]).toContain(r.x.guidePlan?.bandLabelAngle);
    expect(r.x.ticks.every((t) => t.labeled)).toBe(true);
    expect(r.degradations).toContain("band-label-margin-overflow");
    expect(r.margins.bottom).toBeLessThanOrEqual(theme.maxMarginFraction * 300);
  });

  it("mode is monotonic across the two passes (escalate-only, no de-escalation)", () => {
    const input = base({ width: 240, height: 300, x: bandX(SPANISH) });
    const passA = layoutPass(theme.marginPriors, input, theme);
    const passB = layoutPass(
      passA.margins,
      { ...input, previousGuidePlans: { x: passA.x.guidePlan } },
      theme,
    );
    const rankOf = (m: string | undefined) =>
      MODE_RANK[(m ?? "single-line") as keyof typeof MODE_RANK];
    expect(rankOf(passB.x.guidePlan?.bandLabelMode)).toBeGreaterThanOrEqual(
      rankOf(passA.x.guidePlan?.bandLabelMode),
    );
  });

  it("does NOT plan a vertical band axis — categorical-on-Y keeps legacy truncation", () => {
    const yBand: Domain = {
      type: "band",
      categories: SPANISH,
      rawCategories: SPANISH,
      band: { aesthetic: "y", panelIndex: 0, config: { type: "band" } },
    };
    const r = layout(base({ width: 300, height: 300, y: yBand }));
    // The horizontal planner never runs on Y: no band mode, legacy path owns it.
    expect(r.y.guidePlan?.bandLabelMode).toBeUndefined();
    expect(r.margins.left).toBeLessThanOrEqual(theme.maxMarginFraction * 300);
  });
});

// --- stability probe: is two passes enough? -------------------------------
// The feedback loop is: margins → inner size → tick count → label widths →
// margins. We quantify how often a hypothetical pass C would still move
// margins after pass B, across a randomized fixture sweep.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("two-pass sufficiency (randomized sweep)", () => {
  it("a hypothetical third pass almost never moves margins, and never far", () => {
    const rand = mulberry32(20260710);
    const N = 500;
    let convergedAB = 0;
    let cMoved = 0;
    let maxCDelta = 0;
    const words = ["North", "Widget", "Total", "Other", "Revenue", "Government", "µ-service"];

    for (let i = 0; i < N; i++) {
      const width = 90 + Math.floor(rand() * 800);
      const height = 70 + Math.floor(rand() * 550);
      const mkDomain = (): Domain => {
        if (rand() < 0.3) {
          const n = 2 + Math.floor(rand() * 12);
          return {
            type: "band",
            categories: Array.from({ length: n }, () => {
              const k = 1 + Math.floor(rand() * 4);
              return Array.from({ length: k }, () => words[Math.floor(rand() * words.length)]).join(
                " ",
              );
            }),
          };
        }
        const mag = 10 ** (Math.floor(rand() * 21) - 5);
        const a = (rand() - 0.5) * 2 * mag;
        const b = a + rand() * mag;
        return { type: "linear", min: a, max: b };
      };
      const input = base({ width, height, x: mkDomain(), y: mkDomain() });
      const r = layout(input);
      if (r.converged) convergedAB++;
      const passC = layoutPass(r.margins, input, theme);
      const delta = marginDelta(passC.margins, r.margins);
      if (delta > 0.5) cMoved++;
      if (delta > maxCDelta) maxCDelta = delta;
      // The 0.5px rule is sound: when A→B converged, C is bit-identical to B
      // (quantized margins are equal, so the pass re-runs deterministically).
      if (r.converged) expect(delta).toBe(0);
      // Safety property that makes "pass B wins" acceptable even when a pass C
      // WOULD move margins: the final margins were computed from the final
      // tick labels, so the labels always fit — the only cost of stopping at
      // two passes is slightly off-target tick density.
      const yWidest = Math.max(
        0,
        ...r.y.ticks
          .filter((t) => t.labeled)
          .map((t) => measurer.measureWidth(t.label, theme.fontSize)),
      );
      const capLeft = Math.floor((theme.maxMarginFraction * width) / theme.quantum) * theme.quantum;
      expect(r.margins.left + 1e-6).toBeGreaterThanOrEqual(
        Math.min(yWidest + theme.tickLength + theme.tickLabelGap, capLeft),
      );
    }

    console.log(
      `[two-pass sweep] N=${N} A→B converged=${convergedAB} (${((100 * convergedAB) / N).toFixed(1)}%) ` +
        `C-moved=${cMoved} (${((100 * cMoved) / N).toFixed(1)}%) maxCDelta=${maxCDelta}px`,
    );

    // Verdict material (see decision record 0003): the tick-count-from-range
    // feedback CAN oscillate with period 2 in adversarial fixtures (last x
    // label flipping between "0" and a 19-char grouped number as tick count
    // changes), but it is rare and pass-B-wins is safe by the property above.
    expect(convergedAB / N).toBeGreaterThanOrEqual(0.95);
    expect(cMoved / N).toBeLessThanOrEqual(0.02);
  });
});
