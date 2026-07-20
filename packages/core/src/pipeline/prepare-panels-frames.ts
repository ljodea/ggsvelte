/**
 * Build per-panel LayerFrames: bind layers, stats, position, remap source rows.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { bindLayer } from "./bind.js";
import type { FacetPanelDef } from "./facets.js";
import { buildFrame, remapSourceRows } from "./frame.js";
import { applyPosition } from "./position.js";
import { computePanelBinRanges } from "./prepare-panels-bin-ranges.js";
import { warnEmptyLayers } from "./prepare-panels-empty-layers.js";
import type { PositionConversionContext } from "./temporal-position.js";
import { preflightTemporalBindings } from "./temporal-preflight.js";
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
    binding.color.forcedDiscrete = normalized.scales?.color?.type === "ordinal";
    binding.fill.forcedDiscrete = normalized.scales?.fill?.type === "ordinal";
    bindings.push(binding);
  }
  const temporal = preflightTemporalBindings({
    table: sourceTable,
    bindings,
    warnings,
    advisories,
    conversions,
  });
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
    scaleDiagnostics: temporal.diagnostics,
    xConversion: temporal.xConversion,
    yConversion: temporal.yConversion,
  };
}
