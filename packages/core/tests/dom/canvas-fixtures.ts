import { fromPartial } from "@total-typescript/shoehorn";

import type {
  GeometryBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SegmentsBatch,
} from "../../src/scene.ts";

export interface RecordedCall {
  name: string;
  args: number[];
  alpha: number;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
}

export function recordingContext(): { ctx: CanvasRenderingContext2D; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const target = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "miter",
    lineCap: "butt",
  };
  const methods = new Set([
    "arc",
    "beginPath",
    "clearRect",
    "clip",
    "closePath",
    "fill",
    "fillRect",
    "lineTo",
    "moveTo",
    "rect",
    "restore",
    "save",
    "stroke",
    "strokeRect",
    "translate",
  ]);
  const ctx = new Proxy(target, {
    get(object, property): unknown {
      if (typeof property === "string" && methods.has(property)) {
        return (...args: number[]) => {
          calls.push({
            name: property,
            args,
            alpha: object.globalAlpha,
            fillStyle: String(object.fillStyle),
            strokeStyle: object.strokeStyle,
            lineWidth: object.lineWidth,
          });
        };
      }
      return Reflect.get(object, property);
    },
    set(object, property, value) {
      return Reflect.set(object, property, value);
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

export const points: PointsBatch = {
  kind: "points",
  layerIndex: 0,
  panelIndex: 0,
  positions: Float32Array.from([1, 1, 2, 2, 3, 3]),
  rowIndex: Uint32Array.from([0, 1, 2]),
  size: 1,
  alpha: 0.8,
  shape: "circle",
  fill: "red",
};

export const rects: RectsBatch = {
  kind: "rects",
  layerIndex: 1,
  panelIndex: 0,
  rects: Float32Array.from([1, 1, 2, 2, 4, 4, 2, 2]),
  rowIndex: Uint32Array.from([0, 1]),
  fill: "blue",
  alpha: 1,
};

export const segments: SegmentsBatch = {
  kind: "segments",
  layerIndex: 2,
  panelIndex: 0,
  segments: Float32Array.from([1, 1, 2, 2, 4, 4, 5, 5]),
  rowIndex: Uint32Array.from([0, 1]),
  stroke: "black",
  linewidth: 1,
  alpha: 1,
};

export const paths: PathsBatch = {
  kind: "paths",
  layerIndex: 3,
  panelIndex: 0,
  positions: Float32Array.from([1, 1, 2, 2, 4, 4, 5, 5]),
  rowIndex: Uint32Array.from([0, 0, 1, 1]),
  pathOffsets: Uint32Array.from([0, 2, 4]),
  strokes: ["green", "orange"],
  linewidth: 1,
  alpha: 1,
  curve: "linear",
};

export function scene(batches: readonly GeometryBatch[], panelCount = 1): Scene {
  const panels = Array.from({ length: panelCount }, (_, i) => ({
    id: `panel-${i}`,
    x: i * 30,
    y: 0,
    width: 20,
    height: 20,
    strip: "",
    axisX: null,
    axisY: null,
    grid: { x: [], y: [] },
  }));
  return fromPartial<Scene>({
    width: Math.max(20, panelCount * 30),
    height: 20,
    panels,
    batches: [...batches],
    legends: [],
    theme: { ink: "black", accent: "blue", interactionMuted: 0.36 },
    title: "",
    subtitle: "",
    caption: "",
  });
}

export const resolve = (color: string) => color;

/**
 * Arc x-positions drawn after each panel translate. Panel origin is
 * `panelIndex * 30` (see `scene()`), so we group draws by the latest
 * translate x. Used to lock multi-panel routing without coupling to the
 * internal by-panel index structure.
 */
export function arcsByPanelTranslate(calls: readonly RecordedCall[]): Map<number, number[]> {
  const byPanel = new Map<number, number[]>();
  let currentX = 0;
  for (const call of calls) {
    if (call.name === "translate") {
      currentX = call.args[0]!;
      if (!byPanel.has(currentX)) byPanel.set(currentX, []);
      continue;
    }
    if (call.name === "arc") {
      const list = byPanel.get(currentX) ?? [];
      list.push(call.args[0]!);
      byPanel.set(currentX, list);
    }
  }
  return byPanel;
}
