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
 * Linear/temporal tick labels are single-line and never rotated. Categorical
 * (band) x-axes go through the measured `planBandAxis` planner, which may wrap or
 * rotate labels within the axis band (see band-guide.ts); that layout travels on
 * the guide plan (bandLabelMode/bandLabelAngle) and enriched ticks, not here.
 *
 * Types live in `layout-types.ts`; tick derivation in `layout-derive-ticks.ts`.
 * This module owns measurement / margin assembly and re-exports the public surface.
 */

import type { AxisGuidePlan } from "./guide-plan-types.js";
import type { TextMeasurer } from "./measure.js";
import { deriveTicks, type AxisTicks, type DeriveTicksContext } from "./layout-derive-ticks.js";
import { truncateToFit } from "./truncate.js";
import {
  DEFAULT_LAYOUT_THEME,
  type LayoutInput,
  type LayoutResult,
  type LayoutTheme,
  type Margins,
  type PassResult,
} from "./layout-types.js";

export {
  DEFAULT_LAYOUT_THEME,
  type AxisResult,
  type BandLayoutDomainContext,
  type Domain,
  type LayoutAxisPresentation,
  type LayoutInput,
  type LayoutResult,
  type LayoutTheme,
  type Margins,
  type PassResult,
  type TemporalLayoutDomainContext,
  type Tick,
  type TickFormatter,
} from "./layout-types.js";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function quantizeUp(px: number, quantum: number): number {
  if (quantum <= 0) return px;
  return Math.ceil(px / quantum - 1e-9) * quantum;
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

/** Measure preserved labels without mutating the semantic guide plan. */
function presentForLayout(axis: AxisTicks, preserve: boolean): AxisTicks {
  if (!preserve) return axis;
  return {
    ...axis,
    ticks: axis.ticks.map((tick) => {
      const { angle: _angle, lines: _lines, ...rest } = tick;
      return { ...rest, label: tick.fullLabel ?? tick.label, labeled: true };
    }),
  };
}

function hideLabelPresentation(plan: AxisGuidePlan): AxisGuidePlan {
  const {
    bandLabelMode: _mode,
    bandLabelAngle: _angle,
    bandLabelBandHeight: _height,
    bandLabelAuthorPinned: _pinned,
    ...semantic
  } = plan;
  return Object.freeze({
    ...semantic,
    overlap: false,
    marginOverflow: false,
    degraded: Object.freeze([]),
  });
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
  const xPresentation = input.axis?.x;
  const yPresentation = input.axis?.y;
  const xVisible = xPresentation?.visible !== false;
  const yVisible = yPresentation?.visible !== false;
  const xLabelsVisible = xVisible && xPresentation?.showLabels !== false;
  const yLabelsVisible = yVisible && yPresentation?.showLabels !== false;
  const xTicksVisible = xVisible && xPresentation?.showTicks !== false;
  const yTicksVisible = yVisible && yPresentation?.showTicks !== false;
  const xPreserve = xLabelsVisible && xPresentation?.collision === "preserve";
  const yPreserve = yLabelsVisible && yPresentation?.collision === "preserve";

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
    orthogonalChromePx: tickLength + tickLabelGap,
    quantum,
    ellipsis,
    ...(xPresentation?.collision === "ellipsis" && { bandCollision: "ellipsis" as const }),
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
  let x = presentForLayout(
    deriveTicks(input.x, xCount, input.formatX, xEvery, xContext),
    xPreserve,
  );
  let y = presentForLayout(
    deriveTicks(input.y, yCount, input.formatY, yEvery, yContext),
    yPreserve,
  );
  // The measured band planner owns its own thinning; adopt its labelEvery.
  if (x.bandLabelEvery !== undefined) xEvery = x.bandLabelEvery;
  if (x.empty) degradations.push("x:empty-domain");
  if (y.empty) degradations.push("y:empty-domain");
  if (xLabelsVisible && !xPreserve && x.guidePlan !== undefined)
    degradations.push(...x.guidePlan.degraded);
  if (yLabelsVisible && !yPreserve && y.guidePlan !== undefined)
    degradations.push(...y.guidePlan.degraded);

  const labelH = measurer.measureHeight(fontSize);

  // --- y axis → left margin (label width + tick + gap) ---
  let xTruncated = false;
  let yTruncated = false;
  const leftFixed =
    (yTicksVisible ? tickLength : 0) + (yTicksVisible && yLabelsVisible ? tickLabelGap : 0);
  let yLabelW = yLabelsVisible ? maxLabeledWidth(y, measurer, fontSize) : 0;
  if (
    yLabelsVisible &&
    !yPreserve &&
    !y.empty &&
    y.guidePlan === undefined &&
    yLabelW + leftFixed > capLeft
  ) {
    // Degrade 1: tick thinning.
    while (yLabelW + leftFixed > capLeft) {
      if (input.y.type === "band") {
        if (yEvery * 2 >= y.ticks.length) break;
        yEvery *= 2;
      } else {
        if (yCount <= 2) break;
        yCount = Math.max(2, Math.floor(yCount / 2));
      }
      y = presentForLayout(
        deriveTicks(input.y, yCount, input.formatY, yEvery, yContext),
        yPreserve,
      );
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
  const bottomFixed =
    (xTicksVisible ? tickLength : 0) + (xTicksVisible && xLabelsVisible ? tickLabelGap : 0);
  let lastXLabelW = 0;
  let firstXLabelW = 0;
  const labeledX = () => (xLabelsVisible ? x.ticks.filter((tick) => tick.labeled) : []);
  const computeXEndWidths = () => {
    const labeled = labeledX();
    firstXLabelW =
      labeled.length === 0 ? 0 : measurer.measureWidth(labeled[0]!.label, fontSize) / 2;
    lastXLabelW =
      labeled.length === 0 ? 0 : measurer.measureWidth(labeled.at(-1)!.label, fontSize) / 2;
  };
  computeXEndWidths();
  if (
    xLabelsVisible &&
    !xPreserve &&
    !x.empty &&
    x.guidePlan === undefined &&
    lastXLabelW > capRight
  ) {
    for (;;) {
      if (lastXLabelW <= capRight) break;
      if (input.x.type === "band") {
        if (xEvery * 2 >= x.ticks.length) break;
        xEvery *= 2;
      } else {
        if (xCount <= 2) break;
        xCount = Math.max(2, Math.floor(xCount / 2));
      }
      x = presentForLayout(
        deriveTicks(input.x, xCount, input.formatX, xEvery, xContext),
        xPreserve,
      );
      degradations.push("x:thin");
      computeXEndWidths();
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
      computeXEndWidths();
    }
  }

  // --- assemble margins: floors ⊔ measured, capped, plus reserved bands
  // (axis titles / legends — absolute, never capped away), quantized up ---
  // Measured band axes budget the wrapped/rotated band height and the along-axis
  // overhang of the end labels, instead of the single-line defaults.
  const bandPlanned = xLabelsVisible && !xPreserve && x.bandLabelBandHeight !== undefined;
  // A band end label that overhangs past x=0 (single category, reversed axis, or a
  // wide leftmost break) must be reserved in the LEFT margin too, not just right.
  const bandLeft = bandPlanned ? (x.bandLeftOverhang ?? 0) : xPreserve ? firstXLabelW : 0;
  const rawLeft =
    y.empty || !yVisible
      ? Math.max(minMargins.left, bandLeft)
      : Math.max(minMargins.left, yLabelW + leftFixed, bandLeft);
  const rawBottom =
    x.empty || !xVisible
      ? minMargins.bottom
      : Math.max(
          minMargins.bottom,
          (xLabelsVisible ? (x.bandLabelBandHeight ?? labelH) : 0) + bottomFixed,
        );
  const rawRight =
    x.empty || !xLabelsVisible
      ? minMargins.right
      : bandPlanned
        ? Math.max(minMargins.right, x.bandAlongOverhang ?? 0)
        : Math.max(minMargins.right, lastXLabelW);
  const rawTop = y.empty || !yLabelsVisible ? minMargins.top : Math.max(minMargins.top, labelH / 2);
  const reserve = {
    top: input.reserve?.top ?? 0,
    right: input.reserve?.right ?? 0,
    bottom: input.reserve?.bottom ?? 0,
    left: input.reserve?.left ?? 0,
  };

  const out: Margins = {
    left: quantizeUp(
      (xPreserve || yPreserve ? rawLeft : Math.min(rawLeft, capLeft)) + reserve.left,
      quantum,
    ),
    right: quantizeUp(
      (xPreserve ? rawRight : Math.min(rawRight, capRight)) + reserve.right,
      quantum,
    ),
    bottom: quantizeUp(Math.min(rawBottom, capBottom) + reserve.bottom, quantum),
    top: quantizeUp(Math.min(rawTop, capTop) + reserve.top, quantum),
  };

  const xGuidePlan =
    x.guidePlan === undefined
      ? undefined
      : xLabelsVisible
        ? x.guidePlan
        : hideLabelPresentation(x.guidePlan);
  const yGuidePlan =
    y.guidePlan === undefined
      ? undefined
      : yLabelsVisible
        ? y.guidePlan
        : hideLabelPresentation(y.guidePlan);
  return {
    margins: out,
    x: {
      ticks: x.ticks,
      labelEvery: xEvery,
      truncated: xTruncated,
      ...(xGuidePlan !== undefined && { guidePlan: xGuidePlan }),
    },
    y: {
      ticks: y.ticks,
      labelEvery: yEvery,
      truncated: yTruncated,
      ...(yGuidePlan !== undefined && { guidePlan: yGuidePlan }),
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
