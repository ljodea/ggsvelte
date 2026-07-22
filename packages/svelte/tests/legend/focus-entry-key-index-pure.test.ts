import { describe, expect, it } from "vitest";

import type { SceneLegend } from "@ggsvelte/core";

import {
  buildLegendEntryKeyIndex,
  buildLegendEntryKeyIndexForPlot,
  type LegendKeyIndexAdapter,
} from "../../src/lib/legend/entry-key-index.js";
import { keysForLegendEntry } from "../../src/lib/legend/focus.js";
import { discreteFill, ramp } from "./focus-fixtures.js";

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

  it("indexes every aesthetic represented by a semantically merged guide", () => {
    const merged = { ...discreteFill, aesthetics: ["fill", "shape"] as const };
    const index = buildLegendEntryKeyIndex(
      adapter({
        legends: [merged],
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: {
          0: [
            { channel: "fill", field: "fillGroup" },
            { channel: "shape", field: "shapeGroup" },
          ],
        },
        lineages: { 1: [0, 1] },
        rows: {
          0: { fillGroup: "web", shapeGroup: "web" },
          1: { fillGroup: "other", shapeGroup: "web" },
        },
        keys: { 0: "both", 1: "shape-only" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["both", "shape-only"]);
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

  it("indexes first non-stat field per channel (skips leading stat, first non-stat wins)", () => {
    const index = buildLegendEntryKeyIndex(
      adapter({
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: {
          0: [
            { channel: "fill", field: "stat_fill", source: "stat" },
            { channel: "fill", field: "real_fill" },
            { channel: "fill", field: "second_fill" },
          ],
        },
        lineages: { 1: [0] },
        rows: { 0: { real_fill: "web", second_fill: "store", stat_fill: "ignored" } },
        keys: { 0: "k" },
      }),
    );
    // First non-stat mapping for fill is real_fill → "web" → entry 0.
    expect(index.get("fill:0")).toEqual(["k"]);
    expect(index.get("fill:1")).toEqual([]);
  });

  it("maps one candidate across field and scaled-constant discrete legends", () => {
    const colorLegend: SceneLegend = {
      type: "discrete",
      scale: "color",
      title: "Color",
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      swatchSize: 12,
      entries: [
        { label: "red", value: "red", color: "#f00" },
        { label: "blue", value: "blue", color: "#00f" },
      ],
    };
    const index = buildLegendEntryKeyIndex(
      adapter({
        legends: [discreteFill, colorLegend],
        candidates: [{ layerIndex: 0, lineage: 1, rowIndex: null }],
        fields: { 0: [{ channel: "fill", field: "channel" }] },
        scaledConstants: { 0: { color: "blue" } },
        lineages: { 1: [0, 1] },
        rows: {
          0: { channel: "web" },
          1: { channel: "store" },
        },
        keys: { 0: "a", 1: "b" },
      }),
    );
    expect(index.get("fill:0")).toEqual(["a"]);
    expect(index.get("fill:1")).toEqual(["b"]);
    // Scaled-constant color maps every lineage row to the same entry.
    expect(index.get("color:1")).toEqual(["a", "b"]);
    expect(index.get("color:0")).toEqual([]);
  });

  it("calls layerFields once per distinct layer and lineageKeys once per applicable candidate", () => {
    let layerFieldsCalls = 0;
    let lineageKeysCalls = 0;
    const dualLegend: SceneLegend = {
      type: "discrete",
      scale: "color",
      title: "C",
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      swatchSize: 12,
      entries: [{ label: "x", value: "x", color: "#000" }],
    };
    const clean: LegendKeyIndexAdapter = {
      legends: [discreteFill, dualLegend],
      candidates: () => [
        { layerIndex: 0, lineage: 1, rowIndex: null },
        { layerIndex: 0, lineage: 2, rowIndex: null },
        { layerIndex: 1, lineage: 3, rowIndex: null },
      ],
      layerFields() {
        layerFieldsCalls += 1;
        return [{ channel: "fill", field: "channel" }];
      },
      layerScaledConstant: (_layerIndex, channel) => (channel === "color" ? "x" : undefined),
      lineageKeys(lineageId) {
        lineageKeysCalls += 1;
        return lineageId === 1 ? [0] : lineageId === 2 ? [1] : [2];
      },
      row: (rowIndex) => (rowIndex === 2 ? { channel: "store" } : { channel: "web" }),
      semanticKey: (rowIndex) => (rowIndex === 0 ? "a" : rowIndex === 1 ? "b" : "c"),
    };
    const index = buildLegendEntryKeyIndex(clean);
    expect(index.get("fill:0")).toEqual(["a", "b"]);
    expect(index.get("color:0")).toEqual(["a", "b", "c"]);
    // One layerFields call per distinct layerIndex (0 and 1), not per candidate×legend.
    expect(layerFieldsCalls).toBe(2);
    // One lineageKeys call per candidate (all three apply at least one legend).
    expect(lineageKeysCalls).toBe(3);
  });

  it("does not call lineageKeys when no discrete legend applies to the candidate", () => {
    let lineageKeysCalls = 0;
    const index = buildLegendEntryKeyIndex({
      legends: [discreteFill],
      candidates: () => [{ layerIndex: 0, lineage: 99, rowIndex: null }],
      layerFields: () => [{ channel: "color", field: "other" }], // fill legend only
      lineageKeys: () => {
        lineageKeysCalls += 1;
        return [0];
      },
      row: () => ({ other: "x" }),
      semanticKey: () => "k",
    });
    expect(index.get("fill:0")).toEqual([]);
    expect(lineageKeysCalls).toBe(0);
  });
});
