/**
 * Measured categorical (band) axis label planner — the discrete analogue of
 * `planTemporalAxis`. Escalation ladder (horizontal only):
 *
 *   single-line → wrapped (≤2 lines) → rotated (−45° then −90°)
 *     → truncate + margin-overflow warning
 *     → thin (labelEvery)
 *     → overlap warning
 *
 * Types live in `band-guide-types.ts`; wrap/cap helpers in `band-label-layout.ts`.
 */

import { neighbourOverlap, neighbourOverlapAsym } from "./axis-overlap.js";
import type { BandAxisPlan, BandAxisPlanInput, BandAxisPlanTick } from "./band-guide-types.js";
import {
  BAND_THIN_MIN_CATEGORIES,
  MAX_WRAP_LINES,
  MIN_BAND_LABEL_GAP_PX,
  MODE_RANK,
  RAD,
  capEndOverhang,
  quantizeUp,
  wrapLabel,
  type BandLayoutEntry,
} from "./band-label-layout.js";
import { truncateToFit } from "./truncate.js";

export type { BandAxisPlan, BandAxisPlanInput, BandLabelMode } from "./band-guide-types.js";

export function planBandAxis(input: BandAxisPlanInput): BandAxisPlan {
  const {
    categoryCount,
    entries: inputEntries,
    extentPx,
    reverse,
    measurer,
    fontSize,
    orthogonalMarginCapPx,
    marginCapPx,
    previousMode,
  } = input;
  const quantum = input.quantum ?? 0;
  const ellipsis = input.ellipsis ?? "…";
  const gap = MIN_BAND_LABEL_GAP_PX;
  const lineHeight = measurer.measureHeight(fontSize);
  const n = Math.max(1, categoryCount);

  const bandWidth = extentPx / n;
  const centerOf = (domainIndex: number) => {
    const fraction = (domainIndex + 0.5) / n;
    return (reverse ? 1 - fraction : fraction) * extentPx;
  };
  const entries: BandLayoutEntry[] = inputEntries.map((entry) => ({
    value: entry.value,
    label: entry.label,
    domainIndex: entry.domainIndex,
    center: centerOf(entry.domainIndex),
    width: measurer.measureWidth(entry.label, fontSize),
  }));

  const buildTicks = (
    every: number,
    build: (
      entry: BandLayoutEntry,
      index: number,
    ) => Pick<BandAxisPlanTick, "label" | "lines" | "angle">,
  ): BandAxisPlanTick[] =>
    entries.map((entry, i) => {
      const enriched = build(entry, i);
      return {
        value: entry.value,
        label: enriched.label,
        fullLabel: entry.label,
        labeled: i % every === 0,
        domainIndex: entry.domainIndex,
        ...(enriched.lines !== undefined && { lines: enriched.lines }),
        ...(enriched.angle !== undefined && { angle: enriched.angle }),
      };
    });

  const singlePlan = (): BandAxisPlan => {
    const ticks = buildTicks(1, (e) => ({ label: e.label }));
    const { alongOverhang, leftOverhang, marginOverflow } = capEndOverhang(
      ticks,
      entries,
      extentPx,
      marginCapPx,
      measurer,
      fontSize,
      ellipsis,
      true,
    );
    return {
      mode: "single-line",
      angle: 0,
      ticks,
      labelEvery: 1,
      labelBandHeight: lineHeight,
      alongOverhang,
      leftOverhang,
      overlap: false,
      marginOverflow,
      degraded: marginOverflow ? ["band-label-margin-overflow"] : [],
    };
  };

  // Vertical band axes are not planned here (legacy path owns them).
  if (input.orient === "vertical" || entries.length === 0) return singlePlan();

  const budget = (px: number) => (quantum > 0 ? Math.floor(px / quantum) * quantum : px);
  const bandBudget = budget(bandWidth);
  const orthoCap = budget(orthogonalMarginCapPx);

  const floor = MODE_RANK[previousMode ?? "single-line"];

  // --- single-line ---
  if (floor <= MODE_RANK["single-line"]) {
    const singleOverlap = neighbourOverlap(
      entries.map((e) => ({ pos: e.center, half: e.width / 2 })),
      gap,
    );
    if (!singleOverlap) return singlePlan();
  }

  // --- wrapped (≤ MAX_WRAP_LINES) ---
  if (floor <= MODE_RANK.wrapped) {
    // Wrap once per entry; reuse lines + measured widths for overlap, side
    // reserve, and tick emission (avoid re-wrap + re-measure on the emit path).
    const wrapped = entries.map((e) =>
      wrapLabel(e.label, bandBudget, measurer, fontSize, MAX_WRAP_LINES),
    );
    if (wrapped.every((w): w is string[] => w !== null)) {
      const lineWidths = wrapped.map((lines) =>
        Math.max(...lines.map((l) => measurer.measureWidth(l, fontSize))),
      );
      const maxLines = Math.max(...wrapped.map((w) => w.length));
      const blockHeight = maxLines * lineHeight;
      const wrapOverlap = neighbourOverlap(
        entries.map((e, i) => ({ pos: e.center, half: lineWidths[i]! / 2 })),
        gap,
      );
      if (!wrapOverlap && blockHeight <= orthoCap) {
        // Reserve each side from the widest wrapped line at its real end position.
        let wrapLeft = 0;
        let wrapRight = 0;
        for (let i = 0; i < entries.length; i++) {
          const half = lineWidths[i]! / 2;
          wrapLeft = Math.max(wrapLeft, half - entries[i]!.center);
          wrapRight = Math.max(wrapRight, half - (extentPx - entries[i]!.center));
        }
        return {
          mode: "wrapped",
          angle: 0,
          ticks: buildTicks(1, (_e, i) => {
            const lines = wrapped[i]!;
            return { label: lines.join(" "), lines };
          }),
          labelEvery: 1,
          labelBandHeight: quantizeUp(blockHeight, quantum),
          alongOverhang: Math.min(marginCapPx, Math.max(0, wrapRight)),
          leftOverhang: Math.min(marginCapPx, Math.max(0, wrapLeft)),
          overlap: false,
          marginOverflow: false,
          degraded: [],
        };
      }
    }
  }

  // --- rotated (−45 then −90) ---
  // The SVG renderer hangs rotated labels with text-anchor="end", so the along-
  // axis footprint is ASYMMETRIC about the tick: it extends mostly to the LEFT
  // (the text runs up-left from the tick), with only a half-line-height to the
  // right. Model those exact bounds so mixed-width labels can't pass the overlap
  // / side-margin checks and then clip the previous tick or the left edge.
  const leftExtOf = (width: number, angle: number) => {
    const a = Math.abs(angle) * RAD;
    return width * Math.cos(a) + (lineHeight / 2) * Math.sin(a);
  };
  const rightExtOf = (angle: number) => (lineHeight / 2) * Math.sin(Math.abs(angle) * RAD);
  const orthoOf = (width: number, angle: number) => {
    const a = Math.abs(angle) * RAD;
    return width * Math.sin(a) + lineHeight * Math.cos(a);
  };
  /** Widest label among the currently-labeled (every k-th) entries. */
  const labeledMaxWidth = (every: number) =>
    Math.max(0, ...entries.filter((_, i) => i % every === 0).map((e) => e.width));
  // Overlap of the rotated footprint measured at the ACTUAL displayed tick
  // positions (every k-th when thinned) with each label's own end-anchored
  // footprint — so a sparse break subset hundreds of px apart is never wrongly
  // thinned, a hidden wide label never inflates the check, and a long label after
  // a short one is caught overlapping its left neighbour.
  const rotatedOverlaps = (angle: number, every: number) =>
    neighbourOverlapAsym(
      entries
        .filter((_, i) => i % every === 0)
        .map((e) => ({ pos: e.center, left: leftExtOf(e.width, angle), right: rightExtOf(angle) })),
      gap,
    );
  // Prefer −45 (more readable, less bottom footprint); escalate to −90 ONLY when
  // −45 actually overlaps neighbours. A −45 label that merely exceeds the bottom
  // cap is truncated within the −45 budget below — switching to −90 for that would
  // need MORE bottom space (its footprint is the full label width) and truncate
  // harder without resolving any collision.
  const angle = rotatedOverlaps(-45, 1) ? -90 : -45;

  const degraded: string[] = [];
  let labelEvery = 1;
  let overlap = false;
  let marginOverflow = false;

  // Along-axis: do adjacent rotated labels still collide at their real positions?
  // Gate thinning on the number of DISPLAYED ticks (a small authored-break subset
  // of a huge domain must keep every break), never the full category count.
  if (rotatedOverlaps(angle, 1)) {
    if (entries.length >= BAND_THIN_MIN_CATEGORIES) {
      // High cardinality: thin (never for a handful of named bars).
      while (rotatedOverlaps(angle, labelEvery) && labelEvery * 2 < entries.length) {
        labelEvery *= 2;
      }
      if (rotatedOverlaps(angle, labelEvery)) {
        overlap = true;
        degraded.push("band-label-overlap");
      }
    } else {
      overlap = true;
      degraded.push("band-label-overlap");
    }
  }

  // Orthogonal: recompute the footprint from the labels that survive thinning, so
  // a hidden wide label neither truncates visible text nor emits a false overflow.
  const shownWidth = labeledMaxWidth(labelEvery);
  const orthoNeeded = orthoOf(shownWidth, angle);
  const a = Math.abs(angle) * RAD;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);
  // Uniform width budget from the bottom cap (∞ when the whole band already fits).
  const orthoWidthBudget =
    orthoNeeded > orthoCap
      ? Math.max(1, (orthoCap - lineHeight * cosA) / sinA)
      : Number.POSITIVE_INFINITY;

  // Truncate each label to the TIGHTER of the bottom-cap budget and its own LEFT
  // side cap. An end-anchored rotated label extends left by leftExtOf(w), which
  // must fit `center + marginCapPx` or it draws past the viewport into chrome.
  // (For −90 the left extent is width-independent, so truncation can't help; that
  // degenerate case is flagged in the overhang pass below.)
  const ticks = buildTicks(labelEvery, (e) => {
    let widthBudget = orthoWidthBudget;
    if (cosA > 1e-9) {
      const sideBudget = (e.center + marginCapPx - (lineHeight / 2) * sinA) / cosA;
      widthBudget = Math.min(widthBudget, sideBudget);
    }
    const label =
      widthBudget === Number.POSITIVE_INFINITY
        ? e.label
        : truncateToFit(e.label, Math.max(1, widthBudget), measurer, fontSize, ellipsis);
    if (label !== e.label) marginOverflow = true;
    return { label, angle };
  });

  const shownMaxWidth = Math.max(
    0,
    ...ticks.filter((t) => t.labeled).map((t) => measurer.measureWidth(t.label, fontSize)),
  );
  const labelBandHeight = quantizeUp(Math.min(orthoOf(shownMaxWidth, angle), orthoCap), quantum);
  // End overhang of the end-anchored rotated footprint at the real end positions.
  // Left extent dominates (text runs up-left from the tick); right is ~half a line
  // height. Tracked per side from the (truncated) labeled ticks, clamped to the cap.
  let rotLeft = 0;
  let rotRight = 0;
  for (let i = 0; i < ticks.length; i++) {
    if (!ticks[i]!.labeled) continue;
    const center = entries[i]!.center;
    const leftExt = leftExtOf(measurer.measureWidth(ticks[i]!.label, fontSize), angle);
    const rightExt = rightExtOf(angle);
    // Width-independent residual (chiefly −90): if the footprint still exceeds the
    // side cap after truncation we cannot shrink it further — flag honestly.
    if (
      leftExt > center + marginCapPx + 1e-6 ||
      rightExt > extentPx - center + marginCapPx + 1e-6
    ) {
      marginOverflow = true;
    }
    rotLeft = Math.max(rotLeft, leftExt - center);
    rotRight = Math.max(rotRight, rightExt - (extentPx - center));
  }
  if (marginOverflow) degraded.push("band-label-margin-overflow");
  const alongOverhang = Math.max(0, Math.min(marginCapPx, rotRight));
  const leftOverhang = Math.max(0, Math.min(marginCapPx, rotLeft));

  return {
    mode: "rotated",
    angle,
    ticks,
    labelEvery,
    labelBandHeight,
    alongOverhang,
    leftOverhang,
    overlap,
    marginOverflow,
    degraded,
  };
}
