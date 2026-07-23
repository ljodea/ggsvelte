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

export interface OverlapOrderOptions {
  /**
   * When true, `items` are already sorted by ascending `pos` and the O(k log k)
   * sort is skipped. Callers that project domain order (or reverse then reverse
   * for flipped axes) should pass this for the hot band-thinning path.
   */
  alreadySorted?: boolean;
}

/** True when any adjacent pair (sorted by position) collides within `gapPx`. */
export function neighbourOverlap(
  items: readonly ProjectedLabel[],
  gapPx: number,
  options?: OverlapOrderOptions,
): boolean {
  const sorted =
    options?.alreadySorted === true ? items : [...items].toSorted((a, b) => a.pos - b.pos);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.pos + prev.half + gapPx > cur.pos - cur.half) return true;
  }
  return false;
}

/** A label whose footprint is asymmetric about `pos` (e.g. an end-anchored
 *  rotated label whose text extends mostly to one side of the tick). */
export interface AsymProjectedLabel {
  pos: number;
  /** Along-axis extent to the LEFT of `pos`, px. */
  left: number;
  /** Along-axis extent to the RIGHT of `pos`, px. */
  right: number;
}

/** Asymmetric variant: collide the left neighbour's right extent against the
 *  right neighbour's left extent, so end-anchored rotated labels are judged at
 *  their real (renderer-matched) footprint rather than a centered approximation. */
export function neighbourOverlapAsym(
  items: readonly AsymProjectedLabel[],
  gapPx: number,
  options?: OverlapOrderOptions,
): boolean {
  const sorted =
    options?.alreadySorted === true ? items : [...items].toSorted((a, b) => a.pos - b.pos);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.pos + prev.right + gapPx > cur.pos - cur.left) return true;
  }
  return false;
}

/**
 * Multi-line label whose horizontal half-extents are per vertical plane.
 * Plane index matches top-aligned wrap rendering (plane 0 = first line; plane
 * k = k-th stacked line). A missing/undefined half means no text on that plane
 * (single-line neighbours occupy only plane 0).
 */
export interface PlanarProjectedLabel {
  pos: number;
  /** Half-extent on plane k; `undefined` / omitted = no glyphs on that plane. */
  halfByPlane: readonly (number | undefined)[];
}

/**
 * Top-aligned wrap collision: only same-plane neighbours can collide. A longer
 * second line does not collide with single-line neighbours that sit on plane 0.
 * Matches SVG/Svelte band wrap (`tspan` stack from the first baseline down).
 */
export function neighbourOverlapByPlane(
  items: readonly PlanarProjectedLabel[],
  gapPx: number,
): boolean {
  let maxPlanes = 0;
  for (const item of items) maxPlanes = Math.max(maxPlanes, item.halfByPlane.length);
  for (let plane = 0; plane < maxPlanes; plane++) {
    const onPlane: ProjectedLabel[] = [];
    for (const item of items) {
      const half = item.halfByPlane[plane];
      if (half !== undefined) onPlane.push({ pos: item.pos, half });
    }
    if (neighbourOverlap(onPlane, gapPx)) return true;
  }
  return false;
}

/**
 * Uniform-angle end-anchored labels sit on parallel baselines. Glyphs collide
 * iff perpendicular separation `centerSeparation · sin(|angle|)` is below
 * `lineHeight + gap`. Label width does not enter — a long AABB into the
 * neighbour's column box is not text-on-text. Keep `neighbourOverlapAsym` for
 * overhang / side-margin geometry.
 */
export function uniformAngleBaselinesCollide(
  angleDeg: number,
  centerSeparationPx: number,
  lineHeightPx: number,
  gapPx: number,
): boolean {
  const sep = Math.abs(centerSeparationPx) * Math.sin(Math.abs(angleDeg) * (Math.PI / 180));
  return sep < lineHeightPx + gapPx;
}
