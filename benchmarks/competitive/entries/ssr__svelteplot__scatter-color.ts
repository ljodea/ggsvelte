/**
 * SveltePlot server render, scatter-color-1k: Svelte 5 server renderer
 * (svelte/server render()) over the SAME component the browser harness
 * mounts. Rows are prebuilt once (like a real SvelteKit load()); each timed
 * render is rows -> SVG markup.
 */
import { render } from "svelte/server";

import ScatterChart from "../components/svelteplot/ScatterChart.svelte";
import { makeScatter, PLOT_HEIGHT, PLOT_WIDTH } from "../scenarios";

const cols = makeScatter(1000);
const rows = cols.x.map((x, i) => ({ x, y: cols.y[i]!, cls: cols.cls[i]! }));

export function renderOnce(): { bytes: number; marks: number } {
  const { body } = render(ScatterChart, {
    props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
  });
  const marks = (body.match(/<circle[\s>]/g) ?? []).length;
  return { bytes: body.length, marks, head: body.slice(0, 300) };
}
