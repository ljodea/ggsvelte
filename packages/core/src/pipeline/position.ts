/**
 * Data-space position adjustments (stack/fill/dodge/jitter/nudge) applied
 * to LayerFrames after stats and before scale training — panel-local, like
 * ggplot2.
 */
import type { ColumnTable } from "../table.js";

import { applyBarLikePosition } from "./position-bar.js";
import { applyBoxplotPosition } from "./position-boxplot.js";
import { applyPointTextPosition } from "./position-jitter.js";
import type { Advisory, LayerFrame } from "./types.js";

export function applyPosition(frame: LayerFrame, advisories: Advisory[], table: ColumnTable): void {
  if (applyPointTextPosition(frame, advisories, table)) return;
  if (applyBoxplotPosition(frame)) return;
  applyBarLikePosition(frame);
}
