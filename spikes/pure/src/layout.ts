/**
 * M0a-3 spike — bounded two-pass layout.
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
 * absorb measurer drift (canonical metrics-table vs native canvas — see the
 * drift test in spikes/browser) and it also stabilizes the pass A→B loop:
 * margins move in whole quanta, so sub-quantum measurement wobble cannot
 * oscillate tick counts.
 *
 * Label rotation is intentionally NOT implemented (skipped per spike scope).
 */

import type { TextMeasurer } from './measure.js';
import { defaultTickFormat, linearTicks, tickStep } from './ticks.js';

export type Domain =
  | { type: 'linear'; min: number; max: number }
  | { type: 'band'; categories: string[] };

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Tick {
  value: number | string;
  label: string;
  /** false when band-label thinning hides this tick's label. */
  labeled: boolean;
}

export interface AxisResult {
  ticks: Tick[];
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
  ellipsis: '…',
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
}

function deriveTicks(
  domain: Domain,
  requestedCount: number,
  format: TickFormatter | undefined,
  labelEvery: number,
): AxisTicks {
  if (domain.type === 'band') {
    const cats = domain.categories;
    const ticks = cats.map((c, i) => ({
      value: c,
      label: format ? format(c, NaN) : String(c),
      labeled: i % labelEvery === 0,
    }));
    return { ticks, step: NaN, empty: cats.length === 0 };
  }
  const { min, max } = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ticks: [], step: NaN, empty: true };
  }
  const values = linearTicks(min, max, requestedCount);
  const step = min === max ? 0 : tickStep(min, max, requestedCount);
  const fmt: (v: number) => string = format
    ? (v) => format(v, step)
    : defaultTickFormat(step);
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
  const chars = [...label];
  for (let keep = chars.length - 1; keep >= 1; keep--) {
    const candidate = chars.slice(0, keep).join('') + ellipsis;
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
    fontSize, minMargins, tickLength, tickLabelGap, maxMarginFraction,
    targetPxPerTickX, targetPxPerTickY, maxTicks, quantum, ellipsis,
  } = theme;

  const innerW = Math.max(1, width - margins.left - margins.right);
  const innerH = Math.max(1, height - margins.top - margins.bottom);

  const degradations: string[] = [];

  // --- derive ticks (tick count depends on the provisional range) ---
  let xCount = clamp(Math.round(innerW / targetPxPerTickX), 2, maxTicks);
  let yCount = clamp(Math.round(innerH / targetPxPerTickY), 2, maxTicks);
  let xEvery = 1;
  let yEvery = 1;
  let x = deriveTicks(input.x, xCount, input.formatX, xEvery);
  let y = deriveTicks(input.y, yCount, input.formatY, yEvery);
  if (x.empty) degradations.push('x:empty-domain');
  if (y.empty) degradations.push('y:empty-domain');

  const labelH = measurer.measureHeight(fontSize);

  // --- caps (per side, fraction of the plot dimension) ---
  // Caps are floored to the quantization grid so a quantized-up margin can
  // never exceed the cap (the cap wins over the min-margin floor too).
  const capify = (cap: number) => (quantum > 0 ? Math.floor(cap / quantum) * quantum : cap);
  const capLeft = capify(maxMarginFraction * width);
  const capRight = capify(maxMarginFraction * width);
  const capTop = capify(maxMarginFraction * height);
  const capBottom = capify(maxMarginFraction * height);

  // --- y axis → left margin (label width + tick + gap) ---
  let xTruncated = false;
  let yTruncated = false;
  const leftFixed = tickLength + tickLabelGap;
  let yLabelW = maxLabeledWidth(y, measurer, fontSize);
  if (!y.empty && yLabelW + leftFixed > capLeft) {
    // Degrade 1: tick thinning.
    while (yLabelW + leftFixed > capLeft) {
      if (input.y.type === 'linear') {
        if (yCount <= 2) break;
        yCount = Math.max(2, Math.floor(yCount / 2));
        y = deriveTicks(input.y, yCount, input.formatY, yEvery);
      } else {
        if (yEvery * 2 >= y.ticks.length) break;
        yEvery *= 2;
        y = deriveTicks(input.y, yCount, input.formatY, yEvery);
      }
      degradations.push('y:thin');
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
      degradations.push('y:truncate');
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
    return lx.length === 0 ? 0 : measurer.measureWidth(lx[lx.length - 1].label, fontSize) / 2;
  };
  lastXLabelW = computeLastXW();
  if (!x.empty && lastXLabelW > capRight) {
    while (lastXLabelW > capRight) {
      if (input.x.type === 'linear') {
        if (xCount <= 2) break;
        xCount = Math.max(2, Math.floor(xCount / 2));
        x = deriveTicks(input.x, xCount, input.formatX, xEvery);
      } else {
        if (xEvery * 2 >= x.ticks.length) break;
        xEvery *= 2;
        x = deriveTicks(input.x, xCount, input.formatX, xEvery);
      }
      degradations.push('x:thin');
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
      degradations.push('x:truncate');
      lastXLabelW = computeLastXW();
    }
  }

  // --- assemble margins: floors ⊔ measured, capped, quantized up ---
  const rawLeft = y.empty ? minMargins.left : Math.max(minMargins.left, yLabelW + leftFixed);
  const rawBottom = x.empty ? minMargins.bottom : Math.max(minMargins.bottom, labelH + bottomFixed);
  const rawRight = x.empty ? minMargins.right : Math.max(minMargins.right, lastXLabelW);
  const rawTop = y.empty ? minMargins.top : Math.max(minMargins.top, labelH / 2);

  const out: Margins = {
    left: quantizeUp(Math.min(rawLeft, capLeft), quantum),
    right: quantizeUp(Math.min(rawRight, capRight), quantum),
    bottom: quantizeUp(Math.min(rawBottom, capBottom), quantum),
    top: quantizeUp(Math.min(rawTop, capTop), quantum),
  };

  return {
    margins: out,
    x: { ticks: x.ticks, labelEvery: xEvery, truncated: xTruncated },
    y: { ticks: y.ticks, labelEvery: yEvery, truncated: yTruncated },
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
  const passB = layoutPass(passA.margins, input, theme);
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
