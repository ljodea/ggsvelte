/**
 * TanStack Charts Svelte server render, scatter-color-1k: Svelte 5 server
 * renderer over the same fixture the browser harness mounts. TanStack
 * documents complete SVG SSR for the Svelte adapter.
 */
import { render } from "svelte/server";

import ScatterChart from "../components/tanstack-svelte/ScatterChart.svelte";
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
