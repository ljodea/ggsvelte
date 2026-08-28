/**
 * Measured categorical (band) axis label planner — the discrete analogue of
 * `planTemporalAxis`. Escalation ladder (horizontal only):
 *
 *   single-line → wrapped (≤2 lines, top-aligned plane overlap; balanced
 *     breaks when greedy exceeds the line cap)
 *     → wrap-then−45° (balanced ≤2 lines rotated; mode still "rotated"+lines)
 *     → rotated full-string (−45° then −90°; parallel-baseline text-text)
 *     → truncate + margin-overflow warning
 *     → thin (labelEvery)
 *     → overlap warning
 *
 * Author pins via `scales.*.guide` (`mode` / `angle` / `wrap`) skip auto
 * escalation and report honest overlap/overflow when the pin cannot fit.
 *
 * Types live in `band-guide-types.ts`; wrap/cap helpers in `band-label-layout.ts`;
 * the rotated/thinned planning leg lives in `band-guide-rotated.ts`.
 * Wrap overlap assumes the same top-aligned tspan stack as Axis.svelte /
 * render-svg-scene (plane 0 = first line). Multi-line rotated uses the same
 * end-anchored `rotate()` + per-line `tspan` dy stack in both renderers.
 */

import { neighbourOverlap, neighbourOverlapByPlane } from "./axis-overlap.js";
import type { BandAxisPlan, BandAxisPlanInput, BandAxisPlanTick } from "./band-guide-types.js";
import {
  MAX_AUTHOR_WRAP_LINES,
  MAX_WRAP_LINES,
  MIN_BAND_LABEL_GAP_PX,
  MODE_RANK,
  capEndOverhang,
  quantizeUp,
  wrapLabel,
  type BandLayoutEntry,
} from "./band-label-layout.js";
import { createRotatedBandPlanner } from "./band-guide-rotated.js";
import type { GuideDegradedCode } from "./guide-degraded-codes.js";

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
    const degraded: GuideDegradedCode[] = [];
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
    const degraded: GuideDegradedCode[] = [];
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

  const rotated = createRotatedBandPlanner({
    entries,
    measurer,
    fontSize,
    extentPx,
    bandWidth,
    marginCapPx,
    orthoCap,
    gap,
    lineHeight,
    quantum,
    ellipsis,
    maxWrapLines,
    buildTicks,
  });
  // --- Author pins (no auto-escalation away from the chosen presentation) ---
  if (guideMode === "single") return withPin(singlePlan({ reportOverlap: true }));
  if (guideMode === "wrap") {
    return withPin(tryWrapPlan(true) ?? singlePlan({ reportOverlap: true }));
  }
  if (guideMode === "rotate") {
    // Prefer author angle; else the measured −45/−90 choice used by auto.
    // Pins stay full-string (no silent wrap-then-rotate under mode:"rotate").
    return withPin(rotated.rotatedPlan(pinnedAngle ?? rotated.chooseAutoAngle()));
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

  // --- wrap-then−45° (mode "rotated" + lines) before full-string rotate ---
  if (floor <= MODE_RANK.rotated) {
    const hybrid = rotated.tryHybridRotatePlan();
    if (hybrid !== null) return hybrid;
  }

  // Prefer −45 (more readable, less bottom footprint); escalate to −90 ONLY when
  // −45 actually overlaps neighbours — unless the author pinned a specific angle.
  // A −45 label that merely exceeds the bottom cap is truncated within the −45
  // budget below — switching to −90 for that would need MORE bottom space and
  // truncate harder without resolving any collision.
  return rotated.rotatedPlan(pinnedAngle ?? rotated.chooseAutoAngle());
}
