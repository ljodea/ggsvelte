import { describe, expect, it } from "bun:test";

import { drawStratum } from "../src/dom/canvas.ts";
import type {
  GeometryBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SegmentsBatch,
} from "../src/scene.ts";

interface RecordedCall {
  name: string;
  args: number[];
  alpha: number;
}

function recordingContext(): { ctx: CanvasRenderingContext2D; calls: RecordedCall[] } {
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
          calls.push({ name: property, args, alpha: object.globalAlpha });
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

const points: PointsBatch = {
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

const rects: RectsBatch = {
  kind: "rects",
  layerIndex: 1,
  panelIndex: 0,
  rects: Float32Array.from([1, 1, 2, 2, 4, 4, 2, 2]),
  rowIndex: Uint32Array.from([0, 1]),
  fill: "blue",
  alpha: 1,
};

const segments: SegmentsBatch = {
  kind: "segments",
  layerIndex: 2,
  panelIndex: 0,
  segments: Float32Array.from([1, 1, 2, 2, 4, 4, 5, 5]),
  rowIndex: Uint32Array.from([0, 1]),
  stroke: "black",
  linewidth: 1,
  alpha: 1,
};

const paths: PathsBatch = {
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

function scene(batches: readonly GeometryBatch[]): Scene {
  return {
    width: 20,
    height: 20,
    panels: [
      {
        id: "panel",
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        strip: "",
        axisX: null,
        axisY: null,
        grid: { x: [], y: [] },
      },
    ],
    batches: [...batches],
    legends: [],
    theme: { ink: "black", accent: "blue", interactionMuted: 0.36 } as Scene["theme"],
    title: "",
    subtitle: "",
    caption: "",
  } as Scene;
}

const resolve = (color: string) => color;

describe("drawStratum focus presentation", () => {
  it("keeps the unpresented point fast path as one fill", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([points]), [points], resolve);

    const fills = calls.filter((call) => call.name === "fill");
    expect(fills).toHaveLength(1);
    expect(fills[0]!.alpha).toBe(0.8);
  });

  it("draws muted point primitives before focused primitives", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([points]), [points], resolve, {
      focusMasks: [Uint8Array.from([0, 1, 0])],
      mutedAlpha: 0.25,
    });

    const arcs = calls.filter((call) => call.name === "arc");
    expect(arcs.map((call) => [call.args[0], call.alpha])).toEqual([
      [1, 0.2],
      [3, 0.2],
      [2, 0.8],
    ]);
    expect(calls.filter((call) => call.name === "fill")).toHaveLength(2);
  });

  it("batches alternating categorical colors during masked draws", () => {
    const count = 100;
    const colored: PointsBatch = {
      ...points,
      positions: Float32Array.from(
        Array.from({ length: count }, (_, index) => [index, index]).flat(),
      ),
      rowIndex: Uint32Array.from({ length: count }, (_, index) => index),
      colors: Array.from({ length: count }, (_, index) => (index % 2 === 0 ? "red" : "blue")),
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([colored]), [colored], resolve, {
      focusMasks: [Uint8Array.from({ length: count }, (_, index) => (index % 10 === 0 ? 1 : 0))],
    });

    expect(calls.filter((call) => call.name === "fill").length).toBeLessThanOrEqual(4);
    expect(calls.filter((call) => call.name === "arc")).toHaveLength(count);
  });

  it("uses the theme muted alpha and treats missing mask entries as muted", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([points]), [points], resolve, {
      focusMasks: [Uint8Array.from([1])],
    });

    const arcs = calls.filter((call) => call.name === "arc");
    expect(arcs.map((call) => [call.args[0], call.alpha])).toEqual([
      [2, 0.8 * 0.36],
      [3, 0.8 * 0.36],
      [1, 0.8],
    ]);
  });

  it("keeps an all-focused batch on the normal full-batch drawing path", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([points]), [points], resolve, {
      focusMasks: [Uint8Array.from([1, 1, 1])],
    });

    expect(calls.filter((call) => call.name === "fill")).toHaveLength(1);
    expect(calls.filter((call) => call.name === "arc").map((call) => call.args[0])).toEqual([
      1, 2, 3,
    ]);
  });

  it("accepts the read-only renderer-neutral mask projection", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([points]), [points], resolve, {
      focusMasks: [
        {
          primitiveCount: 3,
          focusedCount: 1,
          isFocused: (index: number) => index === 2,
        },
      ],
      mutedAlpha: 0.5,
    });

    const arcs = calls.filter((call) => call.name === "arc");
    expect(arcs.map((call) => [call.args[0], call.alpha])).toEqual([
      [1, 0.4],
      [2, 0.4],
      [3, 0.8],
    ]);
  });

  it("addresses paths by subpath rather than vertex", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([paths]), [paths], resolve, {
      focusMasks: [Uint8Array.from([0, 1])],
      mutedAlpha: 0.4,
    });

    const starts = calls.filter((call) => call.name === "moveTo");
    expect(starts.map((call) => [call.args[0], call.alpha])).toEqual([
      [1, 0.4],
      [4, 1],
    ]);
  });

  it("applies subpath masks to filled areas", () => {
    const area: PathsBatch = {
      ...paths,
      fills: ["purple", "gold"],
      closed: true,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([area]), [area], resolve, {
      focusMasks: [Uint8Array.from([1, 0])],
      mutedAlpha: 0.2,
    });

    const starts = calls.filter((call) => call.name === "moveTo");
    expect(starts.map((call) => [call.args[0], call.alpha])).toEqual([
      [4, 0.2],
      [1, 1],
    ]);
    expect(calls.filter((call) => call.name === "fill").map((call) => call.alpha)).toEqual([
      0.2, 1,
    ]);
  });

  it("applies the same ordering to rects and segments", () => {
    const { ctx, calls } = recordingContext();
    const batches = [rects, segments];
    drawStratum(ctx, scene(batches), batches, resolve, {
      focusMasks: [Uint8Array.from([0, 1]), Uint8Array.from([1, 0])],
      mutedAlpha: 0.3,
    });

    const drawnRects = calls.filter((call) => call.name === "fillRect");
    expect(drawnRects.map((call) => [call.args[0], call.alpha])).toEqual([
      [1, 0.3],
      [4, 1],
    ]);
    const starts = calls.filter((call) => call.name === "moveTo");
    expect(starts.map((call) => [call.args[0], call.alpha])).toEqual([
      [4, 0.3],
      [1, 1],
    ]);
  });

  it("paints focused primitives after muted primitives across batches", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([points, rects]), [points, rects], resolve, {
      focusMasks: [Uint8Array.from([1, 0, 0]), Uint8Array.from([0, 1])],
      mutedAlpha: 0.25,
    });

    const focusedPoint = calls.findIndex(
      (call) => call.name === "arc" && call.args[0] === 1 && call.alpha === 0.8,
    );
    const mutedRect = calls.findIndex(
      (call) => call.name === "fillRect" && call.args[0] === 1 && call.alpha === 0.25,
    );
    expect(focusedPoint).toBeGreaterThan(mutedRect);
  });
});
