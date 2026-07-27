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
  density_2d_filled: [],
  // stackpos only — count is not a valid y (would collapse the stack; #803)
  bindot: ["stackpos"],
  smooth: [],
  boxplot: [],
  summary: [],
  // y is a required *input* to stat_sum — do not publish n/prop on y.
  sum: [],
  // y/ymin/ymax are field-mapped measure outputs (not {stat} y columns).
  summary_bin: [],
  // Contour writes x/y as frame coordinates; after_stat level is not a y column.
  contour: [],
};

/**
 * color/fill `{ stat }` columns each stat exposes. Only the density_2d frame
 * builder resolves an after_stat column into colour values
 * (`frame-stats-density-2d.ts`); every other frame builds colour from the
 * mapped field alone, so an `{ stat }` mapping there is dropped (#915).
 * Stats absent from this map publish nothing for colour.
 */
export const STAT_COLOR_COLUMNS: Record<string, readonly string[]> = {
  density_2d: ["level", "density"],
  density_2d_filled: ["level", "density"],
};
