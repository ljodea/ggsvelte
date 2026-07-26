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
  // density_2d writes isoline x/y; level/density are after_stat, not y columns.
  density_2d: [],
  smooth: [],
  boxplot: [],
  summary: [],
  // y/ymin/ymax are field-mapped measure outputs (not {stat} y columns).
  summary_bin: [],
  // Contour writes x/y as frame coordinates; after_stat level is not a y column.
  contour: [],
};
