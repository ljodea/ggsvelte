/**
 * Build per-panel LayerFrames: bind layers, stats, position, remap source rows.
 */
import { configuredColorScaleType, type PortableSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { bindLayer } from "./bind.js";
import { configureStyleBindings } from "./bind-layer-style-config.js";
import type { FacetPanelDef } from "./facets.js";
import { buildFrame } from "./frame.js";
import { remapToGlobalSourceRows, sliceLayerForPanel } from "./layer-panel-data.js";
import { applyPosition } from "./position.js";
import { resolveColumnTransform } from "./position-program.js";
import { assertInferredTemporalTransform } from "./scale-config-preflight.js";
import { computePanelBinRanges } from "./prepare-panels-bin-ranges.js";
import { resolveBinnedAxis } from "./resolve-binned-axis.js";
import { warnEmptyLayers } from "./prepare-panels-empty-layers.js";
import { assertRibbonBounds } from "./ribbon-bounds.js";
import { xConversionOf, yConversionOf } from "./temporal-position.js";
import type { PositionConversionContext } from "./temporal-position.js";
import { preflightTemporalBindings } from "./temporal-preflight.js";
import type { ColumnTransformConfig } from "../scales/transform.js";

const DOCS = "https://ggsvelte.sh/guide/errors";

/** Up to `limit` finite semantic values that failed the transform (invalid). */
function sampleFailingSemantic(
  view: { semantic: Float64Array; valid: Uint8Array },
  limit: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < view.semantic.length && out.length < limit; i++) {
    const value = view.semantic[i]!;
    if (view.valid[i] === 0 && Number.isFinite(value)) out.push(value);
  }
  return out;
}

/**
 * Emit one deduplicated axis diagnostic for each distinct source field whose
 * pre-stat transform/OOB dropped or clamped values (log10 <= 0, sqrt < 0, or
 * source-limit censor/squish). Counts read the full (filtered) column once.
 *
 * Every event is materialized on BOTH channels: the lean `{ code, message }`
 * warning AND a rich `ScaleDiagnostic` (problem/cause/fixes/docs + bounded
 * evidence) on `RenderModel.scaleDiagnostics`, so agents/tooling see the full
 * recovery context, not just a one-line warning.
 */
function emitTransformDomainWarnings(
  axis: "x" | "y",
  bindings: readonly LayerBinding[],
  transform: ColumnTransformConfig | undefined,
  warnings: PipelineWarning[],
  scaleDiagnostics: ScaleDiagnostic[],
): void {
  if (transform === undefined) return;
  const path = `/scales/${axis}`;
  // Keyed by sourceId+field so same field name on different tables both scan.
  const seen = new Set<string>();
  for (const binding of bindings) {
    const field = axis === "x" ? binding.xField : binding.yField;
    if (field === null) continue;
    const table = binding.sourceTable;
    if (!table.has(field)) continue;
    const seenKey = `${binding.sourceId}|${field}`;
    if (seen.has(seenKey)) continue;
    seen.add(seenKey);
    const conversion = axis === "x" ? xConversionOf(binding) : yConversionOf(binding);
    const view = table.transformed(field, conversion.sourceParser, conversion.options, transform);
    const key = transform.transform.key;
    if (view.invalidTransform > 0) {
      const samples = sampleFailingSemantic(view, 5);
      warnings.push({
        code: "scale-transform-domain",
        message: `Removed ${view.invalidTransform} value(s) outside the ${key} transform domain on the ${axis} scale (field "${field}").`,
      });
      scaleDiagnostics.push({
        code: "scale-transform-domain",
        severity: "warning",
        path,
        problem: `${view.invalidTransform} value(s) on the ${axis} scale fall outside the ${key} transform domain and were dropped before stats.`,
        cause: `The ${key} transform is undefined for those inputs (log10 requires > 0, sqrt requires >= 0); field "${field}".`,
        fixes: [
          {
            description:
              "Filter the out-of-domain rows deliberately, or use an identity/linear scale if those values are meaningful.",
          },
        ],
        evidence: { failedCount: view.invalidTransform, values: samples },
        documentationUrl: `${DOCS}#scale-transform-domain`,
      });
    }
    if (view.censored > 0) {
      warnings.push({
        code: "scale-oob-censored",
        message: `Censored ${view.censored} value(s) outside the explicit ${axis} scale limits (field "${field}").`,
      });
      scaleDiagnostics.push({
        code: "scale-oob-censored",
        severity: "warning",
        path,
        problem: `${view.censored} value(s) on the ${axis} scale fall outside the explicit source limits and were censored to missing before stats.`,
        cause: `oob: "censor" (the continuous default) drops values outside the pinned domain; field "${field}".`,
        fixes: [
          { description: 'Widen the domain, or use oob: "squish" to clamp values to the limits.' },
        ],
        evidence: { failedCount: view.censored },
        documentationUrl: `${DOCS}#scale-oob-censored`,
      });
    }
    if (view.squished > 0) {
      warnings.push({
        code: "scale-oob-squished",
        message: `Squished ${view.squished} value(s) to the nearest explicit ${axis} scale limit (field "${field}").`,
      });
      scaleDiagnostics.push({
        code: "scale-oob-squished",
        severity: "warning",
        path,
        problem: `${view.squished} value(s) on the ${axis} scale were squished to the nearest explicit source limit before stats.`,
        cause: `oob: "squish" clamps values outside the pinned domain to the nearest limit; field "${field}".`,
        fixes: [
          { description: 'Widen the domain, or use oob: "censor" to drop out-of-range values.' },
        ],
        evidence: { failedCount: view.squished },
        documentationUrl: `${DOCS}#scale-oob-squished`,
      });
    }
  }
}
import type {
  Advisory,
  LayerBinding,
  LayerFrame,
  PipelineWarning,
  ScaleDecision,
  ScaleDiagnostic,
} from "./types.js";

export function buildPanelFrames(input: {
  normalized: PortableSpec;
  layerContexts: readonly {
    sourceTable: ColumnTable;
    filteredTable: ColumnTable;
    filteredToSource: number[] | null;
    sourceId: number;
  }[];
  registry: import("./source-registry.js").SourceRegistry;
  facetPanels: readonly FacetPanelDef[];
  faceted: boolean;
  facetFields: readonly string[];
  freeX: boolean;
  warnings: PipelineWarning[];
  advisories: Advisory[];
  conversions: Readonly<{ x: PositionConversionContext; y: PositionConversionContext }>;
}): {
  bindings: LayerBinding[];
  panelFrames: LayerFrame[][];
  scaleDecisions: ScaleDecision[];
  scaleDiagnostics: ScaleDiagnostic[];
  xConversion: PositionConversionContext;
  yConversion: PositionConversionContext;
} {
  const {
    normalized,
    layerContexts,
    registry,
    facetPanels,
    faceted,
    facetFields,
    freeX,
    warnings,
    advisories,
    conversions,
  } = input;

  const bindings: LayerBinding[] = [];
  const panelFrames: LayerFrame[][] = facetPanels.map(() => []);
  // Primary filtered table (first layer) for shared bin-range fallbacks.
  const primaryFiltered = layerContexts[0]!.filteredTable;

  for (let index = 0; index < normalized.layers.length; index++) {
    const ctx = layerContexts[index]!;
    const binding = bindLayer(
      normalized.layers[index]!,
      index,
      ctx.filteredTable,
      warnings,
      conversions,
      { sourceTable: ctx.sourceTable, sourceId: ctx.sourceId },
    );
    // Match resolveColorScale family intent (domainMode/onExhaust → ordinal)
    // so line/stat grouping treats inferred ordinal color as discrete groups.
    binding.color.forcedDiscrete = ["ordinal", "manual"].includes(
      configuredColorScaleType(normalized.scales?.color) ?? normalized.scales?.color?.type ?? "",
    );
    binding.fill.forcedDiscrete = ["ordinal", "manual"].includes(
      configuredColorScaleType(normalized.scales?.fill) ?? normalized.scales?.fill?.type ?? "",
    );
    configureStyleBindings(binding, normalized.scales, ctx.filteredTable);
    bindings.push(binding);
  }
  const temporal = preflightTemporalBindings({
    table: layerContexts[0]!.sourceTable,
    bindings,
    warnings,
    advisories,
    conversions,
    layerTables: layerContexts.map((c) => c.sourceTable),
  });
  for (const axis of ["x", "y"] as const) {
    assertInferredTemporalTransform(
      axis,
      normalized.scales?.[axis],
      temporal.decisions.some(
        (decision) => decision.aesthetic === axis && decision.status === "temporal",
      ),
    );
  }
  // Resolve the effective pre-stat transform per axis (after preflight fixes the
  // parser) and attach it to every binding, so stat reads and the affine trainer
  // agree on scale-space. Continuous/binned only; time/band stay identity.
  const xTransform =
    resolveColumnTransform(normalized.scales?.x, temporal.xConversion) ?? undefined;
  const yTransform =
    resolveColumnTransform(normalized.scales?.y, temporal.yConversion) ?? undefined;
  // type: "binned" boundaries — resolve from the first layer that maps the field.
  const xBinning = resolveBinnedAxis(
    "x",
    normalized.scales?.x,
    bindings,
    primaryFiltered,
    temporal.xConversion,
    xTransform,
  );
  const yBinning = resolveBinnedAxis(
    "y",
    normalized.scales?.y,
    bindings,
    primaryFiltered,
    temporal.yConversion,
    yTransform,
  );
  for (const binding of bindings) {
    binding.xTransform = xTransform;
    binding.yTransform = yTransform;
    binding.xBinning = xBinning;
    binding.yBinning = yBinning;
  }
  // One deduplicated per-axis diagnostic for pre-stat transform-domain and OOB
  // drops, counted on each layer's source table before faceting.
  const transformDiagnostics: ScaleDiagnostic[] = [];
  emitTransformDomainWarnings("x", bindings, xTransform, warnings, transformDiagnostics);
  emitTransformDomainWarnings("y", bindings, yTransform, warnings, transformDiagnostics);
  const binRanges = computePanelBinRanges(bindings, primaryFiltered, faceted, freeX);
  for (let p = 0; p < facetPanels.length; p++) {
    for (let index = 0; index < bindings.length; index++) {
      const ctx = layerContexts[index]!;
      const slice = sliceLayerForPanel({
        filteredTable: ctx.filteredTable,
        filteredToSource: ctx.filteredToSource,
        sourceId: ctx.sourceId,
        registry,
        panel: facetPanels[p]!,
        facetFields,
        faceted,
      });
      const frame = buildFrame(
        bindings[index]!,
        slice.table,
        warnings,
        advisories,
        binRanges[index],
      );
      applyPosition(frame, advisories, slice.table);
      // Pre-stat input rows and post-stat mark rows share the layer's global
      // source-row namespace (filter + multi-table registry).
      frame.inputSourceRows = slice.globalSourceRows;
      // Map panel-local indices → global multi-table source rows.
      remapToGlobalSourceRows(frame.rowIndex, slice.globalSourceRows);
      // Boxplot outlier rows carry separate source indices.
      if (frame.box !== null) {
        remapToGlobalSourceRows(frame.box.outlierRow, slice.globalSourceRows);
      }
      assertRibbonBounds(frame);
      panelFrames[p]!.push(frame);
    }
  }
  warnEmptyLayers(bindings, panelFrames, warnings);

  return {
    bindings,
    panelFrames,
    scaleDecisions: temporal.decisions,
    scaleDiagnostics: [...temporal.diagnostics, ...transformDiagnostics],
    xConversion: temporal.xConversion,
    yConversion: temporal.yConversion,
  };
}
