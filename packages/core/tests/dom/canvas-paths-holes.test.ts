import { describe, expect, it } from "bun:test";

import { drawStratum } from "../../src/dom/canvas.ts";
import type { PathsBatch } from "../../src/scene.ts";
import { recordingContext, resolve, scene } from "./canvas-fixtures.ts";

/**
 * Canvas hole tracing (#809): each subpath must start a fresh ring at its own
 * `ringStarts` breaks and ignore the breaks belonging to other subpaths.
 */
describe("drawStratum polygon hole tracing", () => {
  // Two square compounds, each an exterior ring plus a hole ring.
  // Vertices 0-3 exterior A, 4-7 hole A, 8-11 exterior B, 12-15 hole B.
  const twoHoles: PathsBatch = {
    kind: "paths",
    layerIndex: 0,
    panelIndex: 0,
    positions: Float32Array.from([
      0, 0, 10, 0, 10, 10, 0, 10, 3, 3, 7, 3, 7, 7, 3, 7, 20, 0, 30, 0, 30, 10, 20, 10, 23, 3, 27,
      3, 27, 7, 23, 7,
    ]),
    rowIndex: Uint32Array.from([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]),
    pathOffsets: Uint32Array.from([0, 8, 16]),
    ringStarts: Uint32Array.from([4, 12]),
    fillRule: "evenodd",
    strokes: ["green", "green"],
    fills: ["red", "red"],
    closed: true,
    linewidth: 1,
    alpha: 1,
    curve: "linear",
  };

  it("opens one ring per exterior and hole, at that ring's own start vertex", () => {
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([twoHoles]), [twoHoles], resolve);
    // Panel clipping also begins a path but never moves to a vertex.
    const moveTos = calls.filter((call) => call.name === "moveTo").map((call) => call.args);
    expect(moveTos).toEqual([
      [0, 0], // exterior A
      [3, 3], // hole A — break 4, inside subpath 0
      [20, 0], // exterior B
      [23, 3], // hole B — break 12, inside subpath 1
    ]);
    expect(calls.filter((call) => call.name === "closePath")).toHaveLength(4);
  });

  it("ignores a break that belongs to another subpath", () => {
    // Same geometry, but only the second compound has a hole. Subpath 0 must
    // stay a single ring even though the batch-wide break list is non-empty.
    const holeInSecondOnly: PathsBatch = { ...twoHoles, ringStarts: Uint32Array.from([12]) };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([holeInSecondOnly]), [holeInSecondOnly], resolve);
    expect(calls.filter((call) => call.name === "moveTo").map((call) => call.args)).toEqual([
      [0, 0], // exterior A, traced whole — no ring break inside it
      [20, 0], // exterior B
      [23, 3], // hole B
    ]);
  });

  it("reads the ring-start list per subpath window, not once per subpath in full", () => {
    // 64 compounds, one hole each: S = R = 64. The old full scan read every
    // entry for every subpath (S x R = 4096 reads); windowing reads about
    // log2(R) per subpath.
    const S = 64;
    const positions = new Float32Array(S * 8 * 2);
    const pathOffsets = new Uint32Array(S + 1);
    const ringStarts = new Uint32Array(S);
    for (let s = 0; s < S; s++) {
      const base = s * 8;
      pathOffsets[s] = base;
      ringStarts[s] = base + 4;
      const x = s * 40;
      // Exterior square then hole square, both in the compound's own column.
      const ring = [x, 0, x + 10, 0, x + 10, 10, x, 10, x + 3, 3, x + 7, 3, x + 7, 7, x + 3, 7];
      for (let i = 0; i < ring.length; i++) positions[base * 2 + i] = ring[i]!;
    }
    pathOffsets[S] = S * 8;

    let reads = 0;
    const counted = new Proxy(ringStarts, {
      get(target, prop) {
        if (typeof prop === "string" && /^\d+$/.test(prop)) reads += 1;
        return Reflect.get(target, prop) as unknown;
      },
    });
    const wide: PathsBatch = {
      ...twoHoles,
      positions,
      rowIndex: Uint32Array.from({ length: S * 8 }, () => 0),
      pathOffsets,
      ringStarts: counted,
      strokes: Array.from({ length: S }, () => "green"),
      fills: Array.from({ length: S }, () => "red"),
    };
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([wide]), [wide], resolve);
    // Every compound still traced both of its rings.
    expect(calls.filter((call) => call.name === "moveTo")).toHaveLength(S * 2);
    expect(reads).toBeGreaterThan(0);
    // Fails at 4096 if a full scan comes back; holds at the ~8 per subpath a
    // binary-searched window costs.
    expect(reads).toBeLessThan(15 * S);
  });

  it("traces a single ring when the batch carries no ring starts", () => {
    const solid: PathsBatch = { ...twoHoles };
    delete solid.ringStarts;
    delete solid.fillRule;
    const { ctx, calls } = recordingContext();
    drawStratum(ctx, scene([solid]), [solid], resolve);
    expect(calls.filter((call) => call.name === "moveTo").map((call) => call.args)).toEqual([
      [0, 0],
      [20, 0],
    ]);
  });
});
