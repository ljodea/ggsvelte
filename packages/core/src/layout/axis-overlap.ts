/**
 * Shared axis-label overlap skeleton used by both the temporal and band guide
 * planners. Each planner supplies its own projected half-extent geometry
 * (single-line half-width/height for temporal; wrapped/rotated projected
 * bounds for band); this only owns the "sort by position, check adjacent gap"
 * logic so neither planner forks it.
 */

export interface ProjectedLabel {
  /** Along-axis center position, px. */
  pos: number;
  /** Half of the along-axis footprint at `pos`, px. */
  half: number;
}

/** True when any adjacent pair (sorted by position) collides within `gapPx`. */
export function neighbourOverlap(items: readonly ProjectedLabel[], gapPx: number): boolean {
  const sorted = [...items].toSorted((a, b) => a.pos - b.pos);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.pos + prev.half + gapPx > cur.pos - cur.half) return true;
  }
  return false;
}
