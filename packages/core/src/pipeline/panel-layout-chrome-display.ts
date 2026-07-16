/**
 * Coord-flip-aware display titles, formatters, free scales, and panel scale view.
 */
import { makeAxisFormatter } from "./layout-helpers.js";
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
  const { hBreaks, vBreaks } = flipDisplayBreaks(
    flip,
    scalesConfig.x?.breaks,
    scalesConfig.y?.breaks,
  );
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
