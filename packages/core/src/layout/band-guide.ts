/**
 * Measured categorical (band) axis label planner — the discrete analogue of
 * `planTemporalAxis`. Escalation ladder (horizontal only):
 *
 *   single-line → wrapped (≤2 lines, top-aligned plane overlap; balanced
 *     breaks when greedy exceeds the line cap)
 *     → rotated (−45° then −90°; parallel-baseline text-text, not AABB vs column)
 *     → truncate + margin-overflow warning
 *     → thin (labelEvery)
 *     → overlap warning
 *
 * Author pins via `scales.*.guide` (`mode` / `angle` / `wrap`) skip auto
 * escalation and report honest overlap/overflow when the pin cannot fit.
 *
 * Types live in `band-guide-types.ts`; wrap/cap helpers in `band-label-layout.ts`.
 * Wrap overlap assumes the same top-aligned tspan stack as Axis.svelte /
 * render-svg-scene (plane 0 = first line).
 */

import {
  neighbourOverlap,
  neighbourOverlapByPlane,
  uniformAngleBaselinesCollide,
} from "./axis-overlap.js";
import type { BandAxisPlan, BandAxisPlanInput, BandAxisPlanTick } from "./band-guide-types.js";
import {
  BAND_THIN_MIN_CATEGORIES,
  MAX_AUTHOR_WRAP_LINES,
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

export type {
  BandAxisPlan,
  BandAxisPlanInput,
  BandGuideConfig,
  BandLabelMode,
} from "./band-guide-types.js";

function resolveMaxWrapLines(wrap: number | undefined): number {
  if (wrap === undefined || !Number.isFinite(wrap)) return MAX_WRAP_LINES;
  return Math.max(1, Math.min(MAX_AUTHOR_WRAP_LINES, Math.floor(wrap)));
}

/**
 * Planner geometry assumes labels hang down-left with text-anchor="end".
 * Normalize author angles into the supported −90..0 range (flip positive
 * angles, then clamp).
 */
function resolvePinnedAngle(angle: number | undefined): number | undefined {
  if (angle === undefined || !Number.isFinite(angle)) return undefined;
  const signed = angle > 0 ? -angle : angle;
  return Math.min(0, Math.max(-90, signed));
}

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
    config,
  } = input;
  const quantum = input.quantum ?? 0;
  const ellipsis = input.ellipsis ?? "…";
  const gap = MIN_BAND_LABEL_GAP_PX;
  const lineHeight = measurer.measureHeight(fontSize);
  const n = Math.max(1, categoryCount);
  const guideMode = config?.mode ?? "auto";
  const authorPinned = guideMode !== "auto";
  const maxWrapLines = resolveMaxWrapLines(config?.wrap);
  const pinnedAngle = resolvePinnedAngle(config?.angle);

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

  const withPin = (plan: BandAxisPlan): BandAxisPlan =>
    authorPinned ? { ...plan, authorPinned: true } : plan;

  const singlePlan = (opts?: { reportOverlap?: boolean }): BandAxisPlan => {
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
    const degraded: string[] = [];
    if (marginOverflow) degraded.push("band-label-margin-overflow");
    let overlap = false;
    if (opts?.reportOverlap === true && entries.length > 0) {
      // Remeasure after end-cap truncation so shortened display labels are what
      // the overlap check sees (not the pre-truncation entry widths).
      overlap = neighbourOverlap(
        ticks.map((tick, i) => ({
          pos: entries[i]!.center,
          half: measurer.measureWidth(tick.label, fontSize) / 2,
        })),
        gap,
      );
      if (overlap) degraded.push("band-label-overlap");
    }
    return {
      mode: "single-line",
      angle: 0,
      ticks,
      labelEvery: 1,
      labelBandHeight: lineHeight,
      alongOverhang,
      leftOverhang,
      overlap,
      marginOverflow,
      degraded,
    };
  };

  const offPlan = (): BandAxisPlan => ({
    mode: "single-line",
    angle: 0,
    ticks: buildTicks(1, (e) => ({ label: e.label })).map((tick) => ({
      ...tick,
      labeled: false,
    })),
    labelEvery: 1,
    labelBandHeight: 0,
    alongOverhang: 0,
    leftOverhang: 0,
    overlap: false,
    marginOverflow: false,
    degraded: [],
    authorPinned: true,
  });

  // mode:off applies to every orientation (including vertical / coord_flip).
  if (guideMode === "off") return offPlan();

  // Vertical band axes are not planned here (legacy path owns them).
  if (input.orient === "vertical" || entries.length === 0) return withPin(singlePlan());

  const budget = (px: number) => (quantum > 0 ? Math.floor(px / quantum) * quantum : px);
  const bandBudget = budget(bandWidth);
  const orthoCap = budget(orthogonalMarginCapPx);

  /** Try a wrap layout. When `force`, keep mode even if tokens can't wrap / overlap. */
  const tryWrapPlan = (force: boolean): BandAxisPlan | null => {
    const wrapped = entries.map((e) =>
      wrapLabel(e.label, bandBudget, measurer, fontSize, maxWrapLines, { force }),
    );
    if (!force && !wrapped.every((w): w is string[] => w !== null)) return null;
    const linesList = wrapped as string[][];
    // Per-line widths; overlap uses top-aligned planes (matches renderer tspan stack),
    // not max(lineWidths) as a centered block — a longer line2 must not reject when
    // neighbours only occupy plane 0.
    const perLineWidths = linesList.map((lines) =>
      lines.map((l) => measurer.measureWidth(l, fontSize)),
    );
    const lineWidths = perLineWidths.map((widths) => Math.max(...widths));
    const maxLines = Math.max(...linesList.map((w) => w.length));
    const blockHeight = maxLines * lineHeight;
    const wrapOverlap = neighbourOverlapByPlane(
      entries.map((e, i) => ({
        pos: e.center,
        halfByPlane: perLineWidths[i]!.map((w) => w / 2),
      })),
      gap,
    );
    if (!force && (wrapOverlap || blockHeight > orthoCap)) return null;
    let wrapLeft = 0;
    let wrapRight = 0;
    for (let i = 0; i < entries.length; i++) {
      const half = lineWidths[i]! / 2;
      wrapLeft = Math.max(wrapLeft, half - entries[i]!.center);
      wrapRight = Math.max(wrapRight, half - (extentPx - entries[i]!.center));
    }
    // Oversize wrap lines (B3 alternate breaks) can overhang the panel; non-force
    // must not accept a layout that draws into chrome without a side budget.
    if (!force && (wrapLeft > marginCapPx + 1e-6 || wrapRight > marginCapPx + 1e-6)) {
      return null;
    }
    const degraded: string[] = [];
    let marginOverflow = false;
    if (force) {
      if (wrapOverlap) degraded.push("band-label-overlap");
      if (blockHeight > orthoCap) marginOverflow = true;
      if (wrapLeft > marginCapPx + 1e-6 || wrapRight > marginCapPx + 1e-6) {
        marginOverflow = true;
      }
      if (marginOverflow) degraded.push("band-label-margin-overflow");
    }
    return {
      mode: "wrapped",
      angle: 0,
      ticks: buildTicks(1, (_e, i) => {
        const lines = linesList[i]!;
        return { label: lines.join(" "), lines };
      }),
      labelEvery: 1,
      // Always reserve within the orthogonal cap; forced over-tall pins flag overflow.
      labelBandHeight: quantizeUp(Math.min(blockHeight, orthoCap), quantum),
      alongOverhang: Math.min(marginCapPx, Math.max(0, wrapRight)),
      leftOverhang: Math.min(marginCapPx, Math.max(0, wrapLeft)),
      overlap: force ? wrapOverlap : false,
      marginOverflow,
      degraded,
    };
  };

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
  const labeledMaxWidth = (every: number) => {
    let max = 0;
    for (let i = 0; i < entries.length; i += every) max = Math.max(max, entries[i]!.width);
    return max;
  };
  // Overlap of adjacent rotated labels at a shared angle. Uniform-angle labels
  // sit on parallel baselines — collide only when perpendicular band separation
  // is below lineHeight+gap (width-independent). AABB asym extents still drive
  // overhang / side-cap truncation below; do not use them to pick −90.
  const rotatedTextCollides = (every: number, angle: number) => {
    // Labeled ticks are every `every`-th entry in display order; centers are
    // spaced by `every * bandWidth` along the axis.
    return uniformAngleBaselinesCollide(angle, bandWidth * every, lineHeight, gap);
  };

  const chooseAutoAngle = (): number => {
    return rotatedTextCollides(1, -45) ? -90 : -45;
  };

  const rotatedPlan = (angle: number): BandAxisPlan => {
    const degraded: string[] = [];
    let labelEvery = 1;
    let overlap = false;
    let marginOverflow = false;

    // Along-axis: do adjacent rotated labels still collide at their real positions?
    // Gate thinning on the number of DISPLAYED ticks (a small authored-break subset
    // of a huge domain must keep every break), never the full category count.
    if (rotatedTextCollides(1, angle)) {
      if (entries.length >= BAND_THIN_MIN_CATEGORIES) {
        // High cardinality: thin (never for a handful of named bars).
        while (rotatedTextCollides(labelEvery, angle) && labelEvery * 2 < entries.length) {
          labelEvery *= 2;
        }
        if (rotatedTextCollides(labelEvery, angle)) {
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
    // Degenerate angles (≈0) have sin≈0; avoid divide-by-zero and fall back to no
    // width cap from the orthogonal budget (side-cap truncation still applies).
    const orthoWidthBudget =
      orthoNeeded > orthoCap && sinA > 1e-9
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

    // One measureWidth per labeled tick: drives both band height (max width) and
    // end-anchored overhang (left/right extent). Avoids a second full scan.
    let shownMaxWidth = 0;
    let rotLeft = 0;
    let rotRight = 0;
    for (let i = 0; i < ticks.length; i++) {
      if (!ticks[i]!.labeled) continue;
      const center = entries[i]!.center;
      const width = measurer.measureWidth(ticks[i]!.label, fontSize);
      shownMaxWidth = Math.max(shownMaxWidth, width);
      const leftExt = leftExtOf(width, angle);
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
    const labelBandHeight = quantizeUp(Math.min(orthoOf(shownMaxWidth, angle), orthoCap), quantum);
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
  };

  // --- Author pins (no auto-escalation away from the chosen presentation) ---
  if (guideMode === "single") return withPin(singlePlan({ reportOverlap: true }));
  if (guideMode === "wrap") {
    return withPin(tryWrapPlan(true) ?? singlePlan({ reportOverlap: true }));
  }
  if (guideMode === "rotate") {
    // Prefer author angle; else the measured −45/−90 choice used by auto.
    return withPin(rotatedPlan(pinnedAngle ?? chooseAutoAngle()));
  }

  // --- auto: measured escalation ladder ---
  const floor = MODE_RANK[previousMode ?? "single-line"];

  // --- single-line ---
  if (floor <= MODE_RANK["single-line"]) {
    const singleOverlap = neighbourOverlap(
      entries.map((e) => ({ pos: e.center, half: e.width / 2 })),
      gap,
    );
    if (!singleOverlap) return singlePlan();
  }

  // --- wrapped (≤ maxWrapLines) ---
  if (floor <= MODE_RANK.wrapped) {
    const wrapped = tryWrapPlan(false);
    if (wrapped !== null) return wrapped;
  }

  // Prefer −45 (more readable, less bottom footprint); escalate to −90 ONLY when
  // −45 actually overlaps neighbours — unless the author pinned a specific angle.
  // A −45 label that merely exceeds the bottom cap is truncated within the −45
  // budget below — switching to −90 for that would need MORE bottom space and
  // truncate harder without resolving any collision.
  return rotatedPlan(pinnedAngle ?? chooseAutoAngle());
}
