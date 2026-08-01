/**
 * Ring-cut windowing for closed filled subpaths (polygon holes, #809).
 *
 * SVG serialization, canvas tracing, hit-testing, and coord projection each
 * need the ring boundaries inside one subpath window. Every one of them used
 * to scan the whole batch-wide `ringStarts` array per subpath, so a batch with
 * S subpaths and R hole rings paid O(S x R) per render pass.
 *
 * A cursor carried across an ascending subpath loop would reach O(S + R), but
 * not every caller qualifies: hit-testing windows one subpath at a time in
 * probe order, and the canvas focus pass traces an arbitrary subset. A search
 * that stands alone per call serves all of them.
 */

/**
 * Cut points for the subpath `[start, end)`: `start`, then every `ringStarts`
 * value strictly inside `(start, end)` in ascending order, then `end`.
 *
 * `ringStarts` must be ascending — both producers append at a monotonically
 * increasing vertex cursor, and pairing the cuts into rings already depends on
 * it. Binary lower bound plus a walk over the window: O(log R + k) per call.
 */
export function ringCuts(ringStarts: ArrayLike<number>, start: number, end: number): number[] {
  const cuts: number[] = [start];
  let lo = 0;
  let hi = ringStarts.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ringStarts[mid]! > start) hi = mid;
    else lo = mid + 1;
  }
  for (let i = lo; i < ringStarts.length; i++) {
    const b = ringStarts[i]!;
    if (b >= end) break;
    cuts.push(b);
  }
  cuts.push(end);
  return cuts;
}
