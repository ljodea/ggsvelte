/**
 * Build RenderModel.scales and axisFormatters from trained state.
 */
import type { TickFormatter } from "../layout/layout.js";
import type { ScaleState } from "../scales/state.js";
import type { PositionScale } from "../scales/train.js";

import { makeAxisValueFormatter } from "./layout-helpers.js";
import type { RenderModel, ResolvedColorScale } from "./types.js";

export function buildRenderModelScaleState(
  colorState: ScaleState | null,
  fillState: ScaleState | null,
): Record<string, ScaleState> {
  const state: Record<string, ScaleState> = {};
  if (colorState !== null) state["color"] = colorState;
  if (fillState !== null) state["fill"] = fillState;
  return state;
}

export function buildRenderModelScales(input: {
  xScale: PositionScale;
  yScale: PositionScale;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorState: ScaleState | null;
  fillState: ScaleState | null;
}): RenderModel["scales"] {
  return {
    x: input.xScale,
    y: input.yScale,
    color: input.color,
    fill: input.fill,
    panels: input.panelScales,
    state: buildRenderModelScaleState(input.colorState, input.fillState),
  };
}

export function buildRenderModelAxisFormatters(
  xScale: PositionScale,
  yScale: PositionScale,
  formatX: TickFormatter | undefined,
  formatY: TickFormatter | undefined,
): RenderModel["axisFormatters"] {
  return Object.freeze({
    x: makeAxisValueFormatter(xScale, formatX),
    y: makeAxisValueFormatter(yScale, formatY),
  });
}
