/**
 * Boxplot body batch pieces: hinge rects, whiskers, and median segments.
 * Implementation lives in geometry-boxplot-body-rects / -segments.
 */
export { makeBoxplotRectsBatch } from "./geometry-boxplot-body-rects.js";
export {
  BOX_MEDIAN_FATTEN,
  makeBoxplotWhiskerAndMedianBatches,
} from "./geometry-boxplot-body-segments.js";
