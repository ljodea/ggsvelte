/**
 * Panel layout chrome: labs, axis titles (with coord flip), formatters, legends.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { LegendInput, LegendOrder } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import { resolvePanelLayoutDisplay } from "./panel-layout-chrome-display.js";
import { resolvePanelLayoutLabs } from "./panel-layout-chrome-labs.js";
import { resolvePanelLayoutLegends } from "./panel-layout-chrome-legends.js";
import type { PanelLayoutChrome } from "./panel-layout-chrome-types.js";
import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export type { PanelLayoutChrome } from "./panel-layout-chrome-types.js";

export function resolvePanelLayoutChrome(input: {
  flip: boolean;
  freeX: boolean;
  freeY: boolean;
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
}): PanelLayoutChrome {
  const labsChrome = resolvePanelLayoutLabs({
    allFrames: input.allFrames,
    labs: input.labs,
    theme: input.theme,
    height: input.options.height,
  });
  const display = resolvePanelLayoutDisplay({
    flip: input.flip,
    freeX: input.freeX,
    freeY: input.freeY,
    panelScales: input.panelScales,
    scalesConfig: input.scalesConfig,
    xScale: input.xScale,
    yScale: input.yScale,
    xTitle: labsChrome.xTitle,
    yTitle: labsChrome.yTitle,
    warnings: input.warnings,
  });
  const legends = resolvePanelLayoutLegends({
    colorLegend: input.colorLegend,
    fillLegend: input.fillLegend,
    legendOrder: input.legendOrder,
    theme: input.theme,
    options: input.options,
  });

  return {
    ...labsChrome,
    ...display,
    ...legends,
  };
}
