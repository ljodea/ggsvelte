import { describe, expect, it, vi } from "vitest";

import type { GeometryBatch } from "@ggsvelte/core";

import { paintCanvasStratum, resolveBatchFocusMasks } from "../../src/lib/scene/stratum-paint.js";

describe("resolveBatchFocusMasks", () => {
  const a = { id: "a" } as unknown as GeometryBatch;
  const b = { id: "b" } as unknown as GeometryBatch;
  const c = { id: "c" } as unknown as GeometryBatch;
  const sceneBatches = [a, b, c];
  const masks = [{ primitives: new Set([0]) }, null, { primitives: new Set([1]) }] as const;

  it("returns empty when interactionMasks is empty", () => {
    expect(resolveBatchFocusMasks(sceneBatches, [a, c], [])).toEqual([]);
  });

  it("maps subset batches by scene identity, not subset index", () => {
    expect(resolveBatchFocusMasks(sceneBatches, [c, a], masks as never)).toEqual([
      masks[2],
      masks[0],
    ]);
  });

  it("returns null for batches absent from the scene list", () => {
    const orphan = { id: "orphan" } as unknown as GeometryBatch;
    expect(resolveBatchFocusMasks(sceneBatches, [orphan], masks as never)).toEqual([null]);
  });
});

describe("paintCanvasStratum", () => {
  it("returns false and does not size/draw when 2d context is unavailable", () => {
    const canvas = document.createElement("canvas");
    const getContext = vi.spyOn(canvas, "getContext").mockReturnValue(null);
    const ok = paintCanvasStratum({
      canvas,
      scene: {
        width: 100,
        height: 50,
        theme: { interactionMuted: 0.35 },
        batches: [],
      } as never,
      batches: [],
      focusMasks: [],
    });
    expect(ok).toBe(false);
    expect(getContext).toHaveBeenCalledWith("2d");
  });

  it("returns true when a 2d context is available", () => {
    const canvas = document.createElement("canvas");
    // Real browser 2d context — sizing/drawing exercise the core path.
    const ok = paintCanvasStratum({
      canvas,
      scene: {
        width: 40,
        height: 20,
        theme: { interactionMuted: 0.4 },
        panels: [],
        batches: [],
        axes: [],
        legends: [],
        grids: [],
        strips: [],
        title: null,
        subtitle: null,
        caption: null,
      } as never,
      batches: [],
      focusMasks: [],
    });
    expect(ok).toBe(true);
    expect(canvas.width).toBeGreaterThan(0);
  });
});
