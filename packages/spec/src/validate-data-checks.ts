/**
 * Tier-2 data-aware orchestrator — resolve evidence, walk layers, then scale/type
 * compatibility (style → position → color diagnostic order).
 *
 * Implementation:
 *  - validate-data-checks-layer.ts — geom/stat rules + field walk + channel collection
 *  - validate-data-checks-temporal.ts — shared temporalDecisionForField memoization
 *  - validate-data-checks-position.ts — pre-evidence temporal axis config + x/y scale types
 *  - validate-data-checks-color.ts — color/fill scale types + manual domain/range
 *  - validate-data-checks-style.ts — shape/linetype + size/linewidth/alpha scale types
 *
 * Style and color scale checks take the same per-use `evidenceForUse` path as
 * position (#609 / #844): multi-table layers that share a field name keep their
 * own type evidence. The last-wins union `fields` map remains a fallback only.
 *
 * Consumes a FieldEvidenceMap built by validate-data-evidence.ts (or builds one
 * when not pre-resolved).
 */
import type { SpecError } from "./errors.js";
import type { Aes, ChannelName } from "./schema.js";
import type { ValidateLimits, ValidateOptions } from "./validate-data.js";
import type { TemporalDecision } from "./temporal-column.js";
import {
  resolveFieldEvidence,
  resolveLayerFieldEvidence,
  type FieldEvidenceMap,
  type ResolveFieldEvidenceResult,
} from "./validate-data-evidence.js";
import { checkColorScaleDataCompatibility } from "./validate-data-checks-color.js";
import { collectLayerDataChecks, STAT_COLUMNS } from "./validate-data-checks-layer.js";
import {
  checkPositionScaleDataCompatibility,
  scaleRequestsTime,
  validateTemporalAxisConfiguration,
} from "./validate-data-checks-position.js";
import {
  checkFiniteStyleScaleDataCompatibility,
  checkNumericStyleScaleDataCompatibility,
} from "./validate-data-checks-style.js";

export { STAT_COLUMNS };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function dataChecks(
  spec: Record<string, unknown>,
  options: ValidateOptions,
  limits: ValidateLimits,
  /** Pre-resolved evidence from validate() so lint can share the same pass. */
  preResolved?: ResolveFieldEvidenceResult,
): SpecError[] {
  const errors: SpecError[] = [];
  // One cache per dataChecks call — shared by position, color, and style checkers.
  const temporalDecisionCache = new Map<string, TemporalDecision | null | undefined>();
  const scales = isRecord(spec["scales"]) ? spec["scales"] : undefined;

  // Pre-evidence: temporal axis configuration (errors even without data/profile).
  const temporalConfig = validateTemporalAxisConfiguration(scales);
  errors.push(...temporalConfig.errors);
  const { invalidTemporalAxes } = temporalConfig;

  // Prefer per-layer evidence when available (#589); fall back to plot-level
  // resolveFieldEvidence for preResolved/lint sharing and profile mode.
  const layerResolved = resolveLayerFieldEvidence(spec, options, limits);
  if (layerResolved.status === "errors") return [...errors, ...layerResolved.errors];

  const resolved = preResolved ?? resolveFieldEvidence(spec, options, limits);
  if (resolved.status === "errors") return [...errors, ...resolved.errors];
  if (resolved.status === "none" && layerResolved.status === "none") return errors;
  const plotFields: FieldEvidenceMap | null =
    layerResolved.status === "ok"
      ? layerResolved.plot
      : resolved.status === "ok"
        ? resolved.fields
        : null;

  const plotAes = isRecord(spec["aes"]) ? (spec["aes"] as Aes) : undefined;
  const layers = Array.isArray(spec["layers"]) ? (spec["layers"] as unknown[]) : [];
  const scaleRequestsTimeForChannel = (channel: ChannelName): boolean => {
    const axis =
      channel === "x" || channel === "xmin" || channel === "xmax" || channel === "xend"
        ? "x"
        : channel === "y" || channel === "ymin" || channel === "ymax" || channel === "yend"
          ? "y"
          : null;
    return axis !== null && scaleRequestsTime(scales, axis);
  };

  const layerMaps = layerResolved.status === "ok" ? layerResolved.layers : null;
  const walk = collectLayerDataChecks({
    layers,
    plotAes,
    plotFields,
    layerMaps,
    scaleRequestsTime: scaleRequestsTimeForChannel,
  });
  errors.push(...walk.errors);

  // --- scale/type compatibility (order preserved for diagnostics) ------------
  // Union layer evidence as a fallback for non-layer-scoped lookups. Position,
  // style, and color scale checks prefer per-layer evidence via evidenceForUse
  // so same field names on different tables stay independent (#609 / #844).
  const fields: FieldEvidenceMap = new Map(plotFields ?? undefined);
  if (layerResolved.status === "ok") {
    for (const layerMap of layerResolved.layers) {
      if (layerMap === null) continue;
      for (const [name, entry] of layerMap) fields.set(name, entry);
    }
  }
  if (fields.size === 0 && resolved.status === "ok") {
    for (const [name, entry] of resolved.fields) fields.set(name, entry);
  }
  const evidenceForUse = (use: { field: string; path: string }) => {
    const match = /^\/layers\/(\d+)\//.exec(use.path);
    if (match !== null && layerMaps !== null) {
      const layerMap = layerMaps[Number(match[1])];
      if (layerMap !== null && layerMap !== undefined) {
        const hit = layerMap.get(use.field);
        if (hit !== undefined) return hit;
      }
      // Layer with no override inherits plot evidence.
      if (plotFields !== null) {
        const hit = plotFields.get(use.field);
        if (hit !== undefined) return hit;
      }
    }
    return fields.get(use.field);
  };
  // Diagnostic order: finite style → numeric style → position → color.
  errors.push(
    ...checkFiniteStyleScaleDataCompatibility({
      scales,
      fields,
      evidenceForUse,
      finiteStyleFields: walk.finiteStyleFields,
    }),
    ...checkNumericStyleScaleDataCompatibility({
      scales,
      fields,
      evidenceForUse,
      numericStyleFields: walk.numericStyleFields,
      numericStyleScaledConstants: walk.numericStyleScaledConstants,
      temporalDecisionCache,
    }),
    ...checkPositionScaleDataCompatibility({
      scales,
      fields,
      evidenceForUse,
      axisFields: walk.axisFields,
      invalidTemporalAxes,
      temporalDecisionCache,
    }),
    ...checkColorScaleDataCompatibility({
      scales,
      fields,
      evidenceForUse,
      colorFields: walk.colorFields,
      colorScaledConstants: walk.colorScaledConstants,
      temporalDecisionCache,
    }),
  );

  return errors;
}
