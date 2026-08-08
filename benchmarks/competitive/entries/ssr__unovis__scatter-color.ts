/**
 * Unovis server render, scatter-color-1k: Svelte 5 server renderer over the
 * same fixture the browser harness mounts. Unovis paints SVG from onMount
 * (client-only), so the expected server body is an empty shell — recorded
 * as ssrCapable:false by measure-ssr, never a 0-bar "win".
 */
import { render } from "svelte/server";

import ScatterChart from "../components/unovis/ScatterChart.svelte";
import { makeScatter, PLOT_HEIGHT, PLOT_WIDTH } from "../scenarios";

const cols = makeScatter(1000);
const rows = cols.x.map((x, i) => ({ x, y: cols.y[i]!, cls: cols.cls[i]! }));

export function renderOnce(): { bytes: number; marks: number; head: string } {
  const { body } = render(ScatterChart, {
    props: { rows, width: PLOT_WIDTH, height: PLOT_HEIGHT },
  });
  const marks = (body.match(/<circle[\s>]/g) ?? []).length;
  return { bytes: body.length, marks, head: body.slice(0, 300) };
}
