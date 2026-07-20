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

  const formatX = makeAxisFormatter("x", xScale, scalesConfig.x, warnings);
  const formatY = makeAxisFormatter("y", yScale, scalesConfig.y, warnings);
  const { hTitle, vTitle } = flipDisplayTitles(flip, xTitle, yTitle);
  const { formatH, formatV } = flipDisplayFormatters(flip, formatX, formatY);
  const convertedBreaks = (axis: "x" | "y"): number[] | undefined => {
    const config = scalesConfig[axis];
    let breaks: number[] | undefined;
    if (config?.breaks !== undefined) {
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
    displayScales: makeDisplayScalesFn(flip, panelScales),
  };
}
