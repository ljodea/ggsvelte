/**
 * Single-panel margin reserves for axis titles and legend width.
 */
import type { Margins } from "../layout/layout.js";

import { LEGEND_EDGE_PAD, LEGEND_GAP } from "./layout-helpers.js";

export function singlePanelMarginReserve(
  hTitle: string,
  vTitle: string,
  axisTitleBand: number,
  legendWidth: number,
): Partial<Margins> {
  return {
    ...(hTitle !== "" && { bottom: axisTitleBand }),
    ...(vTitle !== "" && { left: axisTitleBand }),
    ...(legendWidth > 0 && { right: legendWidth + LEGEND_GAP + LEGEND_EDGE_PAD }),
  };
}
