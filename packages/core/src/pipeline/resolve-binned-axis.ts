/**
 * Resolve a `type: "binned"` axis's transformed-space boundaries before any
 * frame/stat construction, from the parent (pre-facet) table.
 */
import type { PositionScaleSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";
import { getScaleTransform, type ColumnTransformConfig } from "../scales/transform.js";

import {
  resolveBinnedBoundaries,
  transformExplicitBreaks,
  type BinnedBoundaries,
} from "./binned-scale.js";
import { positionFieldType, type PositionConversionContext } from "./temporal-position.js";
import type { LayerBinding } from "./types-binding.js";
import { PipelineError } from "./types.js";

export function resolveBinnedAxis(
  axis: "x" | "y",
  config: PositionScaleSpec | undefined,
  bindings: readonly LayerBinding[],
  /**
   * Per-binding filtered tables (parallel to `bindings`). Each binding's fields
   * are read from its own table so multi-table layers (#609) train extents and
   * type-check against the owning source, not the primary table alone.
   */
  tables: readonly ColumnTable[],
  conversion: PositionConversionContext,
  transform: ColumnTransformConfig | undefined,
): BinnedBoundaries | undefined {
  if (config?.type !== "binned") return undefined;
  const scaleTransform = transform?.transform ?? getScaleTransform("identity");
  const authoredBreaks = config.breaks;
  if (
    authoredBreaks !== undefined &&
    authoredBreaks.some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value) || !scaleTransform.valid(value),
    )
  ) {
    throw new PipelineError(
      "invalid-scale-breaks",
      `/scales/${axis}/breaks`,
      `A type: "binned" scale requires finite numeric boundaries inside the ${scaleTransform.key} transform domain.`,
    );
  }
  const numericBreaks = authoredBreaks as readonly number[] | undefined;
  const explicitEdges = transformExplicitBreaks(numericBreaks, scaleTransform);
  if (explicitEdges !== null && new Set(explicitEdges).size < 2) {
    throw new PipelineError(
      "invalid-scale-breaks",
      `/scales/${axis}/breaks`,
      `A type: "binned" scale requires at least two distinct usable boundaries.`,
    );
  }

  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  // Keyed by sourceId+field so same name on different tables both contribute.
  const seen = new Set<string>();
  for (let index = 0; index < bindings.length; index++) {
    const binding = bindings[index]!;
    const table = tables[index] ?? tables[0];
    if (table === undefined) continue;
    // Segment endpoints train the same axis — only when this binding is a segment
    // (plot-level aes can leave xend/yend on non-segment layers that ignore them).
    const isSegment = binding.layer.geom === "segment";
    const fields =
      axis === "x"
        ? [binding.xField, ...(isSegment ? [binding.xendField] : [])]
        : [binding.yField, ...(isSegment ? [binding.yendField] : [])];
    for (const field of fields) {
      if (field === null) continue;
      const seenKey = `${binding.sourceId}|${field}`;
      if (seen.has(seenKey)) continue;
      seen.add(seenKey);
      if (!table.has(field)) continue;
      const fieldType = positionFieldType(table, field, conversion);
      if (fieldType !== "quantitative") {
        throw new PipelineError(
          "binned-scale-requires-continuous",
          `/scales/${axis}`,
          `A type: "binned" scale on ${axis} is bound to field "${field}" (${fieldType}), which is not quantitative.`,
        );
      }
      if (explicitEdges !== null) continue;
      const values =
        transform === undefined
          ? table.numeric(field, conversion.sourceParser, conversion.options)
          : table.transformed(field, conversion.sourceParser, conversion.options, transform)
              .transformed;
      for (let i = 0; i < values.length; i++) {
        const value = values[i]!;
        if (!Number.isFinite(value)) continue;
        if (value < lo) lo = value;
        if (value > hi) hi = value;
      }
    }
  }
  const extent: [number, number] | null = explicitEdges === null && lo <= hi ? [lo, hi] : null;
  return resolveBinnedBoundaries(extent, explicitEdges, axis) ?? undefined;
}
