/**
 * Band label layout helpers: wrap, end-overhang cap, mode ranking.
 */
import type { TextMeasurer } from "./measure.js";
import { truncateToFit } from "./truncate.js";
import type { BandAxisPlanTick, BandLabelMode } from "./band-guide-types.js";

export const MODE_RANK: Record<BandLabelMode, number> = {
  "single-line": 0,
  wrapped: 1,
  rotated: 2,
};

/** Minimum clear gap between adjacent band labels, px. */
export const MIN_BAND_LABEL_GAP_PX = 4;
/** Below this category count, thinning would hide a named bar → never thin. */
export const BAND_THIN_MIN_CATEGORIES = 12;
/** Wrapped labels use at most this many lines before escalating to rotation. */
export const MAX_WRAP_LINES = 2;
/** Clamp author `guide.wrap` into a sane line budget. */
export const MAX_AUTHOR_WRAP_LINES = 8;

export const RAD = Math.PI / 180;

export interface BandLayoutEntry {
  value: string | number;
  label: string;
  domainIndex: number;
  center: number;
  width: number;
}

export function quantizeUp(px: number, quantum: number): number {
  if (quantum <= 0) return px;
  return Math.ceil(px / quantum - 1e-9) * quantum;
}

/**
 * Greedy word wrap.
 * - null when a single token exceeds `maxWidth` (unbreakable), or when
 *   lines > cap and no ≤`maxLines` alternate break exists (`force` false).
 * - When greedy needs more than `maxLines`, auto tries every token split that
 *   yields exactly `maxLines` (preferring lines that fit `maxWidth`, else the
 *   most balanced max-line-width). Oversize lines are allowed; callers validate
 *   neighbour overlap and side margins.
 * - When `force` is true and the wrap needs more than `maxLines`, keep the
 *   first `maxLines - 1` lines and join the remainder onto the last line so
 *   forced wrap pins stay multi-line instead of collapsing to the full label.
 */
export function wrapLabel(
  label: string,
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  maxLines: number,
  options?: { readonly force?: boolean },
): string[] | null {
  const force = options?.force === true;
  const words = label.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 1) {
    return measurer.measureWidth(label, fontSize) <= maxWidth || force ? [label] : null;
  }
  for (const word of words) {
    if (measurer.measureWidth(word, fontSize) > maxWidth) {
      // Unbreakable token — force keeps a single-line pin; auto escalates.
      return force ? [label] : null;
    }
  }
  const greedy = greedyWrapLines(words, maxWidth, measurer, fontSize);
  if (greedy.length <= maxLines) return greedy;
  if (!force) return bestFixedLineWrap(words, maxWidth, measurer, fontSize, maxLines);
  // Cap: preserve multi-line presentation; remaining words sit on the last line
  // (may be over-wide — callers report side/overlap overflow honestly).
  if (maxLines === 1) return [greedy.join(" ")];
  const head = greedy.slice(0, maxLines - 1);
  const tail = greedy.slice(maxLines - 1).join(" ");
  return [...head, tail];
}

function greedyWrapLines(
  words: readonly string[],
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current === "" ? word : `${current} ${word}`;
    if (measurer.measureWidth(trial, fontSize) <= maxWidth) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

/**
 * Produce exactly `maxLines` by splitting on word boundaries. Prefers every
 * line ≤ maxWidth; otherwise minimizes the widest line (balanced break).
 */
function bestFixedLineWrap(
  words: readonly string[],
  maxWidth: number,
  measurer: TextMeasurer,
  fontSize: number,
  maxLines: number,
): string[] | null {
  if (maxLines < 2 || words.length < maxLines) return null;
  if (maxLines === 2) {
    let best: string[] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let k = 1; k < words.length; k++) {
      const lines = [words.slice(0, k).join(" "), words.slice(k).join(" ")];
      const widths = lines.map((l) => measurer.measureWidth(l, fontSize));
      const maxW = Math.max(...widths);
      const fits = widths.every((w) => w <= maxWidth);
      // Fitting candidates outrank oversize; among equals prefer tighter max.
      const score = (fits ? 0 : 1e9) + maxW;
      if (score < bestScore) {
        bestScore = score;
        best = lines;
      }
    }
    return best;
  }
  // maxLines > 2 (author pins): fall back to greedy head + remainder on last line.
  const greedy = greedyWrapLines(words, maxWidth, measurer, fontSize);
  if (greedy.length <= maxLines) return greedy;
  const head = greedy.slice(0, maxLines - 1);
  const tail = greedy.slice(maxLines - 1).join(" ");
  return [...head, tail];
}

/**
 * Balanced multi-line split for wrap-then-rotate: ignore band width and pick
 * word breaks that minimize the widest line (≤`maxLines`). Single-token labels
 * stay one line. Used when plain wrap failed but shorter rotated lines would
 * clear the orthogonal budget that full-string −45°/ −90° cannot.
 */
export function balanceLabelLines(
  label: string,
  maxLines: number,
  measurer: TextMeasurer,
  fontSize: number,
): string[] {
  const words = label.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 1) return [label === "" ? "" : (words[0] ?? label)];
  const capped = Math.max(1, Math.min(maxLines, words.length));
  if (capped === 1) return [words.join(" ")];
  // Unlimited maxWidth → score is pure minimax line width (all "fit").
  return (
    bestFixedLineWrap(words, Number.POSITIVE_INFINITY, measurer, fontSize, capped) ?? [
      words.join(" "),
    ]
  );
}

/**
 * Cap the along-axis overhang of the end labels using their ACTUAL displayed
 * positions (not the uniform band width). Horizontal labels that overhang past
 * the panel edge + margin cap are truncated (ellipsis) and flagged; the returned
 * per-side overhangs are clamped to the cap so neither margin can be blown.
 * Left and right are tracked separately so a leftmost (or reversed) end label is
 * reserved in the LEFT margin instead of leaking blank space onto the right.
 */
export function capEndOverhang(
  ticks: BandAxisPlanTick[],
  entries: readonly BandLayoutEntry[],
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
