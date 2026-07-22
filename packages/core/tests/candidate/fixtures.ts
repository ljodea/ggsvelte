import { fromPartial } from "@total-typescript/shoehorn";

import type { CandidateDatum } from "../../src/candidate-store.ts";
import type { Scene } from "../../src/scene.ts";

export function scene(): Scene {
  return {
    width: 200,
    height: 120,
    panels: [
      {
        id: "panel:all",
        x: 0,
        y: 0,
        width: 200,
        height: 120,
        strip: "",
        axisX: [],
        axisY: [],
        grid: { x: [], y: [] },
      },
    ],
    batches: [
      {
        kind: "points",
        layerIndex: 0,
        panelIndex: 0,
        positions: new Float32Array([10, 20, 10, 40, 50, 30]),
        rowIndex: new Uint32Array([0, 1, 2]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
      {
        kind: "points",
        layerIndex: 1,
        panelIndex: 0,
        positions: new Float32Array([10, 25, 10, 25]),
        rowIndex: new Uint32Array([3, 4]),
        size: 3,
        alpha: 1,
        shape: "circle",
        fill: null,
      },
    ],
    axes: { x: { ticks: [], title: "" }, y: { ticks: [], title: "" } },
    grid: { x: [], y: [] },
    legends: [],
    theme: fromPartial<Scene["theme"]>({}),
    title: "",
    subtitle: "",
    caption: "",
  };
}

export function sceneWithPoints(points: readonly (readonly [number, number])[]): Scene {
  const result = scene();
  result.batches = [
    {
      kind: "points",
      layerIndex: 0,
      panelIndex: 0,
      positions: Float32Array.from(points.flat()),
      rowIndex: Uint32Array.from(points.map((_, index) => index)),
      size: 3,
      alpha: 1,
      shape: "circle",
      fill: null,
    },
  ];
  return result;
}

export const data: CandidateDatum[] = [
  { xValue: new Date(0), yValue: 20, seriesId: 0, seriesRank: 1 },
  { xValue: new Date(0), yValue: 40, seriesId: 0, seriesRank: 1 },
  { xValue: 50, yValue: 30, seriesId: 0, seriesRank: 1 },
  { xValue: new Date(0), yValue: 25, seriesId: 8, seriesRank: 0 },
  { xValue: new Date(0), yValue: 25, seriesId: 8, seriesRank: 0 },
];
