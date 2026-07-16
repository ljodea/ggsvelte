/**
 * Coord-flip remapping for display titles, formatters, breaks, and free flags.
 */
import type { TickFormatter } from "../layout/layout.js";
import type { PositionScale } from "../scales/train.js";

export function flipDisplayTitles(
  flip: boolean,
  xTitle: string,
  yTitle: string,
): { hTitle: string; vTitle: string } {
  return flip ? { hTitle: yTitle, vTitle: xTitle } : { hTitle: xTitle, vTitle: yTitle };
}

export function flipDisplayFormatters(
  flip: boolean,
  formatX: TickFormatter | undefined,
  formatY: TickFormatter | undefined,
): { formatH: TickFormatter | undefined; formatV: TickFormatter | undefined } {
  return flip ? { formatH: formatY, formatV: formatX } : { formatH: formatX, formatV: formatY };
}

export function flipDisplayBreaks(
  flip: boolean,
  xBreaks: readonly (number | string)[] | undefined,
  yBreaks: readonly (number | string)[] | undefined,
): {
  hBreaks: readonly (number | string)[] | undefined;
  vBreaks: readonly (number | string)[] | undefined;
} {
  return flip ? { hBreaks: yBreaks, vBreaks: xBreaks } : { hBreaks: xBreaks, vBreaks: yBreaks };
}

export function flipDisplayFreeFlags(
  flip: boolean,
  freeX: boolean,
  freeY: boolean,
): { freeH: boolean; freeV: boolean } {
  return flip ? { freeH: freeY, freeV: freeX } : { freeH: freeX, freeV: freeY };
}

export function makeDisplayScalesFn(
  flip: boolean,
  panelScales: readonly { x: PositionScale; y: PositionScale }[],
): (p: number) => { h: PositionScale; v: PositionScale } {
  return (p: number) => {
    const s = panelScales[p]!;
    return flip ? { h: s.y, v: s.x } : { h: s.x, v: s.y };
  };
}
