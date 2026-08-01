import { describe, expect, it } from "bun:test";

import { insidePath } from "../../src/candidate-geometry.ts";
import type { GeometryBatch } from "../../src/scene.ts";

type PathsBatch = Extract<GeometryBatch, { kind: "paths" }>;

/**
 * `donuts` square donut subpaths side by side: outer (o,0)-(o+10,10), hole
 * (o+3,3)-(o+7,7) with o = 12 × subpath. 8 vertices per subpath; ringStarts
 * marks each hole start.
 */
function donutBatch(donuts: number): PathsBatch {
  const positions = new Float32Array(donuts * 16);
  const pathOffsets = new Uint32Array(donuts + 1);
  const ringStarts = new Uint32Array(donuts);
  for (let s = 0; s < donuts; s++) {
    const o = s * 12;
    const v = s * 8;
    positions.set([o, 0, o + 10, 0, o + 10, 10, o, 10], v * 2);
    positions.set([o + 3, 3, o + 7, 3, o + 7, 7, o + 3, 7], (v + 4) * 2);
    pathOffsets[s] = v;
    ringStarts[s] = v + 4;
  }
  pathOffsets[donuts] = donuts * 8;
  return {
    kind: "paths",
    layerIndex: 0,
    panelIndex: 0,
    positions,
    rowIndex: new Uint32Array(donuts * 8),
    pathOffsets,
    ringStarts,
    fillRule: "evenodd",
    strokes: Array.from({ length: donuts }, () => null),
    fills: Array.from({ length: donuts }, () => null),
    closed: true,
    linewidth: 0,
    alpha: 1,
    curve: "linear",
  };
}

describe("insidePath ring decomposition", () => {
  it("splits a subpath on its own ring breaks (hole excluded, solid included)", () => {
    const batch = donutBatch(1);
    expect(insidePath(batch, 0, 8, 5, 5)).toBe(false); // hole center
    expect(insidePath(batch, 0, 8, 1, 5)).toBe(true); // solid band
    expect(insidePath(batch, 0, 8, -1, 5)).toBe(false); // outside exterior
  });

  it("ignores ring breaks that belong to neighboring subpaths", () => {
    const batch = donutBatch(3);
    // Middle donut spans vertices [8, 16); breaks 4 and 20 must not cut it.
    expect(insidePath(batch, 8, 16, 17, 5)).toBe(false); // its own hole
    expect(insidePath(batch, 8, 16, 13, 5)).toBe(true); // its solid band
    expect(insidePath(batch, 8, 16, 5, 5)).toBe(false); // first donut's hole is outside
  });

  it("reads a bounded slice of ringStarts per call, not the whole array", () => {
    // 512 donuts → 512 ring breaks. One insidePath call on a middle subpath
    // must locate its breaks by search (O(log R + local)), not scan all R.
    const batch = donutBatch(512);
    const ringStarts = batch.ringStarts!;
    let reads = 0;
    batch.ringStarts = new Proxy(ringStarts, {
      get(target, prop) {
        if (typeof prop === "string" && /^\d+$/.test(prop)) reads += 1;
        return Reflect.get(target, prop) as unknown;
      },
    });

    expect(insidePath(batch, 256 * 8, 257 * 8, 256 * 12 + 1, 5)).toBe(true);
    expect(reads).toBeGreaterThan(0);
    // Binary search ≈ log2(512) = 9 probes plus the local walk; the old full
    // scan read all 512 entries.
    expect(reads).toBeLessThan(64);
  });
});
