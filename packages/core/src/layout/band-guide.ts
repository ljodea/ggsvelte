/**
 * Measured categorical (band) axis label planner — the discrete analogue of
 * `planTemporalAxis`. It resolves how long category labels are presented on the
 * *horizontal* band axis so every named category stays legible without
 * collisions, escalating within the axis band (never changing the aesthetic):
 *
 *   single-line → wrapped (≤2 lines) → rotated (−45° then −90°)
 *     → truncate + margin-overflow warning   (few bars, individually too long)
 *     → thin (labelEvery)                     (high cardinality: too many bars)
 *     → overlap warning                       (few bars that still collide)
 *
 * It never thins a low-cardinality axis (each bar is a named value the reader
 * must see) and never auto-flips. When rotation still can't fit, truncation is
 * loud (a `band-label-margin-overflow` degradation) and the full text stays on
 * the tick `<title>` / `fullLabel`; the pipeline surfaces a coord_flip fix.
 *
 * Vertical band axes (native Y, or categorical-on-Y after coord_flip) do NOT
 * use this planner — they keep the classic width-cap + thin/truncate path.
 */

import { neighbourOverlap, neighbourOverlapAsym } from "./axis-overlap.js";
import type { TextMeasurer } from "./measure.js";

export type BandLabelMode = "single-line" | "wrapped" | "rotated";

const MODE_RANK: Record<BandLabelMode, number> = {
  "single-line": 0,
  wrapped: 1,
  rotated: 2,
};

/** Minimum clear gap between adjacent band labels, px. */
const MIN_BAND_LABEL_GAP_PX = 4;
/** Below this category count, thinning would hide a named bar → never thin. */
const BAND_THIN_MIN_CATEGORIES = 12;
/** Wrapped labels use at most this many lines before escalating to rotation. */
const MAX_WRAP_LINES = 2;

const RAD = Math.PI / 180;

/** A pre-resolved band tick to lay out (break-matching already applied). */
interface BandPlanEntry {
  value: string | number;
  label: string;
  domainIndex: number;
}

export interface BandAxisPlanInput {
  aesthetic: "x" | "y";
  panelIndex: number;
  /** Total number of bands (band width = extentPx / categoryCount). */
  categoryCount: number;
  /** Ticks to lay out, in display order, already break-filtered. */
  entries: readonly BandPlanEntry[];
  /** Only "horizontal" is planned; "vertical" returns a single-line no-op plan. */
  orient: "horizontal" | "vertical";
  extentPx: number;
  reverse: boolean;
  measurer: TextMeasurer;
  fontSize: number;
  /** Cap for along-axis label overhang past the end ticks (right/left margin). */
  marginCapPx: number;
  /** Cap for the orthogonal label band (bottom margin for x). */
  orthogonalMarginCapPx: number;
  /** Margin quantum; fitness budgets are floored to it so mode is A→B stable. */
  quantum?: number;
  ellipsis?: string;
  /** Pass-A mode; the planner escalates only, never de-escalates. */
  previousMode?: BandLabelMode | null;
}

interface BandTick {
  value: string | number;
  label: string;
  fullLabel: string;
  labeled: boolean;
  domainIndex: number;
  /** Wrapped lines (present when mode === "wrapped"). */
  lines?: string[];
  /** Rotation in degrees (present when mode === "rotated"). */
  angle?: number;
}

export interface BandAxisPlan {
  mode: BandLabelMode;
  /** 0 | -45 | -90 */
  angle: number;
  ticks: BandTick[];
  /** 1 = every category labeled; >1 = high-cardinality thinning. */
  labelEvery: number;
  /** Orthogonal (bottom) band height the labels require, px. */
  labelBandHeight: number;
  /** Along-axis overhang past the RIGHT end tick (into the right margin), px. */
  alongOverhang: number;
  /** Along-axis overhang past the LEFT end tick (into the left margin), px. */
  leftOverhang: number;
  overlap: boolean;
  marginOverflow: boolean;
  degraded: string[];
}

interface Entry {
  value: string | number;
  label: string;
  domainIndex: number;
  center: number;
  width: number;
}

function quantizeUp(px: number, quantum: number): number {
  if (quantum <= 0) return px;
  return Math.ceil(px / quantum - 1e-9) * quantum;
}

/** Greedy word wrap; null when a single token exceeds `maxWidth` or lines > cap. */
function wrapLabel(
  label: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  maxLines: number,
): string[] | null {
  const words = label.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 1) {
    return measurer.measureWidth(label, fontSize) <= maxWidth ? [label] : null;
  }
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (measurer.measureWidth(word, fontSize) > maxWidth) return null; // unbreakable token
    const trial = current === "" ? word : `${current} ${word}`;
    if (measurer.measureWidth(trial, fontSize) <= maxWidth) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== "") lines.push(current);
  return lines.length <= maxLines ? lines : null;
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
 * Cap the along-axis overhang of the end labels using their ACTUAL displayed
 * positions (not the uniform band width). Horizontal labels that overhang past
 * the panel edge + margin cap are truncated (ellipsis) and flagged; the returned
 * per-side overhangs are clamped to the cap so neither margin can be blown.
 * Left and right are tracked separately so a leftmost (or reversed) end label is
 * reserved in the LEFT margin instead of leaking blank space onto the right.
 */
function capEndOverhang(
  ticks: BandTick[],
  entries: readonly Entry[],
  extentPx: number,
  marginCapPx: number,
  measurer: TextMeasurer,
  fontSize: number,
  ellipsis: string,
  truncatable: boolean,
): { alongOverhang: number; leftOverhang: number; marginOverflow: boolean } {
  let left = 0;
  let right = 0;
  let overflow = false;
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]!;
    if (!tick.labeled) continue;
    const center = entries[i]!.center;
    const edgeDist = Math.min(center, extentPx - center);
    const allowed = edgeDist + marginCapPx;
    let half = measurer.measureWidth(tick.label, fontSize) / 2;
    if (truncatable && half > allowed) {
      tick.label = truncateToFit(tick.label, allowed * 2, measurer, fontSize, ellipsis);
      half = measurer.measureWidth(tick.label, fontSize) / 2;
      overflow = true;
    }
    left = Math.max(left, half - center);
    right = Math.max(right, half - (extentPx - center));
  }
  return {
    alongOverhang: Math.max(0, Math.min(right, marginCapPx)),
    leftOverhang: Math.max(0, Math.min(left, marginCapPx)),
    marginOverflow: overflow,
  };
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
  const entries: Entry[] = inputEntries.map((entry) => ({
    value: entry.value,
    label: entry.label,
    domainIndex: entry.domainIndex,
    center: centerOf(entry.domainIndex),
    width: measurer.measureWidth(entry.label, fontSize),
  }));

  const buildTicks = (
    every: number,
    build: (entry: Entry, index: number) => Pick<BandTick, "label" | "lines" | "angle">,
  ): BandTick[] =>
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
    if (wrapped.every((w) => w !== null)) {
      const lineWidths = wrapped.map((lines) =>
        Math.max(...lines!.map((l) => measurer.measureWidth(l, fontSize))),
      );
      const maxLines = Math.max(...wrapped.map((w) => (w ?? []).length));
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
