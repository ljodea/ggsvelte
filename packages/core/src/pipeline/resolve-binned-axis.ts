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
  table: ColumnTable,
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
  const seen = new Set<string>();
  for (const binding of bindings) {
    const field = axis === "x" ? binding.xField : binding.yField;
    if (field === null || seen.has(field)) continue;
    seen.add(field);
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
  const extent: [number, number] | null = explicitEdges === null && lo <= hi ? [lo, hi] : null;
  return resolveBinnedBoundaries(extent, explicitEdges, axis) ?? undefined;
}
