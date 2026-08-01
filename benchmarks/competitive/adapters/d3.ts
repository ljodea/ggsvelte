/**
 * Raw D3 competitive mounts (SVG). Baseline for "hand-rolled" cost.
 */
import { extent, max, rollup } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale";
import { select } from "d3-selection";
import { area as d3Area, line as d3Line, stack as d3Stack } from "d3-shape";

import {
  COLORS,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  type BarsColumns,
  type ScatterColumns,
  type ScenarioId,
  type SeriesColumns,
} from "../scenarios";

const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };

function chartRoot(root: HTMLElement) {
  root.replaceChildren();
  const iw = PLOT_WIDTH - MARGIN.left - MARGIN.right;
  const ih = PLOT_HEIGHT - MARGIN.top - MARGIN.bottom;
  const svg = select(root).append("svg").attr("width", PLOT_WIDTH).attr("height", PLOT_HEIGHT);
  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
  return { g, iw, ih };
}

export function mountD3(
  scenario: ScenarioId,
  data: ScatterColumns | SeriesColumns | BarsColumns,
  root: HTMLElement,
): { markHint: number } {
  switch (scenario) {
    case "scatter-color":
      return mountScatter(data as ScatterColumns, root);
    case "line-multiseries":
      return mountLine(data as SeriesColumns, root, false);
    case "area-multiseries":
      return mountLine(data as SeriesColumns, root, true);
    case "bars-stacked":
      return mountBars(data as BarsColumns, root);
  }
}

function mountScatter(data: ScatterColumns, root: HTMLElement) {
  const { g, iw, ih } = chartRoot(root);
  const rows = data.x.map((x, i) => ({ x, y: data.y[i]!, cls: data.cls[i]! }));
  const x = scaleLinear()
    .domain(extent(rows, (d) => d.x) as [number, number])
    .nice()
    .range([0, iw]);
  const y = scaleLinear()
    .domain(extent(rows, (d) => d.y) as [number, number])
    .nice()
    .range([ih, 0]);
  const color = scaleOrdinal<string, string>()
    .domain(["series-0", "series-1", "series-2", "series-3", "series-4"])
    .range([...COLORS]);
  g.append("g").attr("transform", `translate(0,${ih})`).call(axisBottom(x));
  g.append("g").call(axisLeft(y));
  g.selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("cx", (d) => x(d.x))
    .attr("cy", (d) => y(d.y))
    .attr("r", 1.5)
    .attr("fill", (d) => color(d.cls))
    .attr("fill-opacity", 0.7);
  return { markHint: rows.length };
}

function mountLine(data: SeriesColumns, root: HTMLElement, filled: boolean) {
  const { g, iw, ih } = chartRoot(root);
  const seriesNames = [...new Set(data.series)];
  const x = scaleLinear()
    .domain(extent(data.x) as [number, number])
    .range([0, iw]);
  const y = scaleLinear()
    .domain(extent(data.y) as [number, number])
    .nice()
    .range([ih, 0]);
  const color = scaleOrdinal<string, string>()
    .domain(seriesNames)
    .range([...COLORS]);
  g.append("g").attr("transform", `translate(0,${ih})`).call(axisBottom(x).ticks(6));
  g.append("g").call(axisLeft(y));
  const bySeries = rollup(
    data.x.map((xv, i) => ({ x: xv, y: data.y[i]!, series: data.series[i]! })),
    (v) => v,
    (d) => d.series,
  );
  const lineGen = d3Line<{ x: number; y: number }>()
    .x((d) => x(d.x))
    .y((d) => y(d.y));
  const areaGen = d3Area<{ x: number; y: number }>()
    .x((d) => x(d.x))
    .y0(ih)
    .y1((d) => y(d.y));
  for (const [name, pts] of bySeries) {
    const sorted = pts.toSorted((a, b) => a.x - b.x);
    if (filled) {
      g.append("path")
        .attr("d", areaGen(sorted))
        .attr("fill", color(name))
        .attr("fill-opacity", 0.35)
        .attr("stroke", "none");
    }
    g.append("path")
      .attr("d", lineGen(sorted))
      .attr("fill", "none")
      .attr("stroke", color(name))
      .attr("stroke-width", 1.5);
  }
  return { markHint: seriesNames.length * (filled ? 2 : 1) };
}

function mountBars(data: BarsColumns, root: HTMLElement) {
  const { g, iw, ih } = chartRoot(root);
  const categories = [...new Set(data.category)];
  const stacks = [...new Set(data.stack)];
  const wide = categories.map((cat) => {
    const row: Record<string, string | number> = { category: cat };
    for (let i = 0; i < data.category.length; i++) {
      if (data.category[i] === cat) row[data.stack[i]!] = data.value[i]!;
    }
    return row;
  });
  const stackGen = d3Stack<Record<string, string | number>>().keys(stacks);
  const series = stackGen(wide);
  const x = scaleBand().domain(categories).range([0, iw]).padding(0.15);
  const y = scaleLinear()
    .domain([0, max(series, (s) => max(s, (d) => d[1])) ?? 1])
    .nice()
    .range([ih, 0]);
  const color = scaleOrdinal<string, string>()
    .domain(stacks)
    .range([...COLORS]);
  g.append("g").attr("transform", `translate(0,${ih})`).call(axisBottom(x));
  g.append("g").call(axisLeft(y));
  for (const layer of series) {
    g.selectAll(`rect.${layer.key}`)
      .data(layer)
      .join("rect")
      .attr("x", (d) => x(String(d.data["category"])) ?? 0)
      .attr("y", (d) => y(d[1]))
      .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])))
      .attr("width", x.bandwidth())
      .attr("fill", color(layer.key));
  }
  return { markHint: data.category.length };
}
