/**
 * The two corners of the frame Halley's life table is drawn in: age 1 to 84,
 * survivors 0 to 1,000 out of the cohort he started with. Nothing else - the
 * rows exist to fix the panel, not to be seen.
 *
 * The extents are those of examples/area/basic, which plots Halley's table
 * itself (Edmond Halley, "An Estimate of the Degrees of the Mortality of
 * Mankind", 1693; HistData::HalleyLifeTable, see NOTICE). Pinning a frame this
 * way is how a panel keeps the same scale as a chart it sits beside, or holds
 * its shape before the series it will carry has arrived.
 */
export const halleyFrame: { age: number; survivors: number }[] = [
  { age: 1, survivors: 0 },
  { age: 84, survivors: 1000 },
];
