/**
 * Unit tests for pure semantic-key helpers (source identity, epoch tokens,
 * resolveSemanticKeys diagnostics).
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, vi } from "vitest";

import type { CellValue } from "@ggsvelte/core";

import { INTERACTION_DIAGNOSTIC_CATALOG } from "../../src/lib/interaction/interaction.js";
import {
  createSourceIdentityTracker,
  dataContentOrderToken,
  dataIdentityEpochToken,
  resolveSemanticKeys,
  resolveSemanticKeysForPlot,
  type SemanticKeyCandidate,
  type SemanticKeyModelView,
} from "../../src/lib/runtime/semantic-keys.js";

function modelView(options: {
  candidates?: SemanticKeyCandidate[];
  rows?: Array<Record<string, CellValue> | null>;
  lineage?: Map<number, readonly number[]>;
  layers?: ReadonlyArray<{
    geom: string;
    params?: Record<string, unknown>;
  }>;
}): SemanticKeyModelView {
  const candidates = options.candidates ?? [];
  const modelRows = options.rows ?? [];
  const lineage = options.lineage ?? new Map<number, readonly number[]>();
  return {
    candidateCount: candidates.length,
    candidate(id: number) {
      return candidates[id] ?? null;
    },
    lineageKeys(lineageId: number) {
      return lineage.get(lineageId) ?? [];
    },
    row(rowIndex: number) {
      return modelRows[rowIndex] ?? null;
    },
    layers: options.layers ?? [],
  };
}

// ---------------------------------------------------------------------------
// Pure helpers (from plot-semantic-keys.test.ts)
// ---------------------------------------------------------------------------

describe("dataIdentityEpochToken", () => {
  it("returns no-data when not ready", () => {
    const tracker = createSourceIdentityTracker();
    expect(
      dataIdentityEpochToken({
        ready: false,
        dataToken: "1",
        specToken: "2",
        data: null,
        datasets: null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
      }),
    ).toBe("no-data");
  });

  it("joins prop tokens with O(R) row-reference order, not deep JSON of cells", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const rowA = { a: 1 };
    const rowB = { a: 2 };
    const data = [rowA, rowB];
    const first = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data,
      datasets: null,
      sourceIdentity: id,
    });
    // Same row references / order → same epoch (theme-style respecs keep prop identity).
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data,
        datasets: null,
        sourceIdentity: id,
      }),
    ).toBe(first);
    // In-place reverse of the same row objects bumps the order fingerprint.
    data.reverse();
    const reversed = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data,
      datasets: null,
      sourceIdentity: id,
    });
    expect(reversed).not.toBe(first);
    // Deep cell edits on the same row objects do not walk cells — token stays put.
    rowA.a = 99;
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data,
        datasets: null,
        sourceIdentity: id,
      }),
    ).toBe(reversed);
    // New dataToken (new prop reference) changes the epoch even with empty content.
    expect(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d2",
        specToken: "s",
        data: null,
        datasets: null,
        sourceIdentity: id,
      }),
    ).not.toBe(
      dataIdentityEpochToken({
        ready: true,
        dataToken: "d",
        specToken: "s",
        data: null,
        datasets: null,
        sourceIdentity: id,
      }),
    );
  });

  it("fingerprints column-array identities (not only the columns wrapper)", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const x = [1, 2];
    const y = [3, 4];
    const columns = { x, y };
    const bare = dataContentOrderToken(columns, id);
    const wrapped = dataContentOrderToken({ columns }, id);
    // Both forms include each column array's identity (Codex P2).
    expect(bare).toContain(id(x));
    expect(bare).toContain(id(y));
    expect(wrapped).toContain(id(x));
    expect(wrapped).toContain(id(y));
    // Replace one column array on the map → content token changes.
    columns.y = [5, 6];
    expect(dataContentOrderToken(columns, id)).not.toBe(bare);
  });

  it("does not treat a multi-field map with a values column as a DataRef", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const values = [1, 2];
    const y = [3, 4];
    const bare = { values, y };
    const first = dataContentOrderToken(bare, id);
    expect(first.startsWith("c:")).toBe(true);
    expect(first).toContain(id(values));
    expect(first).toContain(id(y));
    bare.y = [9, 9];
    expect(dataContentOrderToken(bare, id)).not.toBe(first);
  });

  it("does not deep-serialize large row payloads (no JSON.stringify of cells)", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const largeRows = Array.from({ length: 2000 }, (_, i) => ({ i, pad: "x".repeat(64) }));
    const spy = vi.spyOn(JSON, "stringify");
    const token = dataIdentityEpochToken({
      ready: true,
      dataToken: "d",
      specToken: "s",
      data: largeRows,
      datasets: null,
      sourceIdentity: id,
    });
    expect(token.startsWith("d:s:")).toBe(true);
    // Content order is O(R) row refs — same helper used standalone.
    expect(dataContentOrderToken(largeRows, id).startsWith("v:2000:")).toBe(true);
    // May stringify nothing, or only incidental non-data uses — never the full row array.
    for (const call of spy.mock.calls) {
      expect(call[0]).not.toBe(largeRows);
      if (Array.isArray(call[0])) {
        expect(call[0]).not.toContain(largeRows[0]);
      }
    }
    spy.mockRestore();
  });

  // #609 — geom-child layer data must participate in the identity epoch.
  it("includes layer-local data in the epoch when plot data/spec are absent", () => {
    const tracker = createSourceIdentityTracker();
    const id = (value: unknown) => tracker.sourceIdentity(value);
    const rowsA = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    const rowsB = [
      { x: 9, y: 8 },
      { x: 7, y: 6 },
    ];
    // Plot-level data/spec absent — tokens are stable literals.
    const absent = {
      ready: true as const,
      dataToken: "none",
      specToken: "none",
      data: null,
      datasets: null,
      sourceIdentity: id,
    };
    const withoutLayers = dataIdentityEpochToken(absent);
    const withLayerA = dataIdentityEpochToken({
      ...absent,
      layers: [{ data: rowsA }],
    });
    const withLayerB = dataIdentityEpochToken({
      ...absent,
      layers: [{ data: rowsB }],
    });
    expect(withLayerA).not.toBe(withoutLayers);
    expect(withLayerA).not.toBe(withLayerB);
    // Same layer data reference → stable epoch.
    expect(
      dataIdentityEpochToken({
        ...absent,
        layers: [{ data: rowsA }],
      }),
    ).toBe(withLayerA);
  });
});

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

describe("createSourceIdentityTracker", () => {
  it("assigns stable ids to the same object and distinct ids to different objects", () => {
    const tracker = createSourceIdentityTracker();
    const a = { v: 1 };
    const b = { v: 1 };
    expect(tracker.sourceIdentity(a)).toBe(tracker.sourceIdentity(a));
    expect(tracker.sourceIdentity(a)).not.toBe(tracker.sourceIdentity(b));
    expect(tracker.sourceIdentity(42)).toBe("42");
    expect(tracker.sourceIdentity(null)).toBe("null");
    expect(tracker.sourceIdentity("x")).toBe("x");
  });

  it("does not expose a clear operation (identity epochs must stay stable)", () => {
    const tracker = createSourceIdentityTracker();
    expect("clear" in tracker).toBe(false);
  });
});

describe("resolveSemanticKeys", () => {
  it("returns empty maps and no diagnostics when datumKey is undefined", () => {
    const priorKeys = new Map<string, PropertyKey>();
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [{ id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 }],
        rows: [{ id: 1 }],
        lineage: new Map([[0, [0]]]),
      }),
      datumKey: undefined,
      priorKeys,
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.keys.size).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(priorKeys.size).toBe(0);
  });

  it("emits synthetic-rule missing-lineage first when candidates are empty", () => {
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [],
        layers: [{ geom: "rule", params: { xintercept: 1 } }],
      }),
      datumKey: "id",
      priorKeys: new Map(),
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.diagnostics).toEqual([
      {
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_MISSING_LINEAGE,
        actual: "synthetic rule has no source rows",
      },
    ]);
  });

  it("emits candidate missing-lineage before row key diagnostics", () => {
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [
          { id: 0, rowIndex: null, layerIndex: 3, lineage: 0 },
          { id: 1, rowIndex: 0, layerIndex: 0, lineage: 1 },
        ],
        rows: [{ id: null }],
        lineage: new Map([
          [0, []],
          [1, [0]],
        ]),
      }),
      datumKey: "id",
      priorKeys: new Map(),
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.diagnostics.map((d) => d.code)).toEqual([
      "INTERACTION_MISSING_LINEAGE",
      "INTERACTION_INVALID_KEY",
    ]);
    expect(result.diagnostics[0].actual).toEqual({
      layerIndex: 3,
      candidateId: 0,
    });
    expect(result.keys.get(0)).toBeNull();
  });

  it("records field keys and treats symbols as valid", () => {
    const sym = Symbol("s");
    const priorKeys = new Map<string, PropertyKey>();
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [
          { id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 },
          { id: 1, rowIndex: 1, layerIndex: 0, lineage: 1 },
        ],
        rows: [{ id: "a" }, { id: sym }],
        lineage: new Map([
          [0, [0]],
          [1, [1]],
        ]),
      }),
      datumKey: "id",
      priorKeys,
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.keys.get(0)).toBe("a");
    expect(result.keys.get(1)).toBe(sym);
    expect(result.diagnostics).toEqual([]);
    expect(priorKeys.get("r:0")).toBe("a");
    expect(priorKeys.get("r:1")).toBe(sym);
  });

  it("supports function accessors and invalid key types", () => {
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [
          { id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 },
          { id: 1, rowIndex: 1, layerIndex: 0, lineage: 1 },
        ],
        rows: [{ n: 1 }, { n: 2 }],
        lineage: new Map([
          [0, [0]],
          [1, [1]],
        ]),
      }),
      datumKey: (row: Record<string, CellValue>, index: number) =>
        index === 0 ? String(row.n) : fromAny<PropertyKey>({ bad: true }),
      priorKeys: new Map(),
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.keys.get(0)).toBe("1");
    expect(result.keys.get(1)).toBeNull();
    expect(result.diagnostics).toEqual([
      {
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INVALID_KEY,
        actual: { bad: true },
      },
    ]);
  });

  it("detects unstable keys against priorKeys and does not update the prior entry", () => {
    const priorKeys = new Map<string, PropertyKey>([["r:0", "old"]]);
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [{ id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 }],
        rows: [{ id: "new" }],
        lineage: new Map([[0, [0]]]),
      }),
      datumKey: "id",
      priorKeys,
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.keys.get(0)).toBeNull();
    expect(result.diagnostics).toEqual([
      {
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_UNSTABLE_KEY,
        actual: { previous: "old", current: "new" },
      },
    ]);
    expect(priorKeys.get("r:0")).toBe("old");
  });

  it("nulls both owners on duplicate keys and records one diagnostic with actual value", () => {
    const priorKeys = new Map<string, PropertyKey>();
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [
          { id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 },
          { id: 1, rowIndex: 1, layerIndex: 0, lineage: 1 },
          { id: 2, rowIndex: 2, layerIndex: 0, lineage: 2 },
        ],
        rows: [{ id: "dup" }, { id: "dup" }, { id: "dup" }],
        lineage: new Map([
          [0, [0]],
          [1, [1]],
          [2, [2]],
        ]),
      }),
      datumKey: "id",
      priorKeys,
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.keys.get(0)).toBeNull();
    expect(result.keys.get(1)).toBeNull();
    expect(result.keys.get(2)).toBeNull();
    expect(result.diagnostics.map((d) => d.code)).toEqual([
      "INTERACTION_DUPLICATE_KEY",
      "INTERACTION_DUPLICATE_KEY",
    ]);
    expect(result.diagnostics[0].actual).toBe("dup");
    // first owner was set before the first duplicate; later owners also mark prior null
    expect(priorKeys.get("r:0")).toBe("dup");
    expect(priorKeys.get("r:1")).toBe("dup");
    expect(priorKeys.get("r:2")).toBe("dup");
  });

  it("collects lineage rows and candidate rowIndex into sourceRows in encounter order", () => {
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [
          { id: 0, rowIndex: 9, layerIndex: 0, lineage: 0 },
          { id: 1, rowIndex: null, layerIndex: 0, lineage: 1 },
        ],
        rows: Array.from({ length: 10 }, (_, i) => ({ id: `k${i}` })),
        lineage: new Map([
          [0, [3, 1]],
          [1, [4]],
        ]),
      }),
      datumKey: "id",
      priorKeys: new Map(),
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    // encounter order: 9 (rowIndex), 3,1 (lineage), 4 (lineage of second)
    expect([...result.keys.keys()]).toEqual([9, 3, 1, 4]);
    expect(result.keys.get(9)).toBe("k9");
    expect(result.keys.get(3)).toBe("k3");
  });

  it("skips priorKeys mutation when the row is null", () => {
    const priorKeys = new Map<string, PropertyKey>();
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [{ id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 }],
        rows: [null],
        lineage: new Map([[0, [0]]]),
      }),
      datumKey: "id",
      priorKeys,
      rowIdentity: (rowIndex) => `r:${rowIndex}`,
    });
    expect(result.keys.get(0)).toBeNull();
    expect(result.diagnostics[0].code).toBe("INTERACTION_INVALID_KEY");
    expect(priorKeys.size).toBe(0);
  });

  it("uses a fresh priorKeys map when data/spec identity changes (caller responsibility)", () => {
    // Component keeps one priorKeys Map for the instance; replacement data is
    // a different rowIdentity namespace so instability does not fire.
    const priorKeys = new Map<string, PropertyKey>([["dataA:0", "a"]]);
    const result = resolveSemanticKeys({
      model: modelView({
        candidates: [{ id: 0, rowIndex: 0, layerIndex: 0, lineage: 0 }],
        rows: [{ id: "b" }],
        lineage: new Map([[0, [0]]]),
      }),
      datumKey: "id",
      priorKeys,
      rowIdentity: (rowIndex) => `dataB:${rowIndex}`,
    });
    expect(result.keys.get(0)).toBe("b");
    expect(result.diagnostics).toEqual([]);
    expect(priorKeys.get("dataB:0")).toBe("b");
    expect(priorKeys.get("dataA:0")).toBe("a");
  });
});

// ---------------------------------------------------------------------------
