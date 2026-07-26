/**
 * y-channel { stat } columns each stat exposes (module-header contracts).
 */
export const STAT_Y_COLUMNS: Record<string, readonly string[]> = {
  identity: [],
  unique: [],
  manual: [],
  count: ["count"],
  bin: ["count", "density", "ncount", "ndensity"],
  density: ["density", "count", "scaled", "ndensity"],
  smooth: [],
  boxplot: [],
  summary: [],
  // y/ymin/ymax are field-mapped measure outputs (not {stat} y columns).
  summary_bin: [],
};
