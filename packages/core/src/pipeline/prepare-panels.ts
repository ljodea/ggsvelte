/**
 * Bind data, facet-partition, and build per-panel LayerFrames (stat + position).
 */
import type { PortableSpec } from "@ggsvelte/spec";

import { finiteExtent } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { bindData, bindLayer } from "./bind.js";
import type { FacetLayout, FacetPanelDef } from "./facets.js";
import { resolveFacet, SINGLE_PANEL } from "./facets.js";
import { buildFrame, remapSourceRows } from "./frame.js";
import { applyPosition } from "./position.js";
import type { Advisory, LayerBinding, LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export interface PreparedPanels {
  table: ColumnTable;
  emptyData: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  facetPanels: FacetPanelDef[];
  bindings: LayerBinding[];
  panelFrames: LayerFrame[][];
}

export function preparePanels(
  normalized: PortableSpec,
  options: RunOptions,
  warnings: PipelineWarning[],
  advisories: Advisory[],
): PreparedPanels {
  const table = bindData(normalized, options);
  const emptyData = table.rowCount === 0;
  if (emptyData) {
    warnings.push({
      code: "empty-data",
      message: "The data has no rows; rendering the frame and axes as a placeholder.",
    });
  }

  const facetLayout: FacetLayout = emptyData
    ? SINGLE_PANEL(table)
    : resolveFacet(normalized.facet, table);
  const { faceted, nrow, ncol } = facetLayout;
  const facetPanels = facetLayout.panels;
  const freeX = faceted && facetLayout.freeX;
  const freeY = faceted && facetLayout.freeY;

  const bindings: LayerBinding[] = [];
  const panelFrames: LayerFrame[][] = facetPanels.map(() => []);
  if (!emptyData) {
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
  }

  return {
    table,
    emptyData,
    faceted,
    freeX,
    freeY,
    nrow,
    ncol,
    facetPanels,
    bindings,
    panelFrames,
  };
}
