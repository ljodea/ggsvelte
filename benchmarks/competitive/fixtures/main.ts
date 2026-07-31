/**
 * Browser harness API for Playwright:
 *   window.competitiveBench.mount(lib, n) -> { ms, markCount }
 *   window.competitiveBench.update(lib, n) -> { ms }
 *   window.competitiveBench.clear()
 */
import { select } from "d3-selection";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { extent } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";

import { renderToSVGString } from "@ggsvelte/core/render";
import { aes, gg } from "@ggsvelte/spec/portable";

type Row = { x: number; y: number; cls: string };

function makeRows(n: number): Row[] {
  const rows: Row[] = [];
  let a = (0xbadc0de ^ n) >>> 0;
  const rnd = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    rows.push({ x: rnd() * 100, y: rnd() * 100, cls: `series-${i % 5}` });
  }
  return rows;
}

function columnsFrom(rows: Row[]) {
  return {
    x: rows.map((r) => r.x),
    y: rows.map((r) => r.y),
    cls: rows.map((r) => r.cls),
  };
}

const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"];

function mountD3(rows: Row[], root: HTMLElement): void {
  const width = 800;
  const height = 500;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;
  root.replaceChildren();
  const svg = select(root).append("svg").attr("width", width).attr("height", height);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
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
    .range(COLORS);
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
}

function mountGgsvelte(rows: Row[], root: HTMLElement): void {
  const cols = columnsFrom(rows);
  const spec = gg(cols, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7 })
    .toPortable();
  const svg = renderToSVGString(spec, { width: 800, height: 500 });
  root.innerHTML = svg;
}

function mountLib(lib: string, n: number): { ms: number; markCount: number } {
  const mountEl = document.querySelector("#mount")!;
  const status = document.querySelector("#status")!;
  const rows = makeRows(n);
  const t0 = performance.now();
  if (lib === "ggsvelte") {
    mountGgsvelte(rows, mountEl as HTMLElement);
  } else if (lib === "d3") {
    mountD3(rows, mountEl as HTMLElement);
  } else if (lib === "svelteplot" || lib === "layercake") {
    throw new Error(`${lib} browser paint uses component mount; run dedicated fixture`);
  } else {
    throw new Error(`unknown lib ${lib}`);
  }
  const ms = performance.now() - t0;
  const markCount = mountEl.querySelectorAll("circle, path, rect").length;
  status.textContent = `${lib} n=${n} mount=${ms.toFixed(2)}ms marks=${markCount}`;
  return { ms, markCount };
}

function updateLib(lib: string, n: number): { ms: number } {
  const result = mountLib(lib, n + 1);
  return { ms: result.ms };
}

function clearMount(): void {
  document.querySelector("#mount")!.replaceChildren();
}

declare global {
  interface Window {
    competitiveBench: {
      mount: typeof mountLib;
      update: typeof updateLib;
      clear: typeof clearMount;
    };
  }
}

window.competitiveBench = { mount: mountLib, update: updateLib, clear: clearMount };
