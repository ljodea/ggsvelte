/**
 * Facet strip band measurement for layout reservation.
 *
 * Left/right strips rotate labels 90° at render, so the measured advance
 * width becomes the *vertical* extent. Callers cap that advance to the panel
 * height (see `capSideStripLabel`) so multi-row layouts cannot paint into
 * neighboring panels (#611).
 */
import type { TextMeasurer } from "../layout/measure.js";
import { truncateToFit } from "../layout/truncate.js";
import { STRIP_BAND } from "../scene.js";

import type { FacetPanelDef, FacetStripConfig } from "./facets-types.js";

/** Horizontal pad around left/right strip labels (px). */
const STRIP_SIDE_PAD = 8;

/**
 * Reserved strip band size in px:
 * - top/bottom → fixed STRIP_BAND height
 * - left/right → max label width + pad (at least STRIP_BAND), optionally
 *   capped by `sideMaxAdvance` when panel height is already known
 * - show false or unfaceted → 0
 */
export function measureFacetStripBand(input: {
  faceted: boolean;
  strip: FacetStripConfig;
  panels: readonly FacetPanelDef[];
  measurer: TextMeasurer;
  stripSize: number;
  /**
   * Vertical budget for rotated side-strip labels (panel height). When set,
   * band width never exceeds this advance (+ pad), matching capped labels.
   */
  sideMaxAdvance?: number;
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
  if (input.sideMaxAdvance !== undefined) {
    maxW = Math.min(maxW, Math.max(0, input.sideMaxAdvance));
  }
  return Math.max(STRIP_BAND, Math.ceil(maxW) + STRIP_SIDE_PAD);
}

/**
 * Cap a left/right strip label so its advance width (vertical extent after
 * 90° rotation) fits inside the panel height. Ellipsis when shortened.
 */
export function capSideStripLabel(
  label: string,
  maxAdvancePx: number,
  measurer: TextMeasurer,
  stripSize: number,
  ellipsis = "…",
): string {
  if (label === "" || !(maxAdvancePx > 0)) return label;
  return truncateToFit(label, maxAdvancePx, measurer, stripSize, ellipsis);
}

export function isVerticalStrip(position: FacetStripConfig["position"]): boolean {
  return position === "top" || position === "bottom";
}

export function isSideStrip(position: FacetStripConfig["position"]): boolean {
  return position === "left" || position === "right";
}
