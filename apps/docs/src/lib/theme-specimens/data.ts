/**
 * Docs-only re-exports of example corpora for the /themes showcase.
 * Never surface `$examples` paths in consumer-facing CopyCode snippets.
 */
export { languages } from "$examples/col/basic/data";
export { revenue } from "$examples/col/value-labels/data";
export { ridership } from "$examples/interaction/legend-filter/data";
export { longRunSeries } from "$examples/line/time-axis/data";
export { countries } from "$examples/point/log-scale/data";
export { grid } from "$examples/raster/grid/data";
export { cities } from "$examples/text/labels/data";

import { generation as rawGeneration } from "$examples/area/stacked/data";
import { attendees as rawAttendees } from "$examples/bar/dodged/data";
import { temperatures as rawTemperatures } from "$examples/line/multi-series/data";
import { penguins as rawPenguins } from "$examples/point/scatter-color/data";

/** Climate normals with stable row keys for legend focus / inspect. */
export const temperaturesKeyed = rawTemperatures.map((row) => ({
  ...row,
  id: `${row.city}-${String(row.month)}`,
}));

/** Generation mix with stable keys for legend focus. */
export const generation = rawGeneration.map((row) => ({
  ...row,
  id: `${row.source}-${String(row.year)}`,
}));

/** Conference attendees with stable keys for legend focus. */
export const attendees = rawAttendees.map((row, index) => ({
  ...row,
  id: `attendee-${String(index)}`,
}));

/** Penguins with stable keys for legend focus. */
export const penguins = rawPenguins.map((row, index) => ({
  ...row,
  id: `${row.species}-${String(index)}`,
}));
