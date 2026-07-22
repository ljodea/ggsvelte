/**
 * Build per-panel LayerFrames: bind layers, stats, position, remap source rows.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { bindLayer } from "./bind.js";
import type { FacetPanelDef } from "./facets.js";
import { buildFrame, remapSourceRows } from "./frame.js";
import { applyPosition } from "./position.js";
import { resolveColumnTransform } from "./position-program.js";
import { assertInferredTemporalTransform } from "./scale-config-preflight.js";
import { computePanelBinRanges } from "./prepare-panels-bin-ranges.js";
import { resolveBinnedAxis } from "./resolve-binned-axis.js";
import { warnEmptyLayers } from "./prepare-panels-empty-layers.js";
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
  table: ColumnTable,
  transform: ColumnTransformConfig | undefined,
  warnings: PipelineWarning[],
  scaleDiagnostics: ScaleDiagnostic[],
): void {
  if (transform === undefined) return;
  const path = `/scales/${axis}`;
  const seen = new Set<string>();
  for (const binding of bindings) {
    const field = axis === "x" ? binding.xField : binding.yField;
    if (field === null || seen.has(field)) continue;
    seen.add(field);
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
  table: ColumnTable;
  sourceTable: ColumnTable;
  facetPanels: readonly FacetPanelDef[];
  faceted: boolean;
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
    table,
    sourceTable,
    facetPanels,
    faceted,
    freeX,
    warnings,
    advisories,
    conversions,
  } = input;

  const bindings: LayerBinding[] = [];
  const panelFrames: LayerFrame[][] = facetPanels.map(() => []);

  for (let index = 0; index < normalized.layers.length; index++) {
    const binding = bindLayer(normalized.layers[index]!, index, table, warnings, conversions);
    binding.color.forcedDiscrete = ["ordinal", "manual"].includes(
      normalized.scales?.color?.type ?? "",
    );
    binding.fill.forcedDiscrete = ["ordinal", "manual"].includes(
      normalized.scales?.fill?.type ?? "",
    );
    bindings.push(binding);
  }
  const temporal = preflightTemporalBindings({
    table: sourceTable,
    bindings,
    warnings,
    advisories,
    conversions,
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
  // type: "binned" boundaries (transformed space) resolved once from the
  // parent table, before any frame/stat reads them (pre-stat two-phase).
  const xBinning = resolveBinnedAxis(
    "x",
    normalized.scales?.x,
    bindings,
    table,
    temporal.xConversion,
    xTransform,
  );
  const yBinning = resolveBinnedAxis(
    "y",
    normalized.scales?.y,
    bindings,
    table,
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
  // drops, counted on the (filtered) full column before faceting. Emitted on
  // both the lean warning channel and the rich scaleDiagnostics channel.
  const transformDiagnostics: ScaleDiagnostic[] = [];
  emitTransformDomainWarnings("x", bindings, table, xTransform, warnings, transformDiagnostics);
  emitTransformDomainWarnings("y", bindings, table, yTransform, warnings, transformDiagnostics);
  const binRanges = computePanelBinRanges(bindings, table, faceted, freeX);
  for (let p = 0; p < facetPanels.length; p++) {
    const panelTable = facetPanels[p]!.table;
    for (let index = 0; index < bindings.length; index++) {
      const frame = buildFrame(
        bindings[index]!,
        panelTable,
        warnings,
        advisories,
        binRanges[index],
      );
      applyPosition(frame, advisories, panelTable);
      remapSourceRows(frame, facetPanels[p]!.sourceRows);
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
