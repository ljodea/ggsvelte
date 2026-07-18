import { describe, expect, it } from "bun:test";

import { drawStratum, groupBatchesByPanel } from "../src/dom/canvas.ts";
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
  strokeStyle: string;
  lineWidth: number;
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
          calls.push({
            name: property,
            args,
            alpha: object.globalAlpha,
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

function scene(batches: readonly GeometryBatch[], panelCount = 1): Scene {
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
  return {
    width: Math.max(20, panelCount * 30),
    height: 20,
    panels,
    batches: [...batches],
    legends: [],
    theme: { ink: "black", accent: "blue", interactionMuted: 0.36 } as Scene["theme"],
    title: "",
    subtitle: "",
    caption: "",
  } as Scene;
}

const resolve = (color: string) => color;

/**
 * Arc x-positions drawn after each panel translate. Panel origin is
 * `panelIndex * 30` (see `scene()`), so we group draws by the latest
 * translate x. Used to lock multi-panel routing without coupling to the
 * internal by-panel index structure.
 */
function arcsByPanelTranslate(calls: readonly RecordedCall[]): Map<number, number[]> {
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

describe("drawStratum multi-panel batch routing", () => {
  const panel0Points: PointsBatch = {
    ...points,
    panelIndex: 0,
    positions: Float32Array.from([10, 1]),
    rowIndex: Uint32Array.from([0]),
  };
  const panel1Points: PointsBatch = {
    ...points,
    layerIndex: 1,
    panelIndex: 1,
    positions: Float32Array.from([20, 2]),
    rowIndex: Uint32Array.from([1]),
  };
  const panel2Points: PointsBatch = {
    ...points,
    layerIndex: 2,
    panelIndex: 2,
    positions: Float32Array.from([30, 3]),
    rowIndex: Uint32Array.from([2]),
  };

  it("draws each batch only inside its own panel (interleaved panel indices)", () => {
    // Batches arrive out of panel order — grouping must not reorder across panels
    // and must not skip or double-draw when panelIndex is non-monotonic.
    const batches = [panel1Points, panel0Points, panel2Points];
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene(batches, 3), batches, resolve);

    const arcs = arcsByPanelTranslate(calls);
    expect(arcs.get(0)).toEqual([10]);
    expect(arcs.get(30)).toEqual([20]);
    expect(arcs.get(60)).toEqual([30]);
    expect(calls.filter((c) => c.name === "arc")).toHaveLength(3);
  });

  it("preserves within-panel paint order when multiple batches share a panel", () => {
    const first: PointsBatch = {
      ...points,
      panelIndex: 1,
      positions: Float32Array.from([1, 1]),
      rowIndex: Uint32Array.from([0]),
    };
    const second: PointsBatch = {
      ...points,
      layerIndex: 1,
      panelIndex: 1,
      positions: Float32Array.from([2, 2]),
      rowIndex: Uint32Array.from([1]),
    };
    // A batch for panel 0 sits between them in the input list — it must not
    // reorder the two panel-1 batches relative to each other.
    const other: PointsBatch = {
      ...points,
      layerIndex: 2,
      panelIndex: 0,
      positions: Float32Array.from([9, 9]),
      rowIndex: Uint32Array.from([2]),
    };
    const batches = [first, other, second];
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene(batches, 2), batches, resolve);

    const arcs = arcsByPanelTranslate(calls);
    expect(arcs.get(0)).toEqual([9]);
    expect(arcs.get(30)).toEqual([1, 2]);
  });

  it("skips empty panels without drawing and still covers all populated ones", () => {
    // Panels 0 and 2 empty; only panel 1 has work. Empty panels must not
    // produce translate/clip work beyond clearRect setup, and panel 1 must still draw.
    const batches = [panel1Points];
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene(batches, 3), batches, resolve);

    const arcs = arcsByPanelTranslate(calls);
    expect(arcs.get(30)).toEqual([20]);
    expect(arcs.has(0)).toBe(false);
    expect(arcs.has(60)).toBe(false);
    expect(calls.filter((c) => c.name === "arc")).toHaveLength(1);
  });

  it("focus masks index by original batch list, not per-panel reindex", () => {
    // focusMasks[i] must address batches[i] in the full list. If implementation
    // reindexes masks per panel, the second batch's mask would be read as the
    // first panel-local entry and the focus/muted split would flip.
    const a: PointsBatch = {
      ...points,
      panelIndex: 0,
      positions: Float32Array.from([1, 1, 2, 2]),
      rowIndex: Uint32Array.from([0, 1]),
    };
    const b: PointsBatch = {
      ...points,
      layerIndex: 1,
      panelIndex: 1,
      positions: Float32Array.from([10, 10, 20, 20]),
      rowIndex: Uint32Array.from([2, 3]),
    };
    const batches = [a, b];
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene(batches, 2), batches, resolve, {
      // mask for a: focus first point only; mask for b: focus second point only
      focusMasks: [Uint8Array.from([1, 0]), Uint8Array.from([0, 1])],
      mutedAlpha: 0.25,
    });

    const arcs = arcsByPanelTranslate(calls);
    // Panel 0: muted point x=2 first, then focused x=1
    expect(arcs.get(0)).toEqual([2, 1]);
    // Panel 1: muted point x=10 first, then focused x=20
    expect(arcs.get(30)).toEqual([10, 20]);
  });

  it("paints muted then focused across batches within the same panel only", () => {
    const a: PointsBatch = {
      ...points,
      panelIndex: 0,
      positions: Float32Array.from([1, 1]),
      rowIndex: Uint32Array.from([0]),
    };
    const b: PointsBatch = {
      ...points,
      layerIndex: 1,
      panelIndex: 0,
      positions: Float32Array.from([2, 2]),
      rowIndex: Uint32Array.from([1]),
    };
    const otherPanel: PointsBatch = {
      ...points,
      layerIndex: 2,
      panelIndex: 1,
      positions: Float32Array.from([99, 99]),
      rowIndex: Uint32Array.from([2]),
    };
    const batches = [a, otherPanel, b];
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene(batches, 2), batches, resolve, {
      focusMasks: [
        Uint8Array.from([1]), // a focused
        Uint8Array.from([0]), // otherPanel muted
        Uint8Array.from([0]), // b muted
      ],
      mutedAlpha: 0.25,
    });

    const arcs = arcsByPanelTranslate(calls);
    // Within panel 0: muted b (x=2) before focused a (x=1)
    expect(arcs.get(0)).toEqual([2, 1]);
    // Panel 1: only its own muted point
    expect(arcs.get(30)).toEqual([99]);
  });

  function manyPanelBatches(panelCount: number, batchesPerPanel: number): GeometryBatch[] {
    const out: GeometryBatch[] = [];
    for (let p = 0; p < panelCount; p++) {
      for (let b = 0; b < batchesPerPanel; b++) {
        out.push({
          ...points,
          layerIndex: p * batchesPerPanel + b,
          panelIndex: p,
          positions: Float32Array.from([p + b, 1]),
          rowIndex: Uint32Array.from([0]),
        });
      }
    }
    return out;
  }

  /**
   * Complexity guard for #185: groupBatchesByPanel must index each batch
   * exactly once (O(B)), independent of panel count. A Proxy counts numeric
   * index reads without patching Array.prototype (oxlint no-extend-native).
   */
  it("groupBatchesByPanel reads each batch once regardless of panel count", () => {
    const panelCount = 12;
    const raw = manyPanelBatches(panelCount, 3);
    let indexReads = 0;
    const batches = new Proxy(raw, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) indexReads++;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });

    const withoutIdx = groupBatchesByPanel(panelCount, batches, false);
    expect(indexReads).toBe(raw.length);
    expect(withoutIdx.indices).toBeNull();
    expect(withoutIdx.byPanel).toHaveLength(panelCount);
    expect(withoutIdx.byPanel.reduce((n, bucket) => n + bucket.length, 0)).toBe(raw.length);

    indexReads = 0;
    const withIdx = groupBatchesByPanel(panelCount, batches, true);
    expect(indexReads).toBe(raw.length);
    // Original indices align with the full list, not a per-panel reindex.
    expect(withIdx.indices![1]).toEqual([3, 4, 5]);
    expect(withIdx.byPanel[1]!.map((b) => b.layerIndex)).toEqual([3, 4, 5]);
  });

  it("groupBatchesByPanel skips out-of-range panelIndex without throwing", () => {
    const bad: PointsBatch = { ...points, panelIndex: 99 };
    const { byPanel, indices } = groupBatchesByPanel(2, [points, bad], true);
    expect(byPanel[0]).toHaveLength(1);
    expect(byPanel[1]).toHaveLength(0);
    expect(indices![0]).toEqual([0]);
  });

  it("groupBatchesByPanel skips NaN and non-integer panelIndex without throwing", () => {
    // Regression for Codex P2 on #192: bounds-only guards let NaN/1.5 through
    // to `byPanel[p]!.push`, which throws because those keys are not buckets.
    const nan: PointsBatch = { ...points, panelIndex: Number.NaN };
    const frac: PointsBatch = { ...points, layerIndex: 1, panelIndex: 1.5 };
    const { byPanel, indices } = groupBatchesByPanel(2, [points, nan, frac], true);
    expect(byPanel[0]).toHaveLength(1);
    expect(byPanel[1]).toHaveLength(0);
    expect(indices![0]).toEqual([0]);
    expect(Object.keys(byPanel).filter((k) => k !== "0" && k !== "1")).toEqual([]);
  });
});

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

describe("drawStratum segment stroke batching", () => {
  const denseMono: SegmentsBatch = {
    kind: "segments",
    layerIndex: 0,
    panelIndex: 0,
    // 6 segments, mono stroke (no per-segment strokes array)
    segments: Float32Array.from([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
    ]),
    rowIndex: Uint32Array.from([0, 1, 2, 3, 4, 5]),
    stroke: "black",
    linewidth: 2,
    alpha: 1,
  };

  it("mono stroke: one stroke() for all segments (not one per edge)", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([denseMono]), [denseMono], resolve);
    // Panel clip also begins a path; count only paint strokes (with strokeStyle set).
    const strokes = calls.filter((c) => c.name === "stroke" && c.strokeStyle !== "");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.strokeStyle).toBe("black");
    expect(strokes[0]?.lineWidth).toBe(2);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(6);
    expect(calls.filter((c) => c.name === "lineTo")).toHaveLength(6);
  });

  it("null stroke falls back to theme ink once for the mono path", () => {
    const themed: SegmentsBatch = { ...denseMono, stroke: null };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([themed]), [themed], resolve);
    const strokes = calls.filter((c) => c.name === "stroke" && c.strokeStyle !== "");
    expect(strokes).toHaveLength(1);
    // Identity resolve leaves themeVar() expressions intact (cssColorResolver peels them in prod).
    expect(strokes[0]?.strokeStyle).toBe("var(--gg-ink, black)");
  });

  it("empty segments issue no stroke()", () => {
    const empty: SegmentsBatch = {
      ...denseMono,
      segments: new Float32Array(0),
      rowIndex: new Uint32Array(0),
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([empty]), [empty], resolve);
    expect(calls.filter((c) => c.name === "stroke")).toHaveLength(0);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(0);
  });

  it("contiguous same-color runs collapse to one stroke per run", () => {
    const runBatch: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]),
      rowIndex: Uint32Array.from([0, 1, 2, 3]),
      stroke: null,
      strokes: ["red", "red", "blue", "blue"],
      linewidth: 1,
      alpha: 1,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([runBatch]), [runBatch], resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(2);
    expect(strokes.map((c) => c.strokeStyle)).toEqual(["red", "blue"]);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(4);
  });

  it("alternating per-segment strokes keep one stroke per run (n runs)", () => {
    const alt: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]),
      rowIndex: Uint32Array.from([0, 1, 2]),
      stroke: null,
      strokes: ["red", "blue", "red"],
      linewidth: 1,
      alpha: 1,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([alt]), [alt], resolve);
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(3);
    expect(strokes.map((c) => c.strokeStyle)).toEqual(["red", "blue", "red"]);
  });

  it("mixed focus mask: mono batch strokes once per pass (muted then focused)", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([denseMono]), [denseMono], resolve, {
      focusMasks: [Uint8Array.from([1, 0, 1, 0, 1, 0])],
      mutedAlpha: 0.3,
    });
    const strokes = calls.filter((c) => c.name === "stroke");
    // muted pass + focused pass
    expect(strokes).toHaveLength(2);
    expect(strokes.map((c) => c.alpha).toSorted((a, b) => a - b)).toEqual([0.3, 1]);
    // 3 muted + 3 focused endpoints
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(6);
  });

  it("all-focused mask: single mono stroke; empty-inclusion pass issues no stroke", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([denseMono]), [denseMono], resolve, {
      focusMasks: [Uint8Array.from([1, 1, 1, 1, 1, 1])],
      mutedAlpha: 0.3,
    });
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.alpha).toBe(1);
    expect(calls.filter((c) => c.name === "moveTo")).toHaveLength(6);
  });

  it("masked multi-color runs skip excluded mid-run without empty stroke", () => {
    // red, blue, red — exclude blue: contiguous reds stay separate runs (not merged)
    const batch: SegmentsBatch = {
      kind: "segments",
      layerIndex: 0,
      panelIndex: 0,
      segments: Float32Array.from([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]),
      rowIndex: Uint32Array.from([0, 1, 2]),
      stroke: null,
      strokes: ["red", "blue", "red"],
      linewidth: 1,
      alpha: 1,
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([batch]), [batch], resolve, {
      focusMasks: [Uint8Array.from([1, 0, 1])],
      mutedAlpha: 0.25,
    });
    // muted: blue only → 1 stroke; focused: red, red as two runs → 2 strokes
    const strokes = calls.filter((c) => c.name === "stroke");
    expect(strokes).toHaveLength(3);
    const muted = strokes.filter((c) => c.alpha === 0.25);
    const focused = strokes.filter((c) => c.alpha === 1);
    expect(muted.map((c) => c.strokeStyle)).toEqual(["blue"]);
    expect(focused.map((c) => c.strokeStyle)).toEqual(["red", "red"]);
  });
});
