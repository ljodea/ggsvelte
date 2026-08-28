/**
 * Unit tests for pure semantic-key helpers (plot-level key resolution,
 * candidate-key projection caching).
 */
import { describe, expect, it } from "vitest";

import {
  candidateSemanticKeysFromCache,
  createCandidateKeysProjectionCache,
} from "../../src/lib/runtime/semantic-keys-projection.js";
import { resolveSemanticKeysForPlot } from "../../src/lib/runtime/semantic-keys-resolve.js";

describe("resolveSemanticKeysForPlot", () => {
  it("returns an empty bag when model is null", () => {
    const result = resolveSemanticKeysForPlot({
      model: null,
      layers: [],
      datumKey: "id",
      priorKeys: new Map(),
      dataToken: "d",
      specToken: "s",
    });
    expect(result.keys.size).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("adapts a plot model and resolves keys with data/spec row identity tokens", () => {
    const priorKeys = new Map<string, PropertyKey>();
    const candidates = [{ id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 }];
    const result = resolveSemanticKeysForPlot({
      model: {
        candidates: {
          size: candidates.length,
          candidate: (id) => candidates[id] ?? null,
        },
        lineage: { keys: (lineageId) => (lineageId === 0 ? [0] : []) },
        row: (rowIndex) => (rowIndex === 0 ? { id: "row-a" } : null),
      },
      layers: [{ geom: "point" }],
      datumKey: "id",
      priorKeys,
      dataToken: "d1",
      specToken: "s1",
    });
    expect(result.keys.get(0)).toBe("row-a");
    expect(priorKeys.get("d1:s1:0")).toBe("row-a");
  });
});

describe("candidateSemanticKeysFromCache", () => {
  it("expands a shared lineage once across many candidates", () => {
    const sharedRows = Array.from({ length: 60 }, (_, i) => i);
    const keyForRow = (rowIndex: number): PropertyKey => `k${String(rowIndex)}`;
    let lineageCalls = 0;
    const lineageKeys = (lineageId: number) => {
      lineageCalls += 1;
      return lineageId === 9 ? sharedRows : [];
    };
    const cache = createCandidateKeysProjectionCache();
    const keys: PropertyKey[][] = [];
    for (let id = 0; id < 15; id++) {
      keys.push(
        candidateSemanticKeysFromCache(
          { id, lineage: 9, rowIndex: null },
          cache,
          lineageKeys,
          keyForRow,
        ),
      );
    }
    expect(lineageCalls).toBe(1);
    expect(keys[0]).toEqual(sharedRows.map((rowIndex) => keyForRow(rowIndex)));
    expect(keys[14]).toBe(keys[0]); // same bag reference
  });

  it("does not re-call lineageKeys for a candidate-local row already in the bag", () => {
    let lineageCalls = 0;
    const cache = createCandidateKeysProjectionCache();
    const lineageKeys = (lineageId: number) => {
      lineageCalls += 1;
      return lineageId === 1 ? [0, 1, 2] : [];
    };
    const a = candidateSemanticKeysFromCache(
      { id: 0, lineage: 1, rowIndex: 1 },
      cache,
      lineageKeys,
      (r) => `k${String(r)}`,
    );
    const b = candidateSemanticKeysFromCache(
      { id: 1, lineage: 1, rowIndex: 2 },
      cache,
      lineageKeys,
      (r) => `k${String(r)}`,
    );
    expect(lineageCalls).toBe(1);
    expect(a).toEqual(["k0", "k1", "k2"]);
    expect(b).toBe(a);
  });

  it("appends a candidate row that is outside the shared lineage", () => {
    let lineageCalls = 0;
    const cache = createCandidateKeysProjectionCache();
    const keys = candidateSemanticKeysFromCache(
      { id: 0, lineage: 1, rowIndex: 99 },
      cache,
      (lineageId) => {
        lineageCalls += 1;
        return lineageId === 1 ? [0, 1] : [];
      },
      (r) => `k${String(r)}`,
    );
    expect(lineageCalls).toBe(1);
    expect(keys).toEqual(["k0", "k1", "k99"]);
  });
});
