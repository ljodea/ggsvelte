/**
 * Shared geometry primitives: panel Frame, position mapping, grouping buckets,
 * and common mark defaults. Facade re-exports keep import paths stable.
 */
export {
  DEFAULT_BAR_WIDTH,
  DEFAULT_BOXPLOT_WIDTH,
  DEFAULT_LINEWIDTH,
  DEFAULT_POINT_SIZE,
  DEFAULT_RULE_LINEWIDTH,
  DEFAULT_TEXT_SIZE,
  MAX_BOXPLOT_PANEL_FRAC,
  positionOf,
  removedWarning,
  type Frame,
} from "./geometry-shared-position.js";
export { bucketByGroup, sortGroupRowsByX } from "./geometry-shared-bucket.js";
