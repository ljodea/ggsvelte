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
  CANVA_PALETTE,
  CALC_PALETTE,
  EXCEL_FILL_PALETTE,
  EXCEL_NEW_PALETTE,
  EXCEL_PALETTE,
  CATEGORICAL_PALETTE_10,
  CATEGORICAL_SCHEMES,
  COLORBLIND_PALETTE,
  ECONOMIST_PALETTE,
  FEW_DARK_PALETTE,
  FEW_LIGHT_PALETTE,
  FEW_PALETTE,
  FIVETHIRTYEIGHT_PALETTE,
  FLEXOKI_PALETTE,
  GDOCS_PALETTE,
  HC_DARK_PALETTE,
  HC_PALETTE,
  IPSUM_PALETTE,
  PANDER_PALETTE,
  PTOL_PALETTE,
  SOLARIZED_PALETTE,
  STATA_MONO_PALETTE,
  STATA_PALETTE,
  STATA_S1COLOR_PALETTE,
  STATA_S1RCOLOR_PALETTE,
  TABLEAU10_PALETTE,
  TABLEAU20_PALETTE,
  TABLEAU_COLORBLIND_PALETTE,
  TABLEAU_GREEN_ORANGE_TEAL_PALETTE,
  TABLEAU_HUE_CIRCLE_PALETTE,
  TABLEAU_JEWEL_BRIGHT_PALETTE,
  TABLEAU_MILLER_STONE_PALETTE,
  TABLEAU_NURIEL_STONE_PALETTE,
  TABLEAU_PURPLE_PINK_GRAY_PALETTE,
  TABLEAU_RED_BLUE_BROWN_PALETTE,
  TABLEAU_SEATTLE_GRAYS_PALETTE,
  TABLEAU_SUMMER_PALETTE,
  TABLEAU_SUPERFISHEL_STONE_PALETTE,
  TABLEAU_WINTER_PALETTE,
  WSJ_BLACK_GREEN_PALETTE,
  WSJ_DEM_REP_PALETTE,
  WSJ_PALETTE,
  WSJ_RED_GREEN_PALETTE,
  WSJ_RGBY_PALETTE,
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
