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
  ydensity: ["density", "count", "scaled", "violinwidth"],
  // density_2d writes isoline x/y; level/density are after_stat, not y columns.
  density_2d: [],
  density_2d_filled: [],
  // stackpos only — count is not a valid y (would collapse the stack; #803)
  bindot: ["stackpos"],
  smooth: [],
  boxplot: [],
  summary: [],
  function: ["y"],
  ecdf: ["ecdf"],
  // y/ymin/ymax are field-mapped measure outputs (not {stat} y columns).
  summary_bin: [],
  // Contour writes x/y as frame coordinates; after_stat level is not a y column.
  contour: [],
};

/**
 * color/fill `{ stat }` columns each stat exposes. Frame builders that resolve
 * after_stat colour: density_2d / density_2d_filled (`frame-stats-density-2d.ts`)
 * and bin_hex (`frame-stats-bin-hex.ts` fill + color). Every other frame builds
 * colour from the mapped field alone, so an `{ stat }` mapping there is dropped
 * (#915). Stats absent from this map publish nothing for colour.
 */
export const STAT_COLOR_COLUMNS: Record<string, readonly string[]> = {
  bin_2d: ["count", "density", "ncount", "ndensity"],
  density_2d: ["level", "density"],
  density_2d_filled: ["level", "density"],
  // bin_hex fill defaults to after_stat count (ggplot2 geom_hex; #800).
  bin_hex: ["count", "density", "ncount", "ndensity"],
};
