/**
 * Unit tests for semantic-key pure helpers + reactive service.
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import type { CellValue, RenderModel } from "@ggsvelte/core";

import { INTERACTION_DIAGNOSTIC_CATALOG } from "../../src/lib/interaction/interaction.js";
import {
  createSourceIdentityTracker,
  createSemanticKeyService,
  dataContentOrderToken,
  dataIdentityEpochToken,
  resolveSemanticKeys,
  resolveSemanticKeysForPlot,
  type SemanticKeyCandidate,
  type SemanticKeyModelView,
} from "../../src/lib/runtime/semantic-keys.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";
import { buildPointModel } from "../helpers/point-model.js";
import { reactiveBox } from "../helpers/reactive-box.svelte.js";

const rows = [
  { id: "a", x: 1, y: 10 },
  { id: "b", x: 2, y: 20 },
];

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

// ---------------------------------------------------------------------------
// Reactive service (from plot-shared-services.test.ts)
// ---------------------------------------------------------------------------

describe("createSemanticKeyService", () => {
  it("keeps stable identity across a data-preserving re-render and flags key mutation as unstable", () => {
    // Mutable rows: same array identity (same data token) across renders.
    const mutableRows = [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ];
    const buildModel = () => buildPointModel(mutableRows);
    const model = reactiveBox(buildModel());
    const tracker = createSourceIdentityTracker();
    const diagnostics: string[] = [];

    const { value: service, destroy } = withFlushedEffectRoot(() => {
      const created = createSemanticKeyService({
        model: () => model.value,
        assembled: () => ({
          data: mutableRows,
          layers: [{ geom: "point" }],
          aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "id" } },
        }),
        datumKey: () => "id",
        data: () => mutableRows,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: (d) => {
          diagnostics.push(d.code);
        },
      });
      created.registerEffects();
      return created;
    });

    const first = [service.keyAt(0), service.keyAt(1)];
    expect(first).toEqual(["a", "b"]);
    expect(diagnostics).toEqual([]);

    // Data-preserving re-render: NEW model, same data token → same keys, no
    // diagnostics. (model is reactive state, so the swap re-resolves keys.)
    const previous = model.value;
    model.set(buildModel());
    flushSync();
    expect([service.keyAt(0), service.keyAt(1)]).toEqual(first);
    expect(diagnostics).toEqual([]);
    previous.dispose();

    // Key mutation under the SAME data token: priorKeys must catch it — the
    // mutated row's key becomes null and an unstable-key diagnostic fires.
    // This also proves the re-render above genuinely re-resolved (the same
    // code path now observably reacts to the model swap).
    mutableRows[0].id = "z";
    const beforeMutation = model.value;
    model.set(buildModel());
    flushSync();
    expect(service.keyAt(0)).toBeNull();
    expect(service.keyAt(1)).toBe("b");
    expect(diagnostics).toContain("INTERACTION_UNSTABLE_KEY");
    beforeMutation.dispose();
    model.value.dispose();
    destroy();
  });

  it("keyAt re-resolves against a wholly new data token", () => {
    // Restored from the pre-S16 access-contract test: a FULL dataset
    // replacement (new data token) must re-resolve keys — a service that
    // pins keys from the first token would keep answering with stale keys.
    const dataA = [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ];
    const dataB = [
      { id: "c", x: 3, y: 30 },
      { id: "d", x: 4, y: 40 },
    ];
    const dataBox = reactiveBox(dataA);
    const model = reactiveBox(buildPointModel(dataA));
    const tracker = createSourceIdentityTracker();

    const { value: service, destroy } = withFlushedEffectRoot(() => {
      const created = createSemanticKeyService({
        model: () => model.value,
        assembled: () => null,
        datumKey: () => "id",
        data: () => dataBox.value,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      });
      created.registerEffects();
      return created;
    });

    expect([service.keyAt(0), service.keyAt(1)]).toEqual(["a", "b"]);

    const previous = model.value;
    dataBox.set(dataB);
    model.set(buildPointModel(dataB));
    flushSync();
    expect([service.keyAt(0), service.keyAt(1)]).toEqual(["c", "d"]);

    previous.dispose();
    model.value.dispose();
    destroy();
  });

  it("delivers diagnostics once per change (behavior, not implementation)", () => {
    const duplicateRows = () => [
      { id: "a", x: 1, y: 1 },
      { id: "a", x: 2, y: 2 },
    ];
    const buildModel = (data: { id: string; x: number; y: number }[]) =>
      buildPointModel(data, { x: "x", y: "y" }, { width: 200, height: 200 });
    const dataBox = reactiveBox(duplicateRows());
    const modelBox = reactiveBox<RenderModel | null>(buildModel(dataBox.value));
    const diagnostics: string[] = [];
    const tracker = createSourceIdentityTracker();

    const { destroy } = withFlushedEffectRoot(() => {
      const created = createSemanticKeyService({
        model: () => modelBox.value,
        assembled: () => ({
          data: dataBox.value,
          layers: [{ geom: "point" }],
          aes: { x: { field: "x" }, y: { field: "y" } },
        }),
        datumKey: () => "id",
        data: () => dataBox.value,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: (d) => {
          diagnostics.push(d.code);
        },
      });
      created.registerEffects();
      return created;
    });

    // Duplicate "a"/"a" keys → exactly one duplicate diagnostic on first resolve.
    expect(diagnostics).toEqual(["INTERACTION_DUPLICATE_KEY"]);
    // Re-flush without changing any dependency must not re-deliver.
    flushSync();
    expect(diagnostics).toEqual(["INTERACTION_DUPLICATE_KEY"]);

    // A REAL change (new data identity, same duplicate condition) re-resolves
    // and delivers the diagnostic exactly once more — once per change, not
    // once per flush and not zero.
    const previous = modelBox.value;
    dataBox.set(duplicateRows());
    modelBox.set(buildModel(dataBox.value));
    flushSync();
    expect(diagnostics).toEqual(["INTERACTION_DUPLICATE_KEY", "INTERACTION_DUPLICATE_KEY"]);
    previous?.dispose();
    modelBox.value?.dispose();
    destroy();
  });

  it("does not invoke deps during construction", () => {
    let calls = 0;
    const counting = <T>(value: T) => {
      calls++;
      return value;
    };
    const model = buildPointModel(rows);
    const { destroy } = withEffectRoot(() =>
      createSemanticKeyService({
        model: () => counting(model),
        assembled: () => counting(null),
        datumKey: () => counting("id" as const),
        data: () => counting(rows),
        spec: () => counting(null),
        sourceIdentity: (v) => {
          calls++;
          return String(v);
        },
        deliverDiagnostic: () => {
          calls++;
        },
      }),
    );
    expect(calls).toBe(0);
    destroy();
    model.dispose();
  });

  it("returns per-candidate semantic keys from lineage + row keys", () => {
    const model = buildPointModel(rows);
    const tracker = createSourceIdentityTracker();
    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => model,
        assembled: () => null,
        datumKey: () => "id",
        data: () => rows,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      }),
    );

    const keysById: PropertyKey[][] = [];
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      expect(candidate).not.toBeNull();
      keysById.push(service.candidateSemanticKeys(candidate!));
    }
    expect(keysById).toEqual([["a"], ["b"]]);

    destroy();
    model.dispose();
  });

  it("shares one candidate→keys projection across repeated full-store walks", () => {
    // Interval + selection + masks each used to re-walk lineage per candidate.
    // Within one model/key epoch, N full walks must not re-pay O(C×L).
    const model = buildPointModel(rows);
    const keysSpy = vi.spyOn(model.lineage, "keys");
    const tracker = createSourceIdentityTracker();
    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => model,
        assembled: () => null,
        datumKey: () => "id",
        data: () => rows,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      }),
    );

    const walkAll = () => {
      const out: PropertyKey[][] = [];
      for (let id = 0; id < model.candidates.size; id++) {
        const candidate = model.candidates.candidate(id);
        if (candidate === null) continue;
        out.push(service.candidateSemanticKeys(candidate));
      }
      return out;
    };

    const first = walkAll();
    const callsAfterFirstWalk = keysSpy.mock.calls.length;
    expect(first).toEqual([["a"], ["b"]]);
    // At least one lineage resolution per candidate on the cold walk.
    expect(callsAfterFirstWalk).toBeGreaterThanOrEqual(model.candidates.size);

    // Two more full walks (interval + selection consumers) must reuse the
    // shared projection — no additional lineage.keys work.
    expect(walkAll()).toEqual(first);
    expect(walkAll()).toEqual(first);
    expect(keysSpy.mock.calls.length).toBe(callsAfterFirstWalk);

    keysSpy.mockRestore();
    destroy();
    model.dispose();
  });

  it("rebuilds the candidate projection when the model is replaced", () => {
    const dataA = [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ];
    const dataB = [
      { id: "x", x: 3, y: 30 },
      { id: "y", x: 4, y: 40 },
    ];
    const dataBox = reactiveBox(dataA);
    const modelBox = reactiveBox(buildPointModel(dataA));
    const tracker = createSourceIdentityTracker();

    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => modelBox.value,
        assembled: () => null,
        datumKey: () => "id",
        data: () => dataBox.value,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      }),
    );

    const keysFor = (m: RenderModel) => {
      const out: PropertyKey[][] = [];
      for (let id = 0; id < m.candidates.size; id++) {
        const candidate = m.candidates.candidate(id);
        if (candidate === null) continue;
        out.push(service.candidateSemanticKeys(candidate));
      }
      return out;
    };

    expect(keysFor(modelBox.value)).toEqual([["a"], ["b"]]);

    const previous = modelBox.value;
    dataBox.set(dataB);
    modelBox.set(buildPointModel(dataB));
    flushSync();
    expect(keysFor(modelBox.value)).toEqual([["x"], ["y"]]);

    previous.dispose();
    modelBox.value.dispose();
    destroy();
  });

  it("does not project candidate keys until candidateSemanticKeys is read", () => {
    // Interval union / empty-focus short-circuits never call
    // candidateSemanticKeys — the shared projection must stay lazy so idle
    // plots do not pay O(C×L) on every model tick.
    const model = buildPointModel(rows);
    const keysSpy = vi.spyOn(model.lineage, "keys");
    const tracker = createSourceIdentityTracker();
    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => model,
        assembled: () => null,
        datumKey: () => "id",
        data: () => rows,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      }),
    );

    // Row-key resolution walks lineage once per candidate.
    expect(service.keyAt(0)).toBe("a");
    expect(service.keyAt(1)).toBe("b");
    const afterRowKeys = keysSpy.mock.calls.length;
    expect(afterRowKeys).toBeGreaterThanOrEqual(model.candidates.size);

    // No candidateSemanticKeys → no second projection walk.
    flushSync();
    expect(keysSpy.mock.calls.length).toBe(afterRowKeys);

    keysSpy.mockRestore();
    destroy();
    model.dispose();
  });

  it("resolves only the requested candidate on first candidateSemanticKeys call", () => {
    // Point-toggle (surface) hits one candidate. Eager full-store fill would
    // regress click cost from O(L) to O(C×L); cache must fill per id.
    const model = buildPointModel(rows);
    const keysSpy = vi.spyOn(model.lineage, "keys");
    const tracker = createSourceIdentityTracker();
    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => model,
        assembled: () => null,
        datumKey: () => "id",
        data: () => rows,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      }),
    );

    // Warm row keys first so subsequent lineage.keys calls are projection-only.
    expect(service.keyAt(0)).toBe("a");
    const afterRowKeys = keysSpy.mock.calls.length;

    const first = model.candidates.candidate(0);
    expect(first).not.toBeNull();
    expect(service.candidateSemanticKeys(first!)).toEqual(["a"]);
    // Exactly one extra lineage walk for the hit candidate — not a full store.
    expect(keysSpy.mock.calls.length).toBe(afterRowKeys + 1);

    keysSpy.mockRestore();
    destroy();
    model.dispose();
  });

  it("returns empty keys when model becomes null", () => {
    const model = buildPointModel(rows);
    const candidate = model.candidates.candidate(0);
    expect(candidate).not.toBeNull();
    const modelBox = reactiveBox<RenderModel | null>(model);
    const tracker = createSourceIdentityTracker();
    const { value: service, destroy } = withFlushedEffectRoot(() =>
      createSemanticKeyService({
        model: () => modelBox.value,
        assembled: () => null,
        datumKey: () => "id",
        data: () => rows,
        spec: () => null,
        sourceIdentity: (value) => tracker.sourceIdentity(value),
        deliverDiagnostic: () => {},
      }),
    );

    expect(service.candidateSemanticKeys(candidate!)).toEqual(["a"]);
    modelBox.set(null);
    flushSync();
    expect(service.candidateSemanticKeys(candidate!)).toEqual([]);

    destroy();
    model.dispose();
  });
});
