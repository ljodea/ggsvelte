/**
 * Two-pass panel layout: facet grids and single-panel plots, including
 * axis-title/legend chrome and free-scale edge axes.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { LegendInput, LegendOrder } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import type { FacetPanelDef } from "./facets.js";
import { resolvePanelLayoutChrome } from "./panel-layout-chrome.js";
import { buildPanelPlacements } from "./panel-layout-placements.js";
import { panelLayoutResultFromChrome } from "./panel-layout-result.js";
import type { PanelLayoutResult } from "./panel-layout-types.js";
import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export type { PanelPlacement, PanelLayoutResult } from "./panel-layout-types.js";

export function computePanelLayout(input: {
  flip: boolean;
  faceted: boolean;
  freeX: boolean;
  freeY: boolean;
  nrow: number;
  ncol: number;
  facetPanels: readonly FacetPanelDef[];
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  allFrames: readonly LayerFrame[];
  labs: NonNullable<PortableSpec["labs"]>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  colorLegend: LegendInput | null;
  fillLegend: LegendInput | null;
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  options: Pick<RunOptions, "width" | "height" | "measureText">;
  warnings: PipelineWarning[];
}): PanelLayoutResult {
  const { faceted, nrow, ncol, facetPanels, options } = input;

  const chrome = resolvePanelLayoutChrome(input);
  const placements = buildPanelPlacements({
    faceted,
    nrow,
    ncol,
    facetPanels,
    chrome,
    options,
  });

  return panelLayoutResultFromChrome(chrome, placements);
}
