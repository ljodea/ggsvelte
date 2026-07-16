/**
 * Build per-panel LayerFrames: bind layers, stats, position, remap source rows.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { finiteExtent } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { bindLayer } from "./bind.js";
import type { FacetPanelDef } from "./facets.js";
import { buildFrame, remapSourceRows } from "./frame.js";
import { applyPosition } from "./position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning } from "./types.js";

export function buildPanelFrames(input: {
  normalized: PortableSpec;
  table: ColumnTable;
  facetPanels: readonly FacetPanelDef[];
  faceted: boolean;
  freeX: boolean;
  warnings: PipelineWarning[];
  advisories: Advisory[];
}): { bindings: LayerBinding[]; panelFrames: LayerFrame[][] } {
  const { normalized, table, facetPanels, faceted, freeX, warnings, advisories } = input;

  const bindings: LayerBinding[] = [];
  const panelFrames: LayerFrame[][] = facetPanels.map(() => []);

  for (let index = 0; index < normalized.layers.length; index++) {
    bindings.push(bindLayer(normalized.layers[index]!, index, table, warnings));
  }
  // Shared bin break grids across panels when the x scale is fixed.
  const binRanges = bindings.map((binding) => {
    const stat = binding.layer.stat ?? "identity";
    if (stat !== "bin" || !faceted || freeX || binding.xField === null) return void 0;
    return finiteExtent([table.numeric(binding.xField)]) ?? void 0;
  });
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
  for (let index = 0; index < bindings.length; index++) {
    const allEmpty = panelFrames.every((frames) => frames[index]!.n === 0);
    if (allEmpty && bindings[index]!.ruleForm !== "annotation") {
      warnings.push({
        code: "empty-layer",
        message: `Layer ${index} (${bindings[index]!.layer.geom}) has no drawable rows after its stat; skipping it.`,
      });
    }
  }

  return { bindings, panelFrames };
}
