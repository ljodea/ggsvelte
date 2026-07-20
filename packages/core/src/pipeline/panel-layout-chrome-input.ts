/**
 * resolvePanelLayoutChrome input contract.
 */
import type { PortableSpec, TemporalKind } from "@ggsvelte/spec";

import type { LegendInput, LegendOrder } from "../legend.js";
import type { PositionScale } from "../scales/train.js";
import type { ThemeTokens } from "../theme.js";

import type { LayerFrame, PipelineWarning, RunOptions } from "./types.js";

export interface PanelLayoutChromeInput {
  flip: boolean;
  freeX: boolean;
  freeY: boolean;
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  allFrames: readonly LayerFrame[];
  labs: NonNullable<PortableSpec["labs"]>;
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  xTemporalKind: TemporalKind | null;
  yTemporalKind: TemporalKind | null;
  colorLegend: LegendInput | null;
  fillLegend: LegendInput | null;
  legendOrder: LegendOrder;
  theme: ThemeTokens;
  options: Pick<RunOptions, "width" | "height" | "measureText">;
  warnings: PipelineWarning[];
}
