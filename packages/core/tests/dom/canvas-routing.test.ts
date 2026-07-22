import { describe, expect, it } from "bun:test";

import { drawStratum, groupBatchesByPanel } from "../../src/dom/canvas.ts";
import type { GeometryBatch, PointsBatch } from "../../src/scene.ts";
import {
  arcsByPanelTranslate,
  points,
  recordingContext,
  resolve,
  scene,
} from "./canvas-fixtures.ts";

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
