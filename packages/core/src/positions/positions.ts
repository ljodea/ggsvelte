/**
 * Position adjustments: stack, fill, dodge (ggplot2 parity, R-fixture-tested;
 * panel-aware shape — every function takes one panel's rows, so facets (M2)
 * partition first and call these per panel).
 *
 * All three operate in DATA SPACE, before scale training, so stacked totals
 * train the y domain (ggplot2's order: stat -> position -> train).
 *
 * Stacking order: within each x slot, groups stack with the FIRST-SEEN group
 * on top (descending group id at the baseline) — matching ggplot2's
 * first-factor-level-on-top default whenever first-seen order equals factor
 * level order (see decision 0008 for the deviation note).
 *
 * Mixed signs (ggplot2 3.0 semantics): positive values stack upward from
 * zero, negative values stack downward from zero, independently.
 *
 * fill: after stacking, each x slot rescales to proportions — positive runs
 * divide by the positive total, negative runs by the absolute negative total.
 */

export interface StackInput {
  /** Slot identity per row (an x band index / encoded x key). */
  slots: readonly (number | string)[];
  /** Group id per row (stacking order; see module docs). */
  groups: readonly number[];
  /** Post-stat y value per row (data space). Non-finite -> zero-height. */
  y: Float64Array;
  mode: "stack" | "fill";
}

export interface StackResult {
  /** Bar/area lower bound per row (data space). */
  ymin: Float64Array;
  /** Bar/area upper bound per row (data space). */
  ymax: Float64Array;
}

export function positionStack(input: StackInput): StackResult {
  const { slots, groups, y, mode } = input;
  const n = y.length;
  const ymin = new Float64Array(n);
  const ymax = new Float64Array(n);

  // Bucket rows per slot, keeping row order within (slot, group).
  const bySlot = new Map<number | string, number[]>();
  for (let row = 0; row < n; row++) {
    const slot = slots[row]!;
    const bucket = bySlot.get(slot);
    if (bucket === undefined) bySlot.set(slot, [row]);
    else bucket.push(row);
  }

  for (const rows of bySlot.values()) {
    // Descending group id = first-seen group ends up on top.
    const ordered = rows.toSorted((a, b) => groups[b]! - groups[a]! || a - b);
    let positive = 0;
    let negative = 0;
    for (const row of ordered) {
      const value = Number.isFinite(y[row]!) ? y[row]! : 0;
      if (value >= 0) {
        ymin[row] = positive;
        positive += value;
        ymax[row] = positive;
      } else {
        ymax[row] = negative;
        negative += value;
        ymin[row] = negative;
      }
    }
    if (mode === "fill") {
      const posTotal = positive;
      const negTotal = -negative;
      for (const row of ordered) {
        const value = Number.isFinite(y[row]!) ? y[row]! : 0;
        const total = value >= 0 ? posTotal : negTotal;
        if (total > 0) {
          ymin[row] = ymin[row]! / total;
          ymax[row] = ymax[row]! / total;
        }
      }
    }
  }
  return { ymin, ymax };
}

export interface DodgeInput {
  /** Slot identity per row (an x band index / encoded x key). */
  slots: readonly (number | string)[];
  /** Group id per row. */
  groups: readonly number[];
}

export interface DodgeResult {
  /** Dodge slot index per row (0-based, ascending group-id rank at its x). */
  slot: Uint32Array;
  /** Number of dodge slots at the row's x (per-x — ggplot2 preserve="total":
   *  an x with fewer groups divides the band among the groups present). */
  slotCount: Uint32Array;
}

/**
 * Dodge slot assignment, PER X (ggplot2 position_dodge default,
 * preserve = "total", R-fixture-pinned): within each x, the distinct groups
 * present split the band evenly, ordered by ascending group id.
 */
export function positionDodge(input: DodgeInput): DodgeResult {
  const { slots, groups } = input;
  const n = groups.length;
  const byX = new Map<number | string, number[]>();
  for (let row = 0; row < n; row++) {
    const key = slots[row]!;
    const bucket = byX.get(key);
    if (bucket === undefined) byX.set(key, [row]);
    else bucket.push(row);
  }
  const slot = new Uint32Array(n);
  const slotCount = new Uint32Array(n);
  for (const rows of byX.values()) {
    const distinct = [...new Set(rows.map((row) => groups[row]!))].toSorted((a, b) => a - b);
    const rank = new Map<number, number>();
    for (let i = 0; i < distinct.length; i++) rank.set(distinct[i]!, i);
    for (const row of rows) {
      slot[row] = rank.get(groups[row]!)!;
      slotCount[row] = distinct.length;
    }
  }
  return { slot, slotCount };
}
