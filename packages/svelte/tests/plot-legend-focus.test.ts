import { describe, expect, it } from "vitest";

import type { SceneLegend } from "@ggsvelte/core";

import {
  buildInteractiveLegendEntries,
  buildLegendEntryKeyIndex,
  clampLegendRovingIndex,
  findLegendPressedIdentity,
  keysForLegendEntry,
  legendIdentityKey,
  legendInteractionSource,
  moveLegendRovingIndex,
  samePropertyKeySet,
  type InteractiveLegendEntry,
  type LegendKeyIndexAdapter,
} from "../src/lib/plot-legend-focus.js";

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
  lineages?: Record<number, readonly number[]>;
  rows?: Record<number, Record<string, unknown> | null>;
  keys?: Record<number, PropertyKey | null | undefined>;
}): LegendKeyIndexAdapter {
  const candidates = partial.candidates ?? [];
  const fields = partial.fields ?? {};
  const lineages = partial.lineages ?? {};
  const rows = partial.rows ?? {};
  const keys = partial.keys ?? {};
  return {
    legends: partial.legends ?? [discreteFill],
    candidates: () => candidates,
    layerFields: (layerIndex) => fields[layerIndex],
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
