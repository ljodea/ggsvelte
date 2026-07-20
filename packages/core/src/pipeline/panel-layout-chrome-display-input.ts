/**
 * Input for coord-flip-aware panel layout display resolution.
 */
import type { PortableSpec, TemporalKind } from "@ggsvelte/spec";

import type { PositionScale } from "../scales/train.js";

import type { PipelineWarning } from "./types.js";

export interface PanelLayoutDisplayInput {
  flip: boolean;
  freeX: boolean;
  freeY: boolean;
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  xTemporalKind: TemporalKind | null;
  yTemporalKind: TemporalKind | null;
  xTitle: string;
  yTitle: string;
  warnings: PipelineWarning[];
}
