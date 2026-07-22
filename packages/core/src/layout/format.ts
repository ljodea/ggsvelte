/**
 * Label format strings (the `scales.*.labels` surface).
 *
 * Implementation is split by domain:
 * - format-time.ts — strftime-style UTC patterns
 * - format-temporal-labels.ts — dateLabels grammar + tick sequences
 * - format-number.ts — numeric d3-format subset
 *
 * This module re-exports the public surface for a stable import path.
 */
export { formatTime } from "./format-time.js";
export {
  compileTemporalLabelFormat,
  formatTemporalTickSequence,
} from "./format-temporal-labels.js";
export type { TemporalLabelFormatOptions, TemporalTickLabel } from "./format-temporal-labels.js";
export { numberFormatter } from "./format-number.js";
export type { NumberFormatter } from "./format-number.js";
