/**
 * Positional scale training: linear / log / time (continuous, config-aware)
 * and band (discrete), plus the value-stable categorical color scale built on
 * scales/state.ts.
 *
 * Hand-rolled mapping math (no d3-scale — decision records 0007/0008).
 *
 * Modules:
 *  - train-types.ts — ContinuousScale / BandScale / ColorScale
 *  - train-continuous.ts — nice/extent + trainContinuous
 *  - train-band.ts — bandKey + trainBand
 *  - train-color.ts — trainColor
 *
 * This file is the stable public re-export path (package index, palette identity).
 */

// Re-export for callers that import ScaleConfigError from ./train.js.
export { ScaleConfigError } from "./scale-error.js";

// Stable public path: re-export palettes so index/editions/tests keep
// importing from ./scales/train.js (same ES binding for identity === checks).
export {
  CATEGORICAL_PALETTE_10,
  CATEGORICAL_SCHEMES,
  COLORBLIND_PALETTE,
  FLEXOKI_PALETTE,
  IPSUM_PALETTE,
  TABLEAU10_PALETTE,
} from "./categorical-palettes.js";

export type { BandScale, ColorScale, ContinuousScale, PositionScale } from "./train-types.js";

export type { ContinuousConfig, ContinuousTraining } from "./train-continuous.js";
export {
  finiteExtent,
  niceLinearDomain,
  trainContinuous,
  trainLinear,
} from "./train-continuous.js";

export type { BandConfig } from "./train-band.js";
export { bandKey, trainBand } from "./train-band.js";

export type { OrdinalColorConfig } from "./train-color.js";
export { trainColor } from "./train-color.js";
