/**
 * Coord-flip-aware display titles, formatters, free scales, and panel scale view.
 */
import { makeAxisFormatter } from "./layout-helpers.js";
import { positionConversionContext, positionValuesToNumeric } from "./temporal-position.js";
import { PipelineError } from "./types.js";
import {
  flipDisplayBreaks,
  flipDisplayFormatters,
  flipDisplayFreeFlags,
  flipDisplayTitles,
  makeDisplayScalesFn,
} from "./panel-layout-chrome-display-flip.js";
import type { PanelLayoutDisplayInput } from "./panel-layout-chrome-display-input.js";
import type { PanelLayoutDisplay } from "./panel-layout-chrome-display-types.js";

export type { PanelLayoutDisplay } from "./panel-layout-chrome-display-types.js";
export type { PanelLayoutDisplayInput } from "./panel-layout-chrome-display-input.js";

export function resolvePanelLayoutDisplay(input: PanelLayoutDisplayInput): PanelLayoutDisplay {
  const {
    flip,
    freeX,
    freeY,
    panelScales,
    scalesConfig,
    xScale,
    yScale,
    xTitle,
    yTitle,
    warnings,
  } = input;

  const formatX = makeAxisFormatter("x", xScale, scalesConfig.x, warnings, input.xTemporalKind);
  const formatY = makeAxisFormatter("y", yScale, scalesConfig.y, warnings, input.yTemporalKind);
  const { hTitle, vTitle } = flipDisplayTitles(flip, xTitle, yTitle);
  const { formatH, formatV } = flipDisplayFormatters(flip, formatX, formatY);
  const convertedBreaks = (axis: "x" | "y"): (number | string)[] | undefined => {
    const config = scalesConfig[axis];
    let breaks: (number | string)[] | undefined;
    if (config?.breaks !== undefined) {
      const scale = axis === "x" ? xScale : yScale;
      if (scale.type === "band") return [...config.breaks];
      const converted = positionValuesToNumeric(
        config.breaks,
        positionConversionContext(config),
      ).values;
      if ([...converted].some((value) => !Number.isFinite(value))) {
        throw new PipelineError(
          "invalid-scale-breaks",
          `/scales/${axis}/breaks`,
          `One or more ${axis} breaks do not match the scale's numeric or temporal parser.`,
        );
      }
      breaks = [...converted];
    }
    return breaks;
  };
  const { hBreaks, vBreaks } = flipDisplayBreaks(flip, convertedBreaks("x"), convertedBreaks("y"));
  const { freeH, freeV } = flipDisplayFreeFlags(flip, freeX, freeY);
  const displayScales = makeDisplayScalesFn(flip, panelScales);
  const displayTemporal = (panelIndex: number) => {
    const xKind = input.xTemporalKind ?? scalesConfig.x?.temporalKind ?? null;
    const yKind = input.yTemporalKind ?? scalesConfig.y?.temporalKind ?? null;
    const x =
      xScale.type === "time" && xKind !== null
        ? {
            aesthetic: "x" as const,
            panelIndex,
            kind: xKind,
            config: scalesConfig.x ?? {},
            ...(scalesConfig.x?.breaks !== undefined && {
              sourceBreaks: scalesConfig.x.breaks,
            }),
          }
        : undefined;
    const y =
      yScale.type === "time" && yKind !== null
        ? {
            aesthetic: "y" as const,
            panelIndex,
            kind: yKind,
            config: scalesConfig.y ?? {},
            ...(scalesConfig.y?.breaks !== undefined && {
              sourceBreaks: scalesConfig.y.breaks,
            }),
          }
        : undefined;
    return flip
      ? { ...(y !== undefined && { h: y }), ...(x !== undefined && { v: x }) }
      : { ...(x !== undefined && { h: x }), ...(y !== undefined && { v: y }) };
  };
  const displayBand = (panelIndex: number) => {
    const x =
      xScale.type === "band"
        ? { aesthetic: "x" as const, panelIndex, config: scalesConfig.x ?? {} }
        : undefined;
    const y =
      yScale.type === "band"
        ? { aesthetic: "y" as const, panelIndex, config: scalesConfig.y ?? {} }
        : undefined;
    return flip
      ? { ...(y !== undefined && { h: y }), ...(x !== undefined && { v: x }) }
      : { ...(x !== undefined && { h: x }), ...(y !== undefined && { v: y }) };
  };

  return {
    hTitle,
    vTitle,
    formatX,
    formatY,
    formatH,
    formatV,
    hBreaks,
    vBreaks,
    freeH,
    freeV,
    displayScales,
    displayTemporal,
    displayBand,
  };
}
