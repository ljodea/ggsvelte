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

/** Greedy word wrap; null when a single token exceeds `maxWidth` or lines > cap. */
export function wrapLabel(
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
