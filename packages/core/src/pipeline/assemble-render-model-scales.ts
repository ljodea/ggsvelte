/**
 * Build RenderModel.scales and axisFormatters from trained state.
 */
import type { TickFormatter } from "../layout/layout.js";
import type { ScaleState } from "../scales/state.js";
import type { ContinuousScale, PositionScale } from "../scales/train.js";

import { makeAxisValueFormatter } from "./layout-helpers.js";
import { positionValueToNumber, type PositionConversionContext } from "./temporal-position.js";
import type { RenderModel, ResolvedColorScale } from "./types.js";

export function buildRenderModelScaleState(
  colorState: ScaleState | null,
  fillState: ScaleState | null,
  styleStates: Readonly<Record<string, ScaleState | null>> = {},
): Record<string, ScaleState> {
  const state: Record<string, ScaleState> = {};
  if (colorState !== null) state["color"] = colorState;
  if (fillState !== null) state["fill"] = fillState;
  for (const [aesthetic, styleState] of Object.entries(styleStates)) {
    if (styleState !== null) state[aesthetic] = styleState;
  }
  return state;
}

export function buildRenderModelScales(input: {
  xScale: PositionScale;
  yScale: PositionScale;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  styles: Record<string, import("../scales/style.js").ResolvedStyleScale | null>;
  panelScales: { x: PositionScale; y: PositionScale }[];
  colorState: ScaleState | null;
  fillState: ScaleState | null;
  styleStates: Record<string, ScaleState | null>;
}): RenderModel["scales"] {
  return {
    x: input.xScale,
    y: input.yScale,
    color: input.color,
    fill: input.fill,
    size: input.styles["size"] ?? null,
    linewidth: input.styles["linewidth"] ?? null,
    alpha: input.styles["alpha"] ?? null,
    shape: input.styles["shape"] ?? null,
    linetype: input.styles["linetype"] ?? null,
    panels: input.panelScales,
    state: buildRenderModelScaleState(input.colorState, input.fillState, input.styleStates),
  };
}

function temporalAxisValue(
  scale: ContinuousScale,
  value: Parameters<ReturnType<typeof makeAxisValueFormatter>>[0],
  conversion: PositionConversionContext,
): number {
  const parsed = positionValueToNumber(value, conversion);
  if (typeof value !== "number" || !Number.isFinite(value)) return parsed;
  const min = Math.min(scale.domain[0], scale.domain[1]);
  const max = Math.max(scale.domain[0], scale.domain[1]);
  const semanticInDomain = value >= min && value <= max;
  const parsedInDomain = parsed >= min && parsed <= max;
  return semanticInDomain && !parsedInDomain ? value : parsed;
}

export function buildRenderModelAxisFormatters(
  xScale: PositionScale,
  yScale: PositionScale,
  formatX: TickFormatter | undefined,
  formatY: TickFormatter | undefined,
  xConversion: PositionConversionContext,
  yConversion: PositionConversionContext,
): RenderModel["axisFormatters"] {
  return Object.freeze({
    x: makeAxisValueFormatter(
      xScale,
      formatX,
      xScale.type === "time" ? (value) => temporalAxisValue(xScale, value, xConversion) : undefined,
    ),
    y: makeAxisValueFormatter(
      yScale,
      formatY,
      yScale.type === "time" ? (value) => temporalAxisValue(yScale, value, yConversion) : undefined,
    ),
  });
}
