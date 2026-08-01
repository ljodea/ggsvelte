/**
 * Ring-cut windowing for closed filled subpaths (polygon holes, #809).
 *
 * SVG serialization, canvas tracing, hit-testing, and coord projection each
 * need the ring boundaries inside one subpath window. Every one of them used
 * to scan the whole batch-wide `ringStarts` array per subpath, so a batch with
 * S subpaths and R ring starts paid O(S x R) per render pass or pointer probe.
 */
// Every export needs a lifecycle tag; the header default is read
// into lifecycle.json by scripts/gen-lifecycle.ts.
// @lifecycle-default internal

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
