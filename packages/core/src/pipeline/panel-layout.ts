/**
 * Two-pass panel layout: facet grids and single-panel plots, including
 * axis-title/legend chrome and free-scale edge axes.
 */
import type { PortableSpec, TemporalKind } from "@ggsvelte/spec";

import {
  assertLegendBlockFitsPlacedArea,
  LegendLayoutError,
  type LegendInput,
  type LegendOrder,
} from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import type { FacetPanelDef } from "./facets.js";
import { LEGEND_EDGE_PAD } from "./layout-helpers.js";
import type { AxisGuideAppearance } from "./guide-config.js";
import { resolvePanelLayoutChrome } from "./panel-layout-chrome.js";
import { buildPanelPlacements } from "./panel-layout-placements.js";
import { panelLayoutResultFromChrome } from "./panel-layout-result.js";
import type { PanelLayoutResult } from "./panel-layout-types.js";
import { PipelineError, type LayerFrame, type PipelineWarning, type RunOptions } from "./types.js";

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
  hGuide: AxisGuideAppearance;
  vGuide: AxisGuideAppearance;
  labs: NonNullable<PortableSpec["labs"]>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  xTemporalKind: TemporalKind | null;
  yTemporalKind: TemporalKind | null;
  legendInputs: readonly LegendInput[];
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  layoutAxisTitleSize: number;
  layoutAxisTextSize: number;
  options: Pick<RunOptions, "width" | "height" | "measureText">;
  warnings: PipelineWarning[];
}): PanelLayoutResult {
  const { faceted, nrow, ncol, facetPanels, options } = input;

  const chrome = resolvePanelLayoutChrome(input);
  if (chrome.legendBlock.autoMovedBottom) {
    input.warnings.push({
      code: "guide-auto-bottom",
      message:
        "Auto-positioned guides moved below the panel to preserve at least 320 px of readable width.",
    });
  }
  const placements = buildPanelPlacements({
    faceted,
    nrow,
    ncol,
    facetPanels,
    chrome,
    axis: { x: input.hGuide, y: input.vGuide },
    options,
  });
  try {
    assertLegendBlockFitsPlacedArea({
      block: chrome.legendBlock,
      inputs: input.legendInputs,
      viewportHeight: options.height,
      rightTop: Math.min(...placements.map((placement) => placement.y)),
      bottomInset: chrome.bottomBand + LEGEND_EDGE_PAD,
    });
  } catch (error) {
    if (!(error instanceof LegendLayoutError)) throw error;
    throw new PipelineError(
      "guide-layout-overflow",
      `/guides/${error.scale}`,
      `${error.message} ${error.recovery}`,
    );
  }

  return panelLayoutResultFromChrome(chrome, placements);
}
