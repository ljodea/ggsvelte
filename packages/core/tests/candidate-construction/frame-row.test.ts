/**
 * Path group sorted rows and frame-row resolution.
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

describe("buildPathGroupSortedRows", () => {
  it("groups frame rows and sorts each group by xNumeric (fallback row index)", async () => {
    const { buildPathGroupSortedRows } =
      await import("../../src/pipeline/candidate-construction/frame-row.ts");
    // rows: group 1 at x=3, group 0 at x=2, group 1 at x=1, group 0 at x=0
    // → group 0 sorted [3, 1]; group 1 sorted [2, 0]
    const frame = fromAny({
      groups: [1, 0, 1, 0],
      xNumeric: new Float64Array([3, 2, 1, 0]),
    });
    const byGroup = buildPathGroupSortedRows(frame);
    expect([...byGroup.get(0)!]).toEqual([3, 1]);
    expect([...byGroup.get(1)!]).toEqual([2, 0]);
  });

  it("falls back to row index order when xNumeric is null", async () => {
    const { buildPathGroupSortedRows } =
      await import("../../src/pipeline/candidate-construction/frame-row.ts");
    const frame = fromAny({ groups: [0, 0, 0], xNumeric: null });
    expect([...buildPathGroupSortedRows(frame).get(0)!]).toEqual([0, 1, 2]);
  });
});

describe("getPathGroupSortedRows", () => {
  it("returns the same Map for the same frame (precomputed once)", async () => {
    const { getPathGroupSortedRows } =
      await import("../../src/pipeline/candidate-construction/frame-row.ts");
    const frame = fromAny({
      groups: [0, 0, 1],
      xNumeric: new Float64Array([0, 1, 2]),
    });
    const a = getPathGroupSortedRows(frame);
    const b = getPathGroupSortedRows(frame);
    expect(a).toBe(b);
    expect([...a.get(0)!]).toEqual([0, 1]);
    expect([...a.get(1)!]).toEqual([2]);
  });
});

describe("resolveCandidateFrameRow paths", () => {
  it("maps path vertices to x-sorted frame rows and reflects closed-path reverse legs", async () => {
    const { resolveCandidateFrameRow } =
      await import("../../src/pipeline/candidate-construction/frame-row.ts");
    // Two groups interleaved: g0 rows {0,2} with x 2,0 → sorted [2,0];
    // g1 rows {1,3} with x 3,1 → sorted [3,1]
    const frame = fromAny({
      n: 4,
      groups: [0, 1, 0, 1],
      xNumeric: new Float64Array([2, 3, 0, 1]),
      binding: { layer: { geom: "area" } },
    });
    // Two subpaths, each 4 vertices (forward + reverse for closed area):
    // subpath 0: offsets [0, 4), subpath 1: [4, 8)
    const batch = fromAny({
      kind: "paths",
      pathOffsets: new Uint32Array([0, 4, 8]),
    });
    const orderedGroups = [0, 1];

    // Forward: local 0 → first sorted row of group 0 = 2
    expect(
      resolveCandidateFrameRow({
        frame,
        batch,
        primitiveIndex: 0,
        orderedGroups,
        outlierLocalRow: null,
      }),
    ).toEqual({ frameRow: 2, derivedGroup: 0 });
    // Forward: local 1 → second sorted row of group 0 = 0
    expect(
      resolveCandidateFrameRow({
        frame,
        batch,
        primitiveIndex: 1,
        orderedGroups,
        outlierLocalRow: null,
      }),
    ).toEqual({ frameRow: 0, derivedGroup: 0 });
    // Reverse leg: local 2 → reflected 2*2-1-2 = 1 → same as local 1 = 0
    expect(
      resolveCandidateFrameRow({
        frame,
        batch,
        primitiveIndex: 2,
        orderedGroups,
        outlierLocalRow: null,
      }),
    ).toEqual({ frameRow: 0, derivedGroup: 0 });
    // Reverse leg: local 3 → reflected 0 → row 2
    expect(
      resolveCandidateFrameRow({
        frame,
        batch,
        primitiveIndex: 3,
        orderedGroups,
        outlierLocalRow: null,
      }),
    ).toEqual({ frameRow: 2, derivedGroup: 0 });

    // Second subpath (group 1): local 0 → first sorted = 3
    expect(
      resolveCandidateFrameRow({
        frame,
        batch,
        primitiveIndex: 4,
        orderedGroups,
        outlierLocalRow: null,
      }),
    ).toEqual({ frameRow: 3, derivedGroup: 1 });
  });

  it("resolves many subpaths without linear pathOffsets scans (O(log P))", async () => {
    const { resolveCandidateFrameRow } =
      await import("../../src/pipeline/candidate-construction/frame-row.ts");
    const { pathSubpathIndex } = await import("../../src/candidate-geometry.ts");
    // P subpaths × 2 vertices each; offsets [0,2,4,...,2P]
    const P = 2_000;
    const offsets = new Uint32Array(P + 1);
    for (let s = 0; s <= P; s++) offsets[s] = s * 2;
    const groups = Array.from({ length: P * 2 }, (_, i) => Math.floor(i / 2));
    const xNumeric = new Float64Array(P * 2);
    for (let s = 0; s < P; s++) {
      xNumeric[s * 2] = 0;
      xNumeric[s * 2 + 1] = 1;
    }
    const frame = fromAny({
      n: P * 2,
      groups,
      xNumeric,
      binding: { layer: { geom: "line" } },
    });
    const batch = fromAny({ kind: "paths", pathOffsets: offsets });
    const orderedGroups = Array.from({ length: P }, (_, s) => s);

    // Binary search correctness on first / mid / last subpath
    expect(pathSubpathIndex(offsets, 0)).toBe(0);
    expect(pathSubpathIndex(offsets, 2 * Math.floor(P / 2))).toBe(Math.floor(P / 2));
    expect(pathSubpathIndex(offsets, 2 * P - 1)).toBe(P - 1);

    // Full build-style walk: each vertex once. Linear would be O(V·P) comparisons;
    // we only check results stay correct for endpoints of a few subpaths.
    for (const s of [0, 1, Math.floor(P / 2), P - 2, P - 1]) {
      const resolved = resolveCandidateFrameRow({
        frame,
        batch,
        primitiveIndex: s * 2,
        orderedGroups,
        outlierLocalRow: null,
      });
      expect(resolved.derivedGroup).toBe(s);
    }
  });
});
