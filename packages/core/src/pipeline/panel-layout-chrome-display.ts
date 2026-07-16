/**
 * Coord-flip-aware display titles, formatters, free scales, and panel scale view.
 */
import type { PortableSpec } from "@ggsvelte/spec";

import type { TickFormatter } from "../layout/layout.js";
import type { PositionScale } from "../scales/train.js";

import { makeAxisFormatter } from "./layout-helpers.js";
import type { PipelineWarning } from "./types.js";

export interface PanelLayoutDisplay {
  hTitle: string;
  vTitle: string;
  formatX: TickFormatter | undefined;
  formatY: TickFormatter | undefined;
  formatH: TickFormatter | undefined;
  formatV: TickFormatter | undefined;
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
  freeH: boolean;
  freeV: boolean;
  displayScales: (p: number) => { h: PositionScale; v: PositionScale };
}

export function resolvePanelLayoutDisplay(input: {
  flip: boolean;
  freeX: boolean;
  freeY: boolean;
  panelScales: readonly { x: PositionScale; y: PositionScale }[];
  scalesConfig: NonNullable<PortableSpec["scales"]>;
  xScale: PositionScale;
  yScale: PositionScale;
  xTitle: string;
  yTitle: string;
  warnings: PipelineWarning[];
}): PanelLayoutDisplay {
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

  const hTitle = flip ? yTitle : xTitle;
  const vTitle = flip ? xTitle : yTitle;
  const formatX = makeAxisFormatter("x", xScale, scalesConfig.x, warnings);
  const formatY = makeAxisFormatter("y", yScale, scalesConfig.y, warnings);
  const formatH = flip ? formatY : formatX;
  const formatV = flip ? formatX : formatY;
  const hBreaks = flip ? scalesConfig.y?.breaks : scalesConfig.x?.breaks;
  const vBreaks = flip ? scalesConfig.x?.breaks : scalesConfig.y?.breaks;
  const freeH = flip ? freeY : freeX;
  const freeV = flip ? freeX : freeY;
  const displayScales = (p: number): { h: PositionScale; v: PositionScale } => {
    const s = panelScales[p]!;
    return flip ? { h: s.y, v: s.x } : { h: s.x, v: s.y };
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
  };
}
