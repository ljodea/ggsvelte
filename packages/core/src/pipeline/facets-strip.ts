/**
 * Facet strip band measurement for layout reservation.
 */
import { STRIP_BAND } from "../scene.js";
import type { TextMeasurer } from "../layout/measure.js";

import type { FacetPanelDef, FacetStripConfig } from "./facets-types.js";

/** Horizontal pad around left/right strip labels (px). */
const STRIP_SIDE_PAD = 8;

/**
 * Reserved strip band size in px:
 * - top/bottom → fixed STRIP_BAND height
 * - left/right → max label width + pad (at least STRIP_BAND)
 * - show false or unfaceted → 0
 */
export function measureFacetStripBand(input: {
  faceted: boolean;
  strip: FacetStripConfig;
  panels: readonly FacetPanelDef[];
  measurer: TextMeasurer;
  stripSize: number;
}): number {
  if (!input.faceted || !input.strip.show) return 0;
  if (input.strip.position === "top" || input.strip.position === "bottom") {
    return STRIP_BAND;
  }
  let maxW = 0;
  for (const panel of input.panels) {
    if (panel.label === "") continue;
    maxW = Math.max(maxW, input.measurer.measureWidth(panel.label, input.stripSize));
  }
  return Math.max(STRIP_BAND, Math.ceil(maxW) + STRIP_SIDE_PAD);
}

export function isVerticalStrip(position: FacetStripConfig["position"]): boolean {
  return position === "top" || position === "bottom";
}
