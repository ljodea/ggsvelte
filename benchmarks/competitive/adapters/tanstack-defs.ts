/**
 * Shared TanStack Charts definitions for the Svelte and React hosts.
 *
 * Same grammar, two adapters: `@tanstack/charts/svelte` is the Svelte-peer
 * cell; `@tanstack/charts/react` is the generalist cell. Interaction and SVG
 * animation stay off so paint time is comparable to the other adapters.
 *
 * area-multiseries uses explicit y1/y2 so TanStack does not implicitly stack
 * (same fairness rule as SveltePlot / ggsvelte identity areas).
 */
import { areaY, barY, defineChart, dot, lineY, stack } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scaleOrdinal } from "@tanstack/charts/scales/ordinal";

import { COLORS } from "../scenarios";

export type ScatterRow = { x: number; y: number; cls: string };
export type SeriesRow = { x: number; y: number; series: string };
export type BarRow = { category: string; value: number; stack: string };

const BENCH_OPTIONS = {
  svgAnimation: false,
  pointer: false,
  keyboard: false,
  focus: false,
} as const;

function colorScale() {
  return scaleOrdinal<string, string>().range([...COLORS]);
}

export function defineScatter(rows: readonly ScatterRow[]) {
  return defineChart(
    {
      marks: [
        dot(rows, {
          x: "x",
          y: "y",
          color: "cls",
          r: 1.5,
          fillOpacity: 0.7,
        }),
      ],
      x: { scale: scaleLinear, grid: true },
      y: { scale: scaleLinear, grid: true },
      color: { scale: colorScale },
    },
    BENCH_OPTIONS,
  );
}

export function defineLine(rows: readonly SeriesRow[]) {
  return defineChart(
    {
      marks: [
        lineY(rows, {
          x: "x",
          y: "y",
          color: "series",
          strokeWidth: 1.5,
        }),
      ],
      x: { scale: scaleLinear, grid: true },
      y: { scale: scaleLinear, nice: true, grid: true },
      color: { scale: colorScale },
    },
    BENCH_OPTIONS,
  );
}

export function defineArea(rows: readonly SeriesRow[]) {
  return defineChart(
    {
      marks: [
        areaY(rows, {
          x: "x",
          y1: 0,
          y2: "y",
          color: "series",
          fillOpacity: 0.25,
        }),
      ],
      x: { scale: scaleLinear, grid: true },
      y: { scale: scaleLinear, nice: true, grid: true },
      color: { scale: colorScale },
    },
    BENCH_OPTIONS,
  );
}

export function defineBars(rows: readonly BarRow[]) {
  return defineChart(
    {
      marks: [
        barY(rows, {
          x: "category",
          y: "value",
          color: "stack",
          layout: stack(),
        }),
      ],
      x: { scale: () => scaleBand<string>().padding(0.1), grid: true },
      y: { scale: scaleLinear, nice: true, grid: true },
      color: { scale: colorScale },
    },
    BENCH_OPTIONS,
  );
}
