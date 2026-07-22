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

import { neighbourOverlap } from "./axis-overlap.js";
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
  /** Along-axis overhang past the end ticks (into left/right margin), px. */
  alongOverhang: number;
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
 * overhang is clamped to the cap so the margin can never be blown.
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
): { alongOverhang: number; marginOverflow: boolean } {
  let overhang = 0;
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
    overhang = Math.max(overhang, half - edgeDist);
  }
  return { alongOverhang: Math.max(0, Math.min(overhang, marginCapPx)), marginOverflow: overflow };
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
    build: (entry: Entry) => Pick<BandTick, "label" | "lines" | "angle">,
  ): BandTick[] =>
    entries.map((entry, i) => {
      const enriched = build(entry);
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
    const { alongOverhang, marginOverflow } = capEndOverhang(
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
    const wrapped = entries.map((e) =>
      wrapLabel(e.label, bandBudget, measurer, fontSize, MAX_WRAP_LINES),
    );
    if (wrapped.every((w) => w !== null)) {
      const lineWidth = (lines: string[]) =>
        Math.max(...lines.map((l) => measurer.measureWidth(l, fontSize)));
      const maxLines = Math.max(...wrapped.map((w) => (w ?? []).length));
      const blockHeight = maxLines * lineHeight;
      const wrapOverlap = neighbourOverlap(
        entries.map((e, i) => ({ pos: e.center, half: lineWidth(wrapped[i]!) / 2 })),
        gap,
      );
      if (!wrapOverlap && blockHeight <= orthoCap) {
        return {
          mode: "wrapped",
          angle: 0,
          ticks: buildTicks(1, (e) => {
            const lines = wrapLabel(e.label, bandBudget, measurer, fontSize, MAX_WRAP_LINES)!;
            return { label: lines.join(" "), lines };
          }),
          labelEvery: 1,
          labelBandHeight: quantizeUp(blockHeight, quantum),
          alongOverhang: Math.min(
            marginCapPx,
            Math.max(0, lineWidth(wrapped.at(-1)!) / 2 - bandWidth / 2),
          ),
          overlap: false,
          marginOverflow: false,
          degraded: [],
        };
      }
    }
  }

  // --- rotated (−45 then −90) ---
  const maxWidth = Math.max(...entries.map((e) => e.width));
  const along = (angle: number) => {
    const a = Math.abs(angle) * RAD;
    return maxWidth * Math.cos(a) + lineHeight * Math.sin(a);
  };
  const ortho = (angle: number, width: number) => {
    const a = Math.abs(angle) * RAD;
    return width * Math.sin(a) + lineHeight * Math.cos(a);
  };
  // Overlap of the rotated footprint measured at the ACTUAL displayed tick
  // positions (every k-th when thinned), not the uniform band width — so a
  // sparse break subset that is hundreds of px apart is never wrongly thinned.
  const rotatedOverlaps = (angle: number, every: number) =>
    neighbourOverlap(
      entries
        .filter((_, i) => i % every === 0)
        .map((e) => ({ pos: e.center, half: along(angle) / 2 })),
      gap,
    );
  // Prefer -45 when it clears neighbours and fits the cap; else -90.
  const fits45 = !rotatedOverlaps(-45, 1) && ortho(-45, maxWidth) <= orthoCap;
  const angle = fits45 ? -45 : -90;
  const alongFootprint = along(angle);

  const degraded: string[] = [];
  let labelEvery = 1;
  let overlap = false;
  let marginOverflow = false;
  let orthoBudgetForLabel = orthoCap;

  // Along-axis: do adjacent rotated labels still collide at their real positions?
  if (rotatedOverlaps(angle, 1)) {
    if (n >= BAND_THIN_MIN_CATEGORIES) {
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

  // Orthogonal: does the rotated label exceed the bottom cap? Truncate if so.
  const orthoNeeded = ortho(angle, maxWidth);
  if (orthoNeeded > orthoCap) {
    marginOverflow = true;
    degraded.push("band-label-margin-overflow");
    // Max label width whose rotated orthogonal footprint fits the cap.
    const a = Math.abs(angle) * RAD;
    orthoBudgetForLabel = Math.max(1, (orthoCap - lineHeight * Math.cos(a)) / Math.sin(a));
  }

  const ticks = buildTicks(labelEvery, (e) => ({
    label:
      orthoNeeded > orthoCap
        ? truncateToFit(e.label, orthoBudgetForLabel, measurer, fontSize, ellipsis)
        : e.label,
    angle,
  }));

  const shownMaxWidth = Math.max(
    0,
    ...ticks.filter((t) => t.labeled).map((t) => measurer.measureWidth(t.label, fontSize)),
  );
  const labelBandHeight = quantizeUp(Math.min(ortho(angle, shownMaxWidth), orthoCap), quantum);
  // End overhang of the rotated footprint at the real end positions (usually small
  // for −90 since the horizontal footprint is ~one line height), clamped to the cap.
  const minEdgeDist = Math.min(
    extentPx,
    ...entries
      .filter((_, i) => i % labelEvery === 0)
      .map((e) => Math.min(e.center, extentPx - e.center)),
  );
  const alongOverhang = Math.max(0, Math.min(marginCapPx, alongFootprint / 2 - minEdgeDist));

  return {
    mode: "rotated",
    angle,
    ticks,
    labelEvery,
    labelBandHeight,
    alongOverhang,
    overlap,
    marginOverflow,
    degraded,
  };
}
