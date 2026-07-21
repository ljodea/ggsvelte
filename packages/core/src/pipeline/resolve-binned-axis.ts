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
import type { PositionConversionContext } from "./temporal-position.js";
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
  const numericBreaks = config.breaks?.filter((v): v is number => typeof v === "number");
  const explicitEdges = transformExplicitBreaks(numericBreaks, scaleTransform);

  let extent: [number, number] | null = null;
  if (explicitEdges === null) {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    const seen = new Set<string>();
    for (const binding of bindings) {
      const field = axis === "x" ? binding.xField : binding.yField;
      if (field === null || seen.has(field)) continue;
      seen.add(field);
      const fieldType = table.fieldType(field, conversion.sourceParser, conversion.options);
      if (fieldType !== "quantitative") {
        throw new PipelineError(
          "binned-scale-requires-continuous",
          `/scales/${axis}`,
          `A type: "binned" scale on ${axis} is bound to field "${field}" (${fieldType}), which is not quantitative.`,
        );
      }
      const values =
        transform === undefined
          ? table.numeric(field, conversion.sourceParser, conversion.options)
          : table.transformed(field, conversion.sourceParser, conversion.options, transform)
              .transformed;
      for (let i = 0; i < values.length; i++) {
        const v = values[i]!;
        if (!Number.isFinite(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (lo <= hi) extent = [lo, hi];
  }
  return resolveBinnedBoundaries(extent, explicitEdges, axis) ?? undefined;
}
