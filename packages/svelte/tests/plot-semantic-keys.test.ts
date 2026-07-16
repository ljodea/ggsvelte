import { describe, expect, it } from "vitest";

import type { CellValue } from "@ggsvelte/core";

import { INTERACTION_DIAGNOSTIC_CATALOG } from "../src/lib/interaction.js";
import {
  createSourceIdentityTracker,
  dataIdentityEpochToken,
  resolveSemanticKeys,
  type SemanticKeyCandidate,
  type SemanticKeyModelView,
} from "../src/lib/plot-semantic-keys.js";

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
  const rows = options.rows ?? [];
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
      return rows[rowIndex] ?? null;
    },
    layers: options.layers ?? [],
  };
}

describe("dataIdentityEpochToken", () => {
  it("returns no-data when assembled is null", () => {
    expect(
      dataIdentityEpochToken({
        assembled: null,
        dataToken: "1",
        specToken: "2",
      }),
    ).toBe("no-data");
  });

  it("joins source tokens with JSON of data and datasets (nullish → null)", () => {
    expect(
      dataIdentityEpochToken({
        assembled: { data: [{ a: 1 }], datasets: undefined },
        dataToken: "d",
        specToken: "s",
      }),
    ).toBe(`d:s:${JSON.stringify([[{ a: 1 }], null])}`);
    expect(
      dataIdentityEpochToken({
        assembled: {},
        dataToken: "d",
        specToken: "s",
      }),
    ).toBe(`d:s:${JSON.stringify([null, null])}`);
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
        index === 0 ? String(row.n) : ({ bad: true } as unknown as PropertyKey),
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
