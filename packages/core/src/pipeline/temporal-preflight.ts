/**
 * Temporal preflight orchestration: field columns, common conversion, annotations.
 *
 * - temporal-preflight-shared.ts — docs + assertTemporalConfiguration
 * - temporal-preflight-fields.ts — mapped field parse/inference
 * - temporal-preflight-annotations.ts — annotation intercepts
 */
import type { ColumnTable } from "../table.js";

import type { PositionConversionContext } from "./temporal-position.js";
import { preflightTemporalAnnotations } from "./temporal-preflight-annotations.js";
import { preflightTemporalFields } from "./temporal-preflight-fields.js";
export { assertTemporalConfiguration } from "./temporal-preflight-shared.js";
import type {
  Advisory,
  LayerBinding,
  PipelineWarning,
  ScaleDecision,
  ScaleDiagnostic,
} from "./types.js";

export interface TemporalPreflightResult {
  decisions: ScaleDecision[];
  diagnostics: ScaleDiagnostic[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
}

export function preflightTemporalBindings(input: {
  table: ColumnTable;
  bindings: readonly LayerBinding[];
  warnings: PipelineWarning[];
  advisories: Advisory[];
  conversions: Readonly<{ x: PositionConversionContext; y: PositionConversionContext }>;
  /** Optional multi-table sources; field preflight prefers binding.sourceTable. */
  layerTables?: readonly ColumnTable[];
}): TemporalPreflightResult {
  const { table, bindings, warnings, advisories, conversions } = input;
  void input.layerTables;
  const { decisions, diagnostics } = preflightTemporalFields({
    table,
    bindings,
    warnings,
    advisories,
  });

  const commonConversion = (
    axis: "x" | "y",
    fallback: PositionConversionContext,
  ): PositionConversionContext => {
    if (fallback.parser !== "auto") return fallback;
    const concrete = new Map<string, PositionConversionContext>();
    for (const binding of bindings) {
      const isSegment = binding.layer.geom === "segment";
      const consumesXBounds = binding.layer.geom === "rect" || binding.layer.geom === "ribbon";
      const fields =
        axis === "x"
          ? [
              binding.xField,
              ...(consumesXBounds ? [binding.xminField, binding.xmaxField] : []),
              ...(isSegment ? [binding.xendField] : []),
            ]
          : [
              binding.yField,
              binding.yminField,
              binding.ymaxField,
              ...(isSegment ? [binding.yendField] : []),
            ];
      const conversion = axis === "x" ? binding.xConversion : binding.yConversion;
      if (fields.some((field) => field !== null) && conversion.parser !== "auto") {
        concrete.set(JSON.stringify(conversion), conversion);
      }
    }
    return concrete.size === 1 ? concrete.values().next().value! : fallback;
  };
  const xConversion = commonConversion("x", conversions.x);
  const yConversion = commonConversion("y", conversions.y);
  const inferredTemporalAxes = new Set(
    decisions
      .filter((decision) => decision.status === "temporal")
      .map((decision) => decision.aesthetic),
  );
  // Rowless annotations and other author-facing scalar values must use the
  // same parser decision as mapped data when that decision is unambiguous.
  preflightTemporalAnnotations({
    bindings,
    warnings,
    diagnostics,
    xConversion,
    yConversion,
    inferredTemporalAxes,
  });

  return { decisions, diagnostics, xConversion, yConversion };
}
