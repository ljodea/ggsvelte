/**
 * Bounded two-pass layout (graduated from the M0a-3 spike, decision 0003).
 *
 * Rule (from the plan, round-2 consensus): exactly two measurement passes.
 *  - pass A: margin priors → provisional ranges → tick count from range →
 *    format labels → measure → margins.
 *  - pass B: pass-A margins → final ranges → re-derived ticks/labels →
 *    measure → final margins.
 *  - Convergence check: every pass-B margin within 0.5px of pass-A's;
 *    otherwise pass-B wins unconditionally. NO third pass, ever.
 *
 * Margins are capped at a themable fraction of the plot dimension. Overflow
 * beyond the cap degrades per documented rules, in order:
 *  1. tick thinning (halve the linear tick request / double band labelEvery),
 *  2. label truncation with an ellipsis to fit the cap.
 *
 * Margins are quantized UP to a 4px grid (themable). Quantization exists to
 * absorb measurer drift (canonical metrics-table vs native canvas, quantified
 * in the M0a-3 spike) and it also stabilizes the pass A→B loop:
 * margins move in whole quanta, so sub-quantum measurement wobble cannot
 * oscillate tick counts.
 *
 * Label rotation is intentionally NOT implemented (skipped per spike scope).
 */

import type { PositionScaleSpec, TemporalKind } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import type { AxisGuidePlan } from "./temporal-guide.js";
import { planTemporalAxis } from "./temporal-guide.js";
import type { TextMeasurer } from "./measure.js";
import {
  defaultLogTickFormat,
  defaultTickFormat,
  linearTicks,
  logTicks,
  tickStep,
} from "./ticks.js";
import { defaultTimeTickFormat, timeTicks } from "./time.js";

export type Domain =
  | {
      type: "linear";
      /** Pre-stat transform: numeric tick/grid/format dispatch keys from this. */
      transform?: "identity" | "log10" | "sqrt";
      min: number;
      max: number;
      breaks?: readonly number[];
    }
  | {
      type: "time";
      min: number;
      max: number;
      breaks?: readonly number[];
      temporal?: TemporalLayoutDomainContext;
    }
  | {
      type: "band";
      categories: string[];
      rawCategories?: readonly unknown[];
      breaks?: readonly (number | string)[];
    };

export interface TemporalLayoutDomainContext {
  aesthetic: "x" | "y";
  panelIndex: number;
  kind: TemporalKind;
  config: PositionScaleSpec;
  sourceBreaks?: readonly CellValue[];
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Tick {
  value: number | string;
  label: string;
  fullLabel?: string;
  kind?: "major" | "minor";
  /** Typed band-domain position; avoids indexing filtered/reordered breaks. */
  domainIndex?: number;
  /** false when band-label thinning hides this tick's label. */
  labeled: boolean;
}

export interface AxisResult {
  ticks: Tick[];
  guidePlan?: AxisGuidePlan;
  /** band thinning: only every n-th tick keeps its label. 1 = all. */
  labelEvery: number;
  truncated: boolean;
}

/** Custom formatter: value plus the tick step (NaN for band axes). */
export type TickFormatter = (value: number | string, step: number) => string;

export interface LayoutTheme {
  /** Tick label font size in px. */
  fontSize: number;
  /** Pass-A margin priors. */
  marginPriors: Margins;
  /** Margin floors (axis line + breathing room even with no labels). */
  minMargins: Margins;
  tickLength: number;
  tickLabelGap: number;
  /** Per-side cap as a fraction of the plot dimension on that side's axis. */
  maxMarginFraction: number;
  targetPxPerTickX: number;
  targetPxPerTickY: number;
  maxTicks: number;
  /** Margin quantization grid in px (0 disables). */
  quantum: number;
  ellipsis: string;
}

export const DEFAULT_LAYOUT_THEME: LayoutTheme = {
  fontSize: 11,
  marginPriors: { top: 8, right: 12, bottom: 28, left: 44 },
  minMargins: { top: 4, right: 4, bottom: 16, left: 12 },
  tickLength: 6,
  tickLabelGap: 3,
  maxMarginFraction: 0.35,
  targetPxPerTickX: 80,
  targetPxPerTickY: 40,
  maxTicks: 10,
  quantum: 4,
  ellipsis: "…",
};

export interface LayoutInput {
  width: number;
  height: number;
  x: Domain;
  y: Domain;
  formatX?: TickFormatter;
  formatY?: TickFormatter;
  measurer: TextMeasurer;
  theme?: Partial<LayoutTheme>;
  /**
   * Extra per-side space consumed by non-tick content (axis titles, legends),
   * folded INTO the two-pass measurement loop: reserved space shrinks the
   * panel, which re-derives tick counts — no post-layout margin hacks
   * (fixes the M0c follow-up in decision 0007).
   */
  reserve?: Partial<Margins>;
  /** @internal Pass-A temporal plans used as monotonic Pass-B hints. */
  previousGuidePlans?: Readonly<{ x?: AxisGuidePlan; y?: AxisGuidePlan }>;
}

export interface PassResult {
  margins: Margins;
  x: AxisResult;
  y: AxisResult;
  degradations: string[];
}

export interface LayoutResult extends PassResult {
  innerWidth: number;
  innerHeight: number;
  converged: boolean;
  passes: 2;
  passAMargins: Margins;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function quantizeUp(px: number, quantum: number): number {
  if (quantum <= 0) return px;
  return Math.ceil(px / quantum - 1e-9) * quantum;
}

interface AxisTicks {
  ticks: Tick[];
  step: number;
  empty: boolean;
  guidePlan?: AxisGuidePlan;
}

interface DeriveTicksContext {
  orient: "horizontal" | "vertical";
  extentPx: number;
  measurer: TextMeasurer;
  fontSize: number;
  marginCapPx: number;
  orthogonalMarginCapPx?: number;
  previousGuidePlan?: AxisGuidePlan;
}

function smallestGap(values: readonly number[]): number {
  let gap = 0;
  for (let i = 1; i < values.length; i++) {
    const d = Math.abs(values[i]! - values[i - 1]!);
    if (d > 0 && (gap === 0 || d < gap)) gap = d;
  }
  return gap;
}

function deriveTicks(
  domain: Domain,
  requestedCount: number,
  format: TickFormatter | undefined,
  labelEvery: number,
  context: DeriveTicksContext,
): AxisTicks {
  if (domain.type === "band") {
    const rawCategories = domain.rawCategories ?? domain.categories;
    const entries =
      domain.breaks === undefined
        ? domain.categories.map((value, domainIndex) => ({ value, domainIndex }))
        : domain.breaks
            .map((value) => ({
              value,
              domainIndex: rawCategories.findIndex((category) => Object.is(category, value)),
            }))
            .filter(({ domainIndex }) => domainIndex >= 0);
    const ticks = entries.map(({ value, domainIndex }, index) => ({
      value,
      label: format ? format(value, NaN) : String(value),
      domainIndex,
      labeled: index % labelEvery === 0,
    }));
    return { ticks, step: NaN, empty: entries.length === 0 };
  }
  const { min, max } = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ticks: [], step: NaN, empty: true };
  }

  // Explicit breaks override derivation (out-of-domain breaks are dropped).
  if (domain.breaks !== undefined && !(domain.type === "time" && domain.temporal !== undefined)) {
    const values = domain.breaks.filter((v) => Number.isFinite(v) && v >= min && v <= max);
    const step = smallestGap(values);
    const fmt: (v: number) => string = format
      ? (v) => format(v, step)
      : domain.type === "time"
        ? defaultTimeTickFormat
        : domain.type === "linear" && domain.transform === "log10"
          ? defaultLogTickFormat
          : defaultTickFormat(step);
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step,
      empty: false,
    };
  }

  if (domain.type === "time") {
    if (domain.temporal !== undefined) {
      const plan = planTemporalAxis({
        aesthetic: domain.temporal.aesthetic,
        panelIndex: domain.temporal.panelIndex,
        domain: [min, max],
        kind: domain.temporal.kind,
        orient: context.orient,
        extentPx: context.extentPx,
        reverse: domain.temporal.config.reverse === true,
        measurer: context.measurer,
        fontSize: context.fontSize,
        marginCapPx: context.marginCapPx,
        ...(context.orthogonalMarginCapPx !== undefined && {
          orthogonalMarginCapPx: context.orthogonalMarginCapPx,
        }),
        config: domain.temporal.config,
        ...(domain.breaks !== undefined && { breaks: domain.breaks }),
        ...(domain.temporal.sourceBreaks !== undefined && {
          sourceBreaks: domain.temporal.sourceBreaks,
        }),
        ...(context.previousGuidePlan?.interval !== undefined && {
          previousInterval: context.previousGuidePlan.interval,
        }),
      });
      return {
        ticks: plan.ticks.map((tick) => ({
          value: tick.value as number,
          label: tick.label,
          fullLabel: tick.fullLabel,
          kind: tick.kind,
          labeled: tick.kind === "major" && tick.label !== "",
        })),
        step: NaN,
        empty: plan.ticks.length === 0,
        guidePlan: plan,
      };
    }
    const values = timeTicks(min, max, requestedCount).values;
    const fmt: (v: number) => string = format ? (v) => format(v, NaN) : defaultTimeTickFormat;
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step: NaN,
      empty: false,
    };
  }
  // log10: decade-aware ticks selected on the semantic (positive) domain.
  if (domain.transform === "log10") {
    const values = logTicks(min, max, requestedCount);
    const fmt: (v: number) => string = format ? (v) => format(v, NaN) : defaultLogTickFormat;
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step: NaN,
      empty: false,
    };
  }
  // sqrt: select ticks in transformed (sqrt) space, inverse-project to finite
  // semantic labels so spacing is even in pixels.
  if (domain.transform === "sqrt") {
    const lo = min < 0 ? 0 : Math.sqrt(min);
    const transformedTicks = linearTicks(lo, Math.sqrt(max), requestedCount);
    const values = transformedTicks.map((t) => t * t);
    const step = smallestGap(values);
    const fmt: (v: number) => string = format ? (v) => format(v, step) : defaultTickFormat(step);
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step,
      empty: values.length === 0,
    };
  }
  const values = linearTicks(min, max, requestedCount);
  const step = min === max ? 0 : tickStep(min, max, requestedCount);
  const fmt: (v: number) => string = format ? (v) => format(v, step) : defaultTickFormat(step);
  return {
    ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
    step,
    empty: false,
  };
}

function maxLabeledWidth(axis: AxisTicks, measurer: TextMeasurer, fontSize: number): number {
  let max = 0;
  for (const t of axis.ticks) {
    if (!t.labeled) continue;
    const w = measurer.measureWidth(t.label, fontSize);
    if (w > max) max = w;
  }
  return max;
}

function truncateToFit(
  label: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  ellipsis: string,
): string {
  if (measurer.measureWidth(label, fontSize) <= maxWidth) return label;
  // oxlint-disable-next-line typescript/no-misused-spread -- code-point split is intentional (truncation granularity)
  const chars = [...label];
  for (let keep = chars.length - 1; keep >= 1; keep--) {
    const candidate = chars.slice(0, keep).join("") + ellipsis;
    if (measurer.measureWidth(candidate, fontSize) <= maxWidth) return candidate;
  }
  return ellipsis;
}

/**
 * One measurement pass: given current margins, derive ranges → tick counts →
 * ticks/labels → measure → required margins (capped, degraded, quantized).
 * Exported so tests can probe a hypothetical third pass.
 */
export function layoutPass(margins: Margins, input: LayoutInput, theme: LayoutTheme): PassResult {
  const { width, height, measurer } = input;
  const {
    fontSize,
    minMargins,
    tickLength,
    tickLabelGap,
    maxMarginFraction,
    targetPxPerTickX,
    targetPxPerTickY,
    maxTicks,
    quantum,
    ellipsis,
  } = theme;

  const innerW = Math.max(1, width - margins.left - margins.right);
  const innerH = Math.max(1, height - margins.top - margins.bottom);

  const degradations: string[] = [];

  // --- caps (per side, fraction of the plot dimension) ---
  // Caps are floored to the quantization grid so a quantized-up margin can
  // never exceed the cap (the cap wins over the min-margin floor too).
  const capify = (cap: number) => (quantum > 0 ? Math.floor(cap / quantum) * quantum : cap);
  const capLeft = capify(maxMarginFraction * width);
  const capRight = capify(maxMarginFraction * width);
  const capTop = capify(maxMarginFraction * height);
  const capBottom = capify(maxMarginFraction * height);

  // --- derive ticks (tick count depends on the provisional range) ---
  let xCount = clamp(Math.round(innerW / targetPxPerTickX), 2, maxTicks);
  let yCount = clamp(Math.round(innerH / targetPxPerTickY), 2, maxTicks);
  let xEvery = 1;
  let yEvery = 1;
  const xContext: DeriveTicksContext = {
    orient: "horizontal",
    extentPx: innerW,
    measurer,
    fontSize,
    marginCapPx: capRight,
    orthogonalMarginCapPx: capBottom,
    ...(input.previousGuidePlans?.x !== undefined && {
      previousGuidePlan: input.previousGuidePlans.x,
    }),
  };
  const yContext: DeriveTicksContext = {
    orient: "vertical",
    extentPx: innerH,
    measurer,
    fontSize,
    marginCapPx: capLeft,
    orthogonalMarginCapPx: capTop,
    ...(input.previousGuidePlans?.y !== undefined && {
      previousGuidePlan: input.previousGuidePlans.y,
    }),
  };
  let x = deriveTicks(input.x, xCount, input.formatX, xEvery, xContext);
  let y = deriveTicks(input.y, yCount, input.formatY, yEvery, yContext);
  if (x.empty) degradations.push("x:empty-domain");
  if (y.empty) degradations.push("y:empty-domain");
  if (x.guidePlan !== undefined) degradations.push(...x.guidePlan.degraded);
  if (y.guidePlan !== undefined) degradations.push(...y.guidePlan.degraded);

  const labelH = measurer.measureHeight(fontSize);

  // --- y axis → left margin (label width + tick + gap) ---
  let xTruncated = false;
  let yTruncated = false;
  const leftFixed = tickLength + tickLabelGap;
  let yLabelW = maxLabeledWidth(y, measurer, fontSize);
  if (!y.empty && y.guidePlan === undefined && yLabelW + leftFixed > capLeft) {
    // Degrade 1: tick thinning.
    while (yLabelW + leftFixed > capLeft) {
      if (input.y.type === "band") {
        if (yEvery * 2 >= y.ticks.length) break;
        yEvery *= 2;
      } else {
        if (yCount <= 2) break;
        yCount = Math.max(2, Math.floor(yCount / 2));
      }
      y = deriveTicks(input.y, yCount, input.formatY, yEvery, yContext);
      degradations.push("y:thin");
      yLabelW = maxLabeledWidth(y, measurer, fontSize);
    }
    // Degrade 2: truncation.
    if (yLabelW + leftFixed > capLeft) {
      const avail = Math.max(1, capLeft - leftFixed);
      for (const t of y.ticks) {
        const truncated = truncateToFit(t.label, avail, measurer, fontSize, ellipsis);
        if (truncated !== t.label) {
          t.label = truncated;
          yTruncated = true;
        }
      }
      degradations.push("y:truncate");
      yLabelW = maxLabeledWidth(y, measurer, fontSize);
    }
  }

  // --- x axis → bottom margin (one label line) + right margin (overhang of
  //     the last centered label) ---
  const bottomFixed = tickLength + tickLabelGap;
  let lastXLabelW = 0;
  const labeledX = () => x.ticks.filter((t) => t.labeled);
  const computeLastXW = () => {
    const lx = labeledX();
    return lx.length === 0 ? 0 : measurer.measureWidth(lx.at(-1)!.label, fontSize) / 2;
  };
  lastXLabelW = computeLastXW();
  if (!x.empty && x.guidePlan === undefined && lastXLabelW > capRight) {
    while (lastXLabelW > capRight) {
      if (input.x.type === "band") {
        if (xEvery * 2 >= x.ticks.length) break;
        xEvery *= 2;
      } else {
        if (xCount <= 2) break;
        xCount = Math.max(2, Math.floor(xCount / 2));
      }
      x = deriveTicks(input.x, xCount, input.formatX, xEvery, xContext);
      degradations.push("x:thin");
      lastXLabelW = computeLastXW();
    }
    if (lastXLabelW > capRight) {
      const avail = Math.max(1, capRight * 2); // full label width budget
      for (const t of x.ticks) {
        const truncated = truncateToFit(t.label, avail, measurer, fontSize, ellipsis);
        if (truncated !== t.label) {
          t.label = truncated;
          xTruncated = true;
        }
      }
      degradations.push("x:truncate");
      lastXLabelW = computeLastXW();
    }
  }

  // --- assemble margins: floors ⊔ measured, capped, plus reserved bands
  // (axis titles / legends — absolute, never capped away), quantized up ---
  const rawLeft = y.empty ? minMargins.left : Math.max(minMargins.left, yLabelW + leftFixed);
  const rawBottom = x.empty ? minMargins.bottom : Math.max(minMargins.bottom, labelH + bottomFixed);
  const rawRight = x.empty ? minMargins.right : Math.max(minMargins.right, lastXLabelW);
  const rawTop = y.empty ? minMargins.top : Math.max(minMargins.top, labelH / 2);
  const reserve = {
    top: input.reserve?.top ?? 0,
    right: input.reserve?.right ?? 0,
    bottom: input.reserve?.bottom ?? 0,
    left: input.reserve?.left ?? 0,
  };

  const out: Margins = {
    left: quantizeUp(Math.min(rawLeft, capLeft) + reserve.left, quantum),
    right: quantizeUp(Math.min(rawRight, capRight) + reserve.right, quantum),
    bottom: quantizeUp(Math.min(rawBottom, capBottom) + reserve.bottom, quantum),
    top: quantizeUp(Math.min(rawTop, capTop) + reserve.top, quantum),
  };

  return {
    margins: out,
    x: {
      ticks: x.ticks,
      labelEvery: xEvery,
      truncated: xTruncated,
      ...(x.guidePlan !== undefined && { guidePlan: x.guidePlan }),
    },
    y: {
      ticks: y.ticks,
      labelEvery: yEvery,
      truncated: yTruncated,
      ...(y.guidePlan !== undefined && { guidePlan: y.guidePlan }),
    },
    degradations: [...new Set(degradations)],
  };
}

/** Max per-side difference between two margin sets, in px. */
export function marginDelta(a: Margins, b: Margins): number {
  return Math.max(
    Math.abs(a.top - b.top),
    Math.abs(a.right - b.right),
    Math.abs(a.bottom - b.bottom),
    Math.abs(a.left - b.left),
  );
}

/** The bounded two-pass layout. See module docs for the rule. */
export function layout(input: LayoutInput): LayoutResult {
  const theme: LayoutTheme = { ...DEFAULT_LAYOUT_THEME, ...input.theme };
  const passA = layoutPass(theme.marginPriors, input, theme);
  const passB = layoutPass(
    passA.margins,
    {
      ...input,
      previousGuidePlans: {
        ...(passA.x.guidePlan !== undefined && { x: passA.x.guidePlan }),
        ...(passA.y.guidePlan !== undefined && { y: passA.y.guidePlan }),
      },
    },
    theme,
  );
  const converged = marginDelta(passA.margins, passB.margins) <= 0.5;
  return {
    ...passB,
    innerWidth: Math.max(1, input.width - passB.margins.left - passB.margins.right),
    innerHeight: Math.max(1, input.height - passB.margins.top - passB.margins.bottom),
    converged,
    passes: 2,
    passAMargins: passA.margins,
  };
}
