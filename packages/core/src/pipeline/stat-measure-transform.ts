/**
 * Forward a stat-invented mapped measure through its axis transform exactly
 * once, before position/training.
 *
 * A stat output has one of two provenance roles:
 *  - `scale-space`: computed FROM already-transformed inputs (smooth x/y/
 *    bands, bin x/xmin/xmax, density x grid, summary/boxplot aggregates) —
 *    these must never be forwarded again; call sites read them as-is.
 *  - `semantic-measure`: a stat-invented measure computed in its own units
 *    (count, density, scaled/ncount/ndensity, and bin-count equivalents)
 *    that only becomes "x"/"y" once assigned to a channel — this function is
 *    that one forward.
 *
 * Never key this decision from the public `MappedField.source === "stat"`
 * flag; that flag does not distinguish the two roles above.
 */
import type { ColumnTransformConfig } from "../scales/transform.js";

export function forwardMeasureOnce(
  column: Float64Array,
  transform: ColumnTransformConfig | undefined,
): Float64Array {
  if (transform === undefined) return column;
  const { transform: t } = transform;
  const out = new Float64Array(column.length);
  for (let i = 0; i < column.length; i++) {
    const v = column[i]!;
    out[i] = Number.isFinite(v) && t.valid(v) ? t.forward(v) : Number.NaN;
  }
  return out;
}
