/**
 * Layout/scene assembly helpers used by runPipeline: domain projection,
 * tick formatters, margin max, and warning/advisory dedupe.
 */
export {
  AXIS_TITLE_BAND,
  CAPTION_BAND,
  LEGEND_EDGE_PAD,
  LEGEND_GAP,
  SUBTITLE_BAND,
  TITLE_BAND,
} from "./layout-constants.js";
export {
  axisTicks,
  layoutDomain,
  makeAxisFormatter,
  makeAxisValueFormatter,
} from "./layout-formatters.js";
export {
  dedupeAdvisories,
  dedupeWarnings,
  elementwiseMaxMargins,
  scaleDomainSnapshot,
} from "./layout-dedupe.js";
