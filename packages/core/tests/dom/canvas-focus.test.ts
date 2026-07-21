import { describe, expect, it } from "bun:test";

import { drawStratum } from "../../src/dom/canvas.ts";
import type { PathsBatch, PointsBatch } from "../../src/scene.ts";
import {
  paths,
  points,
  recordingContext,
  rects,
  resolve,
  scene,
  segments,
} from "./canvas-fixtures.ts";

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
