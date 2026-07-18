import { describe, expect, it } from "vitest";

import type { SceneLegend } from "@ggsvelte/core";

import {
  buildInteractiveLegendEntries,
  buildLegendEntryKeyIndex,
  buildLegendEntryKeyIndexForPlot,
  clampLegendRovingIndex,
  findLegendPressedIdentity,
  keysForLegendEntry,
  legendIdentityKey,
  legendInteractionSource,
  moveLegendRovingIndex,
  planLegendCommittedReconcile,
  planLegendFocusDisabledClear,
  planLegendRovingFocusSync,
  reconcileLegendPreview,
  resolveLegendEmphasisKeys,
  resolveLegendPreviewKeysDecision,
  samePropertyKeySet,
  type InteractiveLegendEntry,
  type LegendKeyIndexAdapter,
} from "../../src/lib/legend/focus.js";

const discreteFill: SceneLegend = {
  type: "discrete",
  scale: "fill",
  title: "Channel",
  x: 10,
  y: 12,
  width: 124,
  height: 72,
  swatchSize: 12,
  entries: [
    { value: "web", label: "Web", color: "#123456", y: 18 },
    { value: "store", label: "Store", color: "#654321", y: 42 },
  ],
};

const discreteColor: SceneLegend = {
  type: "discrete",
  scale: "color",
  title: "Tone",
  x: 200,
  y: 12,
  width: 100,
  height: 48,
  swatchSize: 12,
  entries: [{ value: "a", label: "A", color: "#000", y: 18 }],
};

const ramp: SceneLegend = {
  type: "ramp",
  scale: "color",
  title: "Score",
  x: 10,
  y: 12,
  width: 80,
  height: 120,
  rampWidth: 12,
  rampHeight: 80,
  stops: [
    [0, "#000"],
    [1, "#fff"],
  ],
  ticks: [{ y: 0, label: "10" }],
};

describe("legendIdentityKey", () => {
  it("joins scale and entryIndex", () => {
    expect(legendIdentityKey({ scale: "fill", entryIndex: 2 })).toBe("fill:2");
  });
});

describe("samePropertyKeySet", () => {
  it("treats equal membership as equal regardless of order", () => {
    expect(samePropertyKeySet(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("treats duplicate-tolerant sets as equal", () => {
    expect(samePropertyKeySet(["a", "a"], ["a"])).toBe(true);
    expect(samePropertyKeySet(["a", "a"], ["a", "b"])).toBe(false);
  });

  it("distinguishes symbols with the same description", () => {
    const left = Symbol("row");
    const right = Symbol("row");
    expect(samePropertyKeySet([left], [right])).toBe(false);
    expect(samePropertyKeySet([left], [left])).toBe(true);
  });

  it("returns false for different lengths of unique keys", () => {
    expect(samePropertyKeySet(["a"], ["a", "b"])).toBe(false);
  });
});

describe("legendInteractionSource", () => {
  it("keeps pointer and touch", () => {
    expect(legendInteractionSource("pointer")).toBe("pointer");
    expect(legendInteractionSource("touch")).toBe("touch");
  });

  it("maps focus and keyboard to keyboard", () => {
    expect(legendInteractionSource("focus")).toBe("keyboard");
    expect(legendInteractionSource("keyboard")).toBe("keyboard");
  });
});

describe("buildInteractiveLegendEntries", () => {
  it("lists only discrete entries in legend then entry order", () => {
    const entries = buildInteractiveLegendEntries([discreteFill, ramp, discreteColor]);
    expect(entries.map((entry) => legendIdentityKey(entry.identity))).toEqual([
      "fill:0",
      "fill:1",
      "color:0",
    ]);
    expect(entries[0]?.entry.label).toBe("Web");
    expect(entries[2]?.entry.label).toBe("A");
  });

  it("returns empty for ramp-only legends", () => {
    expect(buildInteractiveLegendEntries([ramp])).toEqual([]);
  });
});

describe("keysForLegendEntry", () => {
  it("returns frozen keys or empty for missing identities", () => {
    const index = new Map<string, readonly PropertyKey[]>([["fill:0", Object.freeze(["a", "c"])]]);
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 0 })).toEqual(["a", "c"]);
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 1 })).toEqual([]);
  });
});

describe("buildLegendEntryKeyIndexForPlot", () => {
  it("returns an empty map when model is null", () => {
    expect(
      buildLegendEntryKeyIndexForPlot({
        model: null,
        semanticKey: () => "k",
      }).size,
    ).toBe(0);
  });

  it("indexes keys from id-ascending candidates with field mappings", () => {
    const candidates = [
      { layerIndex: 0, lineage: 0, rowIndex: 0 },
      { layerIndex: 0, lineage: 1, rowIndex: 1 },
    ];
    const index = buildLegendEntryKeyIndexForPlot({
      model: {
        scene: { legends: [discreteFill] },
        candidates: {
          size: candidates.length,
          candidate: (id) => candidates[id] ?? null,
        },
        layerFields: [[{ channel: "fill", field: "channel" }]],
        layerScaledConstants: [undefined],
        lineage: {
          keys: (lineageId) => (lineageId === 0 ? [0] : lineageId === 1 ? [1] : []),
        },
        row: (rowIndex) =>
          rowIndex === 0 ? { channel: "web" } : rowIndex === 1 ? { channel: "store" } : null,
      },
      semanticKey: (rowIndex) => (rowIndex === 0 ? "k-web" : rowIndex === 1 ? "k-store" : null),
    });
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 0 })).toEqual(["k-web"]);
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 1 })).toEqual(["k-store"]);
  });
});

describe("clampLegendRovingIndex", () => {
  it("returns 0 for empty lists and non-finite input", () => {
    expect(clampLegendRovingIndex(3, 0)).toBe(0);
    expect(clampLegendRovingIndex(Number.NaN, 4)).toBe(0);
  });

  it("clamps into [0, count)", () => {
    expect(clampLegendRovingIndex(-2, 4)).toBe(0);
    expect(clampLegendRovingIndex(1, 4)).toBe(1);
    expect(clampLegendRovingIndex(99, 4)).toBe(3);
  });
});

describe("moveLegendRovingIndex", () => {
  it("returns 0 for empty lists", () => {
    expect(moveLegendRovingIndex(0, "ArrowRight", 0)).toBe(0);
  });

  it("moves without wrapping", () => {
    expect(moveLegendRovingIndex(0, "ArrowRight", 3)).toBe(1);
    expect(moveLegendRovingIndex(2, "ArrowRight", 3)).toBe(2);
    expect(moveLegendRovingIndex(0, "ArrowLeft", 3)).toBe(0);
    expect(moveLegendRovingIndex(2, "ArrowUp", 3)).toBe(1);
    expect(moveLegendRovingIndex(1, "ArrowDown", 3)).toBe(2);
  });

  it("handles Home, End, and unknown keys", () => {
    expect(moveLegendRovingIndex(2, "Home", 4)).toBe(0);
    expect(moveLegendRovingIndex(0, "End", 4)).toBe(3);
    expect(moveLegendRovingIndex(1, "Tab", 4)).toBe(1);
    expect(moveLegendRovingIndex(99, "Tab", 4)).toBe(3);
  });
});

describe("findLegendPressedIdentity", () => {
  const entries = buildInteractiveLegendEntries([discreteFill, discreteColor]);
  const keyIndex = new Map<string, readonly PropertyKey[]>([
    ["fill:0", Object.freeze(["a", "c"])],
    ["fill:1", Object.freeze(["b"])],
    ["color:0", Object.freeze(["a", "c"])], // identical key set to fill:0
  ]);

  it("returns null for empty emphasis", () => {
    expect(
      findLegendPressedIdentity({
        keys: [],
        entries,
        keyIndex,
        committed: null,
      }),
    ).toBeNull();
  });

  it("prefers committed identity when its keys still match", () => {
    expect(
      findLegendPressedIdentity({
        keys: ["c", "a"],
        entries,
        keyIndex,
        committed: {
          identity: { scale: "fill", entryIndex: 0 },
          keys: ["a", "c"],
        },
      }),
    ).toEqual({ scale: "fill", entryIndex: 0 });
  });

  it("returns null when multiple entries match without a committed identity", () => {
    expect(
      findLegendPressedIdentity({
        keys: ["a", "c"],
        entries,
        keyIndex,
        committed: null,
      }),
    ).toBeNull();
  });

  it("returns the unique matching entry for external emphasis", () => {
    expect(
      findLegendPressedIdentity({
        keys: ["b"],
        entries,
        keyIndex,
        committed: null,
      }),
    ).toEqual({ scale: "fill", entryIndex: 1 });
  });

  it("ignores committed identity when its keys no longer match", () => {
    expect(
      findLegendPressedIdentity({
        keys: ["b"],
        entries,
        keyIndex,
        committed: {
          identity: { scale: "fill", entryIndex: 0 },
          keys: ["a", "c"],
        },
      }),
    ).toEqual({ scale: "fill", entryIndex: 1 });
  });
});

function adapter(partial: {
  legends?: readonly SceneLegend[];
  candidates?: readonly {
    layerIndex: number;
    lineage: number;
    rowIndex: number | null;
  }[];
  fields?: Record<number, readonly { channel: string; field: string; source?: "stat" }[]>;
  scaledConstants?: Record<number, Record<string, unknown>>;
  lineages?: Record<number, readonly number[]>;
  rows?: Record<number, Record<string, unknown> | null>;
  keys?: Record<number, PropertyKey | null | undefined>;
}): LegendKeyIndexAdapter {
  const candidates = partial.candidates ?? [];
  const fields = partial.fields ?? {};
  const scaledConstants = partial.scaledConstants ?? {};
  const lineages = partial.lineages ?? {};
  const rows = partial.rows ?? {};
  const keys = partial.keys ?? {};
  return {
    legends: partial.legends ?? [discreteFill],
    candidates: () => candidates,
    layerFields: (layerIndex) => fields[layerIndex],
    layerScaledConstant: (layerIndex, channel) => scaledConstants[layerIndex]?.[channel],
    lineageKeys: (lineageId) => lineages[lineageId] ?? [],
    row: (rowIndex) => (rows[rowIndex] as Record<string, never> | null) ?? null,
    semanticKey: (rowIndex) => keys[rowIndex],
  };
}

describe("buildLegendEntryKeyIndex", () => {
  it("pre-seeds empty buckets for discrete entries and ignores ramps", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({ legends: [discreteFill, ramp], candidates: [] }),
    );
    expect([...index.keys()]).toEqual(["fill:0", "fill:1"]);
    expect(index.get("fill:0")).toEqual([]);
    expect(index.get("fill:1")).toEqual([]);
  });

  it("maps encoded values to first-seen unique semantic keys in lineage order", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        lineages: { 1: [2, 0, 2] },
        rows: {
          0: { channel: "web" },
          2: { channel: "web" },
        },
        keys: { 0: "c", 2: "a" },
      }),
    );
    // Set insertion from lineage: 2 then 0; first-seen unique keys preserve that order
    expect(index.get("fill:0")).toEqual(["a", "c"]);
    expect(index.get("fill:1")).toEqual([]);
  });

  it("appends candidate rowIndex after lineage rows when missing", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: 5 }],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        lineages: { 1: [0] },
        rows: {
          0: { channel: "web" },
          5: { channel: "web" },
        },
        keys: { 0: "first", 5: "appended" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["first", "appended"]);
  });

  it("skips stat mappings, null rows, and null keys", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [
          { layerIndex: 0, lineage: 1, rowIndex: null },
          { layerIndex: 1, lineage: 2, rowIndex: null },
        ],
        fields: {
          0: [{ channel: "fill", field: "channel", source: "stat" }],
          1: [{ channel: "fill", field: "channel" }],
        },
        lineages: { 1: [0], 2: [1, 2, 3] },
        rows: {
          1: null,
          2: { channel: "web" },
          3: { channel: "web" },
        },
        keys: { 1: "x", 2: null, 3: "kept" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["kept"]);
  });

  it("dedupes repeated candidates for the same scale/layer/field/row", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [
          { layerIndex: 0, lineage: 1, rowIndex: 0 },
          { layerIndex: 0, lineage: 1, rowIndex: 0 },
        ],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        lineages: { 1: [0] },
        rows: { 0: { channel: "store" } },
        keys: { 0: "b" },
      }),
    );
    expect(index.get("fill:1")).toEqual(["b"]);
    expect(index.get("fill:0")).toEqual([]);
  });

  it("matches Date, NaN, and -0 via legendValueEqual and isolates scales", () => {
    const dateLegend: SceneLegend = {
      type: "discrete",
      scale: "color",
      title: "When",
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      swatchSize: 12,
      entries: [
        { value: new Date("2020-01-01T00:00:00.000Z"), label: "d", color: "#0", y: 0 },
        { value: Number.NaN, label: "nan", color: "#1", y: 12 },
        { value: 0, label: "zero", color: "#2", y: 24 },
      ],
    };
    const index = buildLegendEntryKeyIndex(
      adapter({
        legends: [discreteFill, dateLegend],
        candidates: [
          { layerIndex: 0, lineage: 1, rowIndex: null },
          { layerIndex: 1, lineage: 2, rowIndex: null },
        ],
        fields: {
          0: [{ channel: "fill", field: "channel" }],
          1: [{ channel: "color", field: "when" }],
        },
        lineages: { 1: [0], 2: [10, 11, 12] },
        rows: {
          0: { channel: "store" },
          10: { when: new Date("2020-01-01T00:00:00.000Z") },
          11: { when: Number.NaN },
          12: { when: -0 },
        },
        keys: { 0: "fill-store", 10: "date-k", 11: "nan-k", 12: "zero-k" },
      }),
    );
    expect(index.get("fill:1")).toEqual(["fill-store"]);
    expect(index.get("color:0")).toEqual(["date-k"]);
    expect(index.get("color:1")).toEqual(["nan-k"]);
    expect(index.get("color:2")).toEqual(["zero-k"]);
    // fill scale must not absorb color keys
    expect(index.get("fill:0")).toEqual([]);
  });

  it("leaves unmatched entry values empty", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        lineages: { 1: [0] },
        rows: { 0: { channel: "unknown" } },
        keys: { 0: "orphan" },
      }),
    );
    expect(index.get("fill:0")).toEqual([]);
    expect(index.get("fill:1")).toEqual([]);
  });

  it("supports multi-layer membership on the same scale", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [
          { layerIndex: 0, lineage: 1, rowIndex: null },
          { layerIndex: 1, lineage: 2, rowIndex: null },
        ],
        fields: {
          0: [{ channel: "fill", field: "channel" }],
          1: [{ channel: "fill", field: "channel" }],
        },
        lineages: { 1: [0], 2: [1] },
        rows: {
          0: { channel: "web" },
          1: { channel: "web" },
        },
        keys: { 0: "layer0", 1: "layer1" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["layer0", "layer1"]);
  });

  it("preserves Symbol semantic keys", () => {
    const sym = Symbol("row-a");
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        lineages: { 1: [0] },
        rows: { 0: { channel: "web" } },
        keys: { 0: sym },
      }),
    );
    expect(index.get("fill:0")).toEqual([sym]);
  });

  it("maps scaled-constant layers onto the matching legend entry", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [
          { layerIndex: 0, lineage: 1, rowIndex: null },
          { layerIndex: 0, lineage: 2, rowIndex: null },
        ],
        // No field mapping — constant-only layer.
        scaledConstants: { 0: { fill: "web" } },
        lineages: { 1: [0], 2: [1] },
        rows: { 0: {}, 1: {} },
        keys: { 0: "const-a", 1: "const-b" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["const-a", "const-b"]);
    expect(index.get("fill:1")).toEqual([]);
  });

  it("prefers the first legend entry when values are legendValueEqual", () => {
    // 0 and -0 are equal under legendValueEqual; findIndex / token lookup must
    // both resolve to the earliest entry (index 0), not the later -0 swatch.
    const dualZero: SceneLegend = {
      type: "discrete",
      scale: "fill",
      title: "Zero",
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      swatchSize: 12,
      entries: [
        { value: 0, label: "pos", color: "#0", y: 0 },
        { value: -0, label: "neg", color: "#1", y: 12 },
      ],
    };
    const index = buildLegendEntryKeyIndex(
      adapter({
        legends: [dualZero],
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: { 0: [{ channel: "fill", field: "v" }] },
        lineages: { 1: [0, 1] },
        rows: { 0: { v: -0 }, 1: { v: 0 } },
        keys: { 0: "neg-row", 1: "pos-row" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["neg-row", "pos-row"]);
    expect(index.get("fill:1")).toEqual([]);
  });

  // Entry matching uses a pre-built value→index Map (O(E) prep + O(1) lookup)
  // rather than findIndex over entries inside the candidate/row walk. That is a
  // structural property of the implementation; perf-regression coverage lives
  // in the bench-smoke job, not a wall-clock unit assertion (which flakes under
  // CI contention). Behavioral coverage at scale is retained here.
  it("indexes many discrete entries across many rows in first-seen order", () => {
    const entryCount = 200;
    const rowsPerEntry = 5;
    const entries = Array.from({ length: entryCount }, (_, i) => ({
      value: `cat-${i}`,
      label: `C${i}`,
      color: "#000",
      y: i * 12,
    }));
    const multi: SceneLegend = {
      type: "discrete",
      scale: "fill",
      title: "Many",
      x: 0,
      y: 0,
      width: 40,
      height: entryCount * 12,
      swatchSize: 12,
      entries,
    };
    const rowCount = entryCount * rowsPerEntry;
    const rows: Record<number, Record<string, unknown>> = {};
    const keys: Record<number, PropertyKey> = {};
    const lineage: number[] = [];
    for (let i = 0; i < rowCount; i++) {
      const entryIndex = i % entryCount;
      rows[i] = { channel: `cat-${entryIndex}` };
      keys[i] = `k-${i}`;
      lineage.push(i);
    }
    const index = buildLegendEntryKeyIndex(
      adapter({
        legends: [multi],
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        lineages: { 1: lineage },
        rows,
        keys,
      }),
    );
    expect(index.size).toBe(entryCount);
    // First entry collects every rowsPerEntry-th key starting at 0
    expect(index.get("fill:0")).toEqual(
      Array.from({ length: rowsPerEntry }, (_, r) => `k-${r * entryCount}`),
    );
    expect(index.get(`fill:${entryCount - 1}`)).toEqual(
      Array.from({ length: rowsPerEntry }, (_, r) => `k-${r * entryCount + (entryCount - 1)}`),
    );
    // Unmatched empty buckets still pre-seeded (every entry present)
    for (let i = 0; i < entryCount; i++) {
      expect(index.get(`fill:${i}`)).toHaveLength(rowsPerEntry);
    }
  });
});

describe("resolveLegendPreviewKeysDecision", () => {
  it("clears when the entry has no keys", () => {
    expect(resolveLegendPreviewKeysDecision({ keys: [], entrySource: "pointer" })).toEqual({
      type: "clear",
    });
  });

  it("sets keys and maps entrySource to InteractionSource", () => {
    expect(resolveLegendPreviewKeysDecision({ keys: ["a"], entrySource: "pointer" })).toEqual({
      type: "set",
      keys: ["a"],
      source: "pointer",
    });
    expect(resolveLegendPreviewKeysDecision({ keys: ["a", "b"], entrySource: "focus" })).toEqual({
      type: "set",
      keys: ["a", "b"],
      source: "keyboard",
    });
  });
});

describe("resolveLegendEmphasisKeys", () => {
  it("drops local/preview emphasis when legend focus is disabled", () => {
    expect(
      resolveLegendEmphasisKeys({
        legendFocusEnabled: false,
        previewKeys: ["p"],
        controllerKeys: null,
        localKeys: ["l"],
      }),
    ).toEqual([]);
    expect(
      resolveLegendEmphasisKeys({
        legendFocusEnabled: false,
        previewKeys: ["p"],
        controllerKeys: ["c"],
        localKeys: ["l"],
      }),
    ).toEqual(["c"]);
  });

  it("prefers preview then controller then local when enabled", () => {
    expect(
      resolveLegendEmphasisKeys({
        legendFocusEnabled: true,
        previewKeys: ["p"],
        controllerKeys: ["c"],
        localKeys: ["l"],
      }),
    ).toEqual(["p"]);
    expect(
      resolveLegendEmphasisKeys({
        legendFocusEnabled: true,
        previewKeys: null,
        controllerKeys: null,
        localKeys: ["l"],
      }),
    ).toEqual(["l"]);
  });
});

describe("reconcileLegendPreview", () => {
  const entries = buildInteractiveLegendEntries([discreteFill]);
  const keyIndex = new Map<string, readonly PropertyKey[]>([
    ["fill:0", Object.freeze(["a", "c"])],
    ["fill:1", Object.freeze(["b"])],
  ]);

  it("clears when the entry disappears or has empty keys", () => {
    expect(
      reconcileLegendPreview({
        preview: { identity: { scale: "fill", entryIndex: 9 }, keys: ["x"] },
        entries,
        keyIndex,
      }),
    ).toBeNull();
    const emptyIndex = new Map<string, readonly PropertyKey[]>([["fill:0", Object.freeze([])]]);
    expect(
      reconcileLegendPreview({
        preview: { identity: { scale: "fill", entryIndex: 0 }, keys: ["a"] },
        entries,
        keyIndex: emptyIndex,
      }),
    ).toBeNull();
  });

  it("refreshes keys when membership changes for the same identity", () => {
    const next = reconcileLegendPreview({
      preview: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
      entries,
      keyIndex,
    });
    expect(next).toEqual({ identity: { scale: "fill", entryIndex: 0 }, keys: ["a", "c"] });
  });

  it("keeps the same object when keys still match", () => {
    const preview = { identity: { scale: "fill", entryIndex: 0 }, keys: ["a", "c"] as const };
    expect(
      reconcileLegendPreview({
        preview,
        entries,
        keyIndex,
      }),
    ).toBe(preview);
  });
});

describe("InteractiveLegendEntry typing smoke", () => {
  it("exposes identity and entry for host action builders", () => {
    const entries: InteractiveLegendEntry[] = buildInteractiveLegendEntries([discreteFill]);
    const first = entries[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const action = {
      identity: first.identity,
      entry: first.entry,
      source: "keyboard" as const,
    };
    expect(action.entry.label).toBe("Web");
  });
});

describe("planLegendCommittedReconcile", () => {
  const entries = buildInteractiveLegendEntries([discreteFill]);
  const keyIndex = new Map<string, readonly PropertyKey[]>([
    ["fill:0", Object.freeze(["a", "c"])],
    ["fill:1", Object.freeze(["b"])],
  ]);

  it("noops when nothing is committed", () => {
    expect(
      planLegendCommittedReconcile({
        committed: null,
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 2,
      }),
    ).toEqual({ type: "noop" });
  });

  it("noops when live entry keys still match the commit", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["a", "c"] },
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 2,
      }),
    ).toEqual({ type: "noop" });
  });

  it("clears commit only on controller path when keys reshuffle", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
        entries,
        keyIndex,
        usesLocalEmphasis: false,
        localEmphasisCount: 0,
      }),
    ).toEqual({ type: "clear-committed" });
  });

  it("clears commit only when local emphasis is already empty", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 0,
      }),
    ).toEqual({ type: "clear-committed" });
  });

  it("clears commit and local-emits when local emphasis is active", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 0 }, keys: ["stale"] },
        entries,
        keyIndex,
        usesLocalEmphasis: true,
        localEmphasisCount: 2,
      }),
    ).toEqual({ type: "clear-committed-local-emit" });
  });

  it("treats a missing entry as key mismatch (empty keys)", () => {
    expect(
      planLegendCommittedReconcile({
        committed: { identity: { scale: "fill", entryIndex: 9 }, keys: ["x"] },
        entries,
        keyIndex,
        usesLocalEmphasis: false,
        localEmphasisCount: 0,
      }),
    ).toEqual({ type: "clear-committed" });
  });
});

describe("planLegendFocusDisabledClear", () => {
  it("noops while legend focus remains enabled", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: true,
        hasPreview: true,
        hasCommitted: true,
        hasLocalEmphasis: true,
        usesLocalEmphasis: true,
      }),
    ).toEqual({ type: "noop" });
  });

  it("noops when focus is disabled but host legend state is already empty", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: false,
        hasPreview: false,
        hasCommitted: false,
        hasLocalEmphasis: false,
        usesLocalEmphasis: true,
      }),
    ).toEqual({ type: "noop" });
  });

  it("clears host state without local keys on the controller path", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: false,
        hasPreview: true,
        hasCommitted: false,
        hasLocalEmphasis: false,
        usesLocalEmphasis: false,
      }),
    ).toEqual({ type: "clear-host" });
  });

  it("clears host state and local emphasis when chart-local", () => {
    expect(
      planLegendFocusDisabledClear({
        legendFocusEnabled: false,
        hasPreview: false,
        hasCommitted: true,
        hasLocalEmphasis: true,
        usesLocalEmphasis: true,
      }),
    ).toEqual({ type: "clear-host-local" });
  });
});

describe("planLegendRovingFocusSync", () => {
  it("noops when the roving index is already clamped and nothing is focused", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 1,
        entryCount: 3,
        focusedIndex: null,
      }),
    ).toEqual({ type: "noop", nextIndex: 1 });
  });

  it("clamps roving without refocus when focus is outside the legend", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 9,
        entryCount: 3,
        focusedIndex: null,
      }),
    ).toEqual({ type: "clamp-roving", nextIndex: 2 });
  });

  it("clamps without refocus when the entry list is empty", () => {
    // count === 0 still clamps roving to 0, but skips DOM refocus even if
    // focusedIndex is set (host returns before the focus microtask).
    expect(
      planLegendRovingFocusSync({
        currentRoving: 2,
        entryCount: 0,
        focusedIndex: 1,
      }),
    ).toEqual({ type: "clamp-roving", nextIndex: 0 });
    expect(
      planLegendRovingFocusSync({
        currentRoving: 0,
        entryCount: 0,
        focusedIndex: 1,
      }),
    ).toEqual({ type: "noop", nextIndex: 0 });
  });

  it("refocuses the clamped focused index when a target is focused", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 0,
        entryCount: 3,
        focusedIndex: 5,
      }),
    ).toEqual({ type: "refocus", nextIndex: 0, returnIndex: 2 });
  });

  it("characterizes NaN focusedIndex as refocus entry 0 (dataset parse miss)", () => {
    // Host does Number(dataset.index); missing/non-numeric yields NaN, not null.
    expect(
      planLegendRovingFocusSync({
        currentRoving: 1,
        entryCount: 3,
        focusedIndex: Number.NaN,
      }),
    ).toEqual({ type: "refocus", nextIndex: 1, returnIndex: 0 });
  });

  it("refocuses and clamps roving together when both are out of range", () => {
    expect(
      planLegendRovingFocusSync({
        currentRoving: 8,
        entryCount: 2,
        focusedIndex: 1,
      }),
    ).toEqual({ type: "refocus", nextIndex: 1, returnIndex: 1 });
  });
});
