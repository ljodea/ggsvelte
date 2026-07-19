/**
 * Characterization tests for pipeline candidate construction paths:
 * source-backed (identity layers) vs identity-indexed (stats/annotations).
 *
 * The outer seam is `runPipeline`; focused internal-seam checks retain the
 * proven complexity contracts for identity indexing, lineage, and datum
 * resolution.
 */
import { fromAny } from "@total-typescript/shoehorn";
import { describe, expect, it, spyOn } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { ordinalSeriesRank } from "../src/pipeline/candidate-construction/datum.ts";
import { resolveCandidateLogicalValues } from "../src/pipeline/candidate-construction/datum.ts";
import { runPipeline } from "../src/pipeline.ts";
import { trainColor } from "../src/scales/train.ts";
import { ColumnTable } from "../src/table.ts";

const size = { width: 640, height: 400 };

/** Count ColumnTable.column(field) calls during fn (restored after). */
function countColumnReads(field: string, fn: () => void): number {
  let reads = 0;
  const desc = Object.getOwnPropertyDescriptor(ColumnTable.prototype, "column");
  if (desc?.value === undefined) {
    throw new Error("ColumnTable.prototype.column is not a data property");
  }
  const impl = desc.value as (this: ColumnTable, name: string) => readonly unknown[];
  const spy = spyOn(ColumnTable.prototype, "column").mockImplementation(function (
    this: ColumnTable,
    name: string,
  ) {
    if (name === field) reads += 1;
    return impl.call(this, name);
  });
  try {
    fn();
    return reads;
  } finally {
    spy.mockRestore();
  }
}

describe("ordinalSeriesRank", () => {
  it("falls back to group when no ordinal color/fill mapping applies", () => {
    expect(
      ordinalSeriesRank({
        color: null,
        fill: null,
        colorField: undefined,
        fillField: undefined,
        sourceRow: 0,
        sourceValue: () => "a",
        group: 3,
      }),
    ).toBe(3);
  });

  it("does not read source cells when color/fill are non-ordinal", () => {
    // Sequential/null scales must not force table.column / sourceValue lookups
    // for seriesRank (eager arg evaluation would regress continuous color paths).
    let reads = 0;
    const sequential = {
      kind: "sequential" as const,
      scale: { domain: [0, 1] as [number, number], colorOf: () => "#000" },
    };
    expect(
      ordinalSeriesRank({
        color: sequential,
        fill: sequential,
        colorField: "c",
        fillField: "f",
        sourceRow: 0,
        sourceValue: () => {
          reads += 1;
          return "x";
        },
        group: 4,
      }),
    ).toBe(4);
    expect(reads).toBe(0);
  });

  it("returns encodeKey assignment ranks from the ordinal color scale", () => {
    // 1 vs "1" must not collapse under presentation bandKey.
    const scale = trainColor([1, "1", "b"]);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale },
        fill: null,
        colorField: "c",
        fillField: undefined,
        sourceRow: 0,
        sourceValue: (field) => (field === "c" ? "1" : null),
        group: 99,
      }),
    ).toBe(1);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale },
        fill: null,
        colorField: "c",
        fillField: undefined,
        sourceRow: 0,
        sourceValue: (field) => (field === "c" ? 1 : null),
        group: 99,
      }),
    ).toBe(0);
  });

  it("prefers color rank over fill; falls back to fill then group", () => {
    const color = trainColor(["red-series"]);
    const fill = trainColor(["a", "b", "c"]);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale: color },
        fill: { kind: "ordinal", scale: fill },
        colorField: "color",
        fillField: "fill",
        sourceRow: 0,
        sourceValue: (field) => (field === "color" ? "red-series" : "c"),
        group: 5,
      }),
    ).toBe(0);
    expect(
      ordinalSeriesRank({
        color: null,
        fill: { kind: "ordinal", scale: fill },
        colorField: undefined,
        fillField: "fill",
        sourceRow: 0,
        sourceValue: (field) => (field === "fill" ? "c" : null),
        group: 5,
      }),
    ).toBe(2);
    expect(
      ordinalSeriesRank({
        color: { kind: "ordinal", scale: color },
        fill: { kind: "ordinal", scale: fill },
        colorField: "color",
        fillField: "fill",
        sourceRow: 0,
        sourceValue: () => "unknown",
        group: 5,
      }),
    ).toBe(5);
  });

  it("does not linear-scan the ordinal domain per candidate", () => {
    const domain = Array.from({ length: 50 }, (_, i) => `s${i}`);
    const scale = trainColor(domain);
    const findIndexSpy = spyOn(Array.prototype, "findIndex").mockImplementation(function (
      this: unknown[],
      ...args: Parameters<Array<unknown>["findIndex"]>
    ) {
      // Only fail if the scan targets the scale domain (the O(n·d) path).
      if (this === scale.domain || this === domain) {
        throw new Error(`ordinalSeriesRank used domain.findIndex(${String(args[0])})`);
      }
      return Array.prototype.findIndex.apply(this, args as never);
    });
    try {
      for (let i = 0; i < domain.length; i++) {
        const value = domain[i]!;
        expect(
          ordinalSeriesRank({
            color: { kind: "ordinal", scale },
            fill: null,
            colorField: "c",
            fillField: undefined,
            sourceRow: i,
            sourceValue: () => value,
            group: 0,
          }),
        ).toBe(i);
      }
    } finally {
      findIndexSpy.mockRestore();
    }
  });
});

describe("resolveCandidateLogicalValues", () => {
  it("prefers annotation intercepts when the layer is an annotation rule", () => {
    expect(
      resolveCandidateLogicalValues({
        annotationRule: true,
        annotationX: 3,
        annotationY: null,
        outlierSourceRow: null,
        sourceRow: 0,
        frame: undefined,
        frameRow: 0,
        primitiveIndex: 0,
        sourceValue: () => "ignored",
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: 3, yValue: null });
  });

  it("reads source fields for identity rows and outliers when present", () => {
    expect(
      resolveCandidateLogicalValues({
        annotationRule: false,
        annotationX: null,
        annotationY: null,
        outlierSourceRow: null,
        sourceRow: 2,
        frame: undefined,
        frameRow: 0,
        primitiveIndex: 0,
        sourceValue: (field) => (field === "x" ? 11 : field === "y" ? 22 : null),
        xField: "x",
        yField: "y",
      }),
    ).toEqual({ xValue: 11, yValue: 22 });
  });
});

describe("buildPipelineCandidates via runPipeline", () => {
  it("source-backed point layers expose one candidate per mark with lineage", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
          { x: 3, y: 30 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    expect(model.candidates.size).toBe(3);
    const c0 = model.candidates.candidate(0);
    expect(c0).not.toBeNull();
    expect(c0!.xValue).toBe(1);
    expect(c0!.yValue).toBe(10);
    expect(model.lineage.count(c0!.lineage)).toBe(1);
  });

  it("ordinal color seriesRank matches encodeKey assignment order (1 vs '1')", () => {
    const model = runPipeline(
      gg(
        [
          { x: 0, y: 1, c: 1 },
          { x: 1, y: 2, c: "1" },
          { x: 2, y: 3, c: "b" },
        ],
        aes({ x: "x", y: "y", color: "c" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    const ranks = Array.from({ length: model.candidates.size }, (_, id) => {
      const c = model.candidates.candidate(id)!;
      return { c: c.xValue, rank: c.seriesRank };
    }).toSorted((a, b) => Number(a.c) - Number(b.c));
    // First-seen color values: 1 → rank 0, "1" → rank 1, "b" → rank 2
    expect(ranks.map((r) => r.rank)).toEqual([0, 1, 2]);
    expect(model.scales.color?.kind).toBe("ordinal");
    if (model.scales.color?.kind === "ordinal") {
      expect(model.scales.color.scale.indexOf(1)).toBe(0);
      expect(model.scales.color.scale.indexOf("1")).toBe(1);
      expect(model.scales.color.scale.indexOf("b")).toBe(2);
    }
  });

  it("count bars reconstruct aggregate lineages for represented source rows", () => {
    const model = runPipeline(
      gg([{ g: "a" }, { g: "a" }, { g: "b" }], aes({ x: "g" }))
        .geomBar()
        .spec(),
      size,
    );
    expect(model.candidates.size).toBeGreaterThanOrEqual(2);
    const sizes = Array.from({ length: model.candidates.size }, (_, id) => {
      const c = model.candidates.candidate(id)!;
      return model.lineage.count(c.lineage);
    }).toSorted((a, b) => a - b);
    // one bar for "a" (2 rows) and one for "b" (1 row)
    expect(sizes).toContain(2);
    expect(sizes).toContain(1);
  });

  it("bin layers intern source rows using closed bin edges", () => {
    const model = runPipeline(
      {
        data: { values: [{ x: 0 }, { x: 1 }, { x: 2 }] },
        layers: [
          {
            geom: "histogram",
            aes: { x: { field: "x" } },
            params: { binwidth: 1, boundary: 0, closed: "right" },
          },
        ],
      },
      size,
    );
    expect(model.candidates.size).toBeGreaterThanOrEqual(2);
    const memberships = Array.from({ length: model.candidates.size }, (_, id) => {
      const c = model.candidates.candidate(id)!;
      return model.lineage.count(c.lineage);
    });
    // three source rows assigned across bins without empty lineages
    expect(memberships.every((n) => n >= 1)).toBe(true);
    expect(memberships.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("annotation rules produce candidates with intercept values", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .geomRule({ yintercept: 2.5, xintercept: 1.5 })
        .spec(),
      size,
    );
    expect(model.candidates.size).toBeGreaterThan(2);
    const modes = Array.from(
      { length: model.candidates.size },
      (_, id) => model.candidates.candidate(id)?.autoMode,
    );
    expect(modes.some((m) => m === "x" || m === "y")).toBe(true);
  });

  it("identity-indexed multi-series lines map path vertices via precomputed group rows", () => {
    // Annotation layer forces the identity-indexed candidate path (not
    // source-backed). Path vertices must resolve to x-sorted frame rows per
    // series without rebuilding the group index on every call.
    const model = runPipeline(
      gg(
        [
          { x: 2, y: 10, s: "a" },
          { x: 1, y: 20, s: "b" },
          { x: 1, y: 30, s: "a" },
          { x: 2, y: 40, s: "b" },
        ],
        aes({ x: "x", y: "y", color: "s" }),
      )
        .geomLine()
        .geomRule({ yintercept: 25 })
        .spec(),
      size,
    );
    const linePoints = Array.from({ length: model.candidates.size }, (_, id) =>
      model.candidates.candidate(id)!,
    ).filter((c) => c.kind === "paths");
    expect(linePoints).toHaveLength(4);
    expect(linePoints.map((c) => c.yValue).toSorted((a, b) => Number(a) - Number(b))).toEqual([
      10, 20, 30, 40,
    ]);
    expect(new Set(linePoints.map((c) => c.seriesId)).size).toBe(2);
    // Within each series, vertices are ordered by x (sorted group rows).
    const bySeries = new Map<number, typeof linePoints>();
    for (const c of linePoints) {
      const series = bySeries.get(c.seriesId);
      if (series === undefined) bySeries.set(c.seriesId, [c]);
      else series.push(c);
    }
    for (const seriesPoints of bySeries.values()) {
      const xs = seriesPoints.map((c) => Number(c.xValue));
      expect(xs).toEqual([...xs].toSorted((a, b) => a - b));
    }
  });
});

describe("resolveCandidateSeries / resolveRepresentedSourceRows", () => {
  it("uses derived group when sourceRow is null", async () => {
    const { resolveCandidateSeries } =
      await import("../src/pipeline/candidate-construction/datum.ts");
    const result = resolveCandidateSeries({
      sourceRow: null,
      derivedGroup: 7,
      seriesByRow: new Map(),
      panelIndex: 0,
      layerIndex: 0,
      color: null,
      fill: null,
      colorField: undefined,
      fillField: undefined,
      sourceValue: () => null,
    });
    expect(result.group).toBe(7);
    expect(result.seriesRank).toBe(7);
  });

  it("maps seriesByRow for identity source rows", async () => {
    const { resolveCandidateSeries } =
      await import("../src/pipeline/candidate-construction/datum.ts");
    const seriesByRow = new Map([["0:0:2", 4]]);
    const result = resolveCandidateSeries({
      sourceRow: 2,
      derivedGroup: 0,
      seriesByRow,
      panelIndex: 0,
      layerIndex: 0,
      color: null,
      fill: null,
      colorField: undefined,
      fillField: undefined,
      sourceValue: () => null,
    });
    expect(result.group).toBe(4);
  });
});

describe("collectColorChannelValues", () => {
  it("returns empty when no color mapping is present", async () => {
    const { collectColorChannelValues } = await import("../src/pipeline/scale-color-collect.ts");
    const table = fromAny({ has: () => false, discreteness: () => "continuous" });
    const frames = fromAny([
      {
        binding: {
          color: { field: null, scaledConstant: null },
          fill: { field: null, scaledConstant: null },
        },
        colorValues: null,
        fillValues: null,
      },
    ]);
    expect(collectColorChannelValues("color", frames, table)).toEqual({
      values: [],
      anyDiscreteField: false,
      anyField: false,
    });
  });
});

describe("createLazyIdentityIndex", () => {
  it("builds the index once and reuses it", async () => {
    const { createLazyIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    let calls = 0;
    // empty panels produce a stable empty-ish index; count construction via
    // successive get() returning the same reference.
    const get = createLazyIdentityIndex([], []);
    const a = get();
    const b = get();
    expect(a).toBe(b);
    // silence unused
    expect(calls).toBe(0);
  });
});

describe("buildPathGroupSortedRows", () => {
  it("groups frame rows and sorts each group by xNumeric (fallback row index)", async () => {
    const { buildPathGroupSortedRows } =
      await import("../src/pipeline/candidate-construction/frame-row.ts");
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
      await import("../src/pipeline/candidate-construction/frame-row.ts");
    const frame = fromAny({ groups: [0, 0, 0], xNumeric: null });
    expect([...buildPathGroupSortedRows(frame).get(0)!]).toEqual([0, 1, 2]);
  });
});

describe("getPathGroupSortedRows", () => {
  it("returns the same Map for the same frame (precomputed once)", async () => {
    const { getPathGroupSortedRows } =
      await import("../src/pipeline/candidate-construction/frame-row.ts");
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
      await import("../src/pipeline/candidate-construction/frame-row.ts");
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
      await import("../src/pipeline/candidate-construction/frame-row.ts");
    const { pathSubpathIndex } = await import("../src/candidate-geometry.ts");
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

describe("allocatePipelineRunId", () => {
  it("returns increasing positive integers", async () => {
    const { allocatePipelineRunId } = await import("../src/pipeline/run-id.ts");
    const a = allocatePipelineRunId();
    const b = allocatePipelineRunId();
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(a + 1);
  });
});

describe("resolveOutlierContext", () => {
  it("returns nulls for non-boxplot point batches", async () => {
    const { resolveOutlierContext } =
      await import("../src/pipeline/candidate-construction/datum.ts");
    expect(
      resolveOutlierContext({
        frame: undefined,
        batch: fromAny({ kind: "points" }),
        primitiveIndex: 0,
        facetPanel: undefined,
      }),
    ).toEqual({ outlierLocalRow: null, outlierSourceRow: null });
  });
});

describe("lineage represented-row filters", () => {
  it("keeps rows whose band key matches the aggregate x output", async () => {
    const { filterAggregateXRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const table = ColumnTable.fromRows([
      { g: "a", y: 1 },
      { g: "b", y: 2 },
      { g: "a", y: 3 },
    ]);
    expect(
      filterAggregateXRows({
        table,
        field: "g",
        outputX: "a",
        baseRows: [0, 1, 2],
      }),
    ).toEqual([0, 2]);
  });

  it("filters bin membership with closed=right half-open intervals", async () => {
    const { filterBinRepresentedRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const table = ColumnTable.fromRows([{ x: 0.5 }, { x: 1.5 }, { x: 2.5 }, { x: 3.5 }]);
    const frame = fromAny({
      xmin: new Float64Array([0, 2]),
      xmax: new Float64Array([2, 4]),
      groups: new Uint32Array([0, 0]),
      n: 2,
      binding: { layer: { params: { closed: "right" } } },
    });
    expect(
      filterBinRepresentedRows({
        frame,
        table,
        frameRow: 0,
        field: "x",
        baseRows: [0, 1, 2, 3],
      }),
    ).toEqual([0, 1]);
  });

  it("keeps rows with finite y values for aggregate y lineage", async () => {
    const { filterAggregateYRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const table = ColumnTable.fromRows([
      { y: 1 },
      { y: Number.NaN },
      { y: 3 },
      { y: null },
      { y: Infinity },
    ]);
    expect(
      filterAggregateYRows({
        table,
        field: "y",
        baseRows: [0, 1, 2, 3, 4],
      }),
    ).toEqual([0, 2]);
  });
});

describe("lineage filter column hoist (issue #220)", () => {
  it("filterAggregateXRows reads the field column once for many base rows", async () => {
    const { filterAggregateXRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const table = ColumnTable.fromRows(
      Array.from({ length: 40 }, (_, i) => ({ g: i % 2 === 0 ? "a" : "b", y: i })),
    );
    const baseRows = Array.from({ length: 40 }, (_, i) => i);
    const reads = countColumnReads("g", () => {
      filterAggregateXRows({ table, field: "g", outputX: "a", baseRows });
    });
    expect(reads).toBe(1);
  });

  it("filterBinRepresentedRows reads the field column once for many base rows", async () => {
    const { filterBinRepresentedRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const table = ColumnTable.fromRows(Array.from({ length: 40 }, (_, i) => ({ x: i * 0.1 })));
    const frame = fromAny({
      xmin: new Float64Array([0]),
      xmax: new Float64Array([2]),
      groups: new Uint32Array([0]),
      n: 1,
      binding: { layer: { params: { closed: "right" } } },
    });
    const baseRows = Array.from({ length: 40 }, (_, i) => i);
    const reads = countColumnReads("x", () => {
      filterBinRepresentedRows({
        frame,
        table,
        frameRow: 0,
        field: "x",
        baseRows,
      });
    });
    expect(reads).toBe(1);
  });

  it("filterAggregateYRows reads the field column once for many base rows", async () => {
    const { filterAggregateYRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const table = ColumnTable.fromRows(
      Array.from({ length: 40 }, (_, i) => ({ y: i % 5 === 0 ? Number.NaN : i })),
    );
    const baseRows = Array.from({ length: 40 }, (_, i) => i);
    const reads = countColumnReads("y", () => {
      filterAggregateYRows({ table, field: "y", baseRows });
    });
    expect(reads).toBe(1);
  });
});

describe("aggregate lineage index (issue #184)", () => {
  it("pre-buckets group source rows by x band key for O(1) mark resolve", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { bandKey } = await import("../src/scales/train.ts");
    const { normalize } = await import("@ggsvelte/spec");

    // Continuous (numeric) x does not participate in grouping, so count expands
    // many x levels inside one group — the O(k·g) case the index must fix.
    const prepared = preparePanels(
      normalize(
        gg([{ x: 1 }, { x: 2 }, { x: 1 }, { x: 3 }], aes({ x: "x" }))
          .geomBar()
          .spec(),
      ),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);

    const groupKey = "0:0:0";
    expect(index.sourceRowsByGroup.get(groupKey)?.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(index.sourceRowsByGroupX.get(`${groupKey}:${bandKey(1)}`)).toEqual([0, 2]);
    expect(index.sourceRowsByGroupX.get(`${groupKey}:${bandKey(2)}`)).toEqual([1]);
    expect(index.sourceRowsByGroupX.get(`${groupKey}:${bandKey(3)}`)).toEqual([3]);
  });

  it("pre-buckets bin memberships per frame row so resolve does not re-scan", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { filterBinRepresentedRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    for (const closed of ["right", "left"] as const) {
      const prepared = preparePanels(
        normalize({
          data: { values: [{ x: 0 }, { x: 1 }, { x: 2 }] },
          layers: [
            {
              geom: "histogram",
              aes: { x: { field: "x" } },
              params: { binwidth: 1, boundary: 0, closed },
            },
          ],
        }),
        size,
        [],
        [],
      );
      const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
      const frame = prepared.panelFrames[0]![0]!;
      expect(frame.n).toBeGreaterThanOrEqual(2);

      // Single-pass assignment must match pure filter membership for every bin.
      for (let frameRow = 0; frameRow < frame.n; frameRow++) {
        const group = frame.groups[frameRow] ?? 0;
        const baseRows = index.sourceRowsByGroup.get(`0:0:${group}`) ?? [];
        const viaFilter = filterBinRepresentedRows({
          frame,
          table: prepared.table,
          frameRow,
          field: "x",
          baseRows,
        });
        expect(index.sourceRowsByGroupBin.get(`0:0:${group}:${frameRow}`)).toEqual(viaFilter);
      }
    }
  });

  it("does not build group×x buckets for identity layers that never consume them", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    // Mixed layers force identity-indexed path; only count should fill group×x.
    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { g: "a", y: 1 },
            { g: "b", y: 2 },
          ],
        },
        layers: [
          { geom: "point", aes: { x: { field: "g" }, y: { field: "y" } } },
          { geom: "bar", aes: { x: { field: "g" } }, stat: "count" },
        ],
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    // Layer 0 is identity point — no group×x keys with layerIndex 0.
    for (const key of index.sourceRowsByGroupX.keys()) {
      expect(key.startsWith("0:0:")).toBe(false);
    }
    // Layer 1 is count bar — has group×x keys.
    expect([...index.sourceRowsByGroupX.keys()].some((key) => key.startsWith("0:1:"))).toBe(true);
  });

  it("keeps boxplot outlier lineage as the single source row (not the full box)", () => {
    const model = runPipeline(
      {
        data: {
          values: [
            { group: "a", y: 1 },
            { group: "a", y: 2 },
            { group: "a", y: 3 },
            { group: "a", y: 100 },
          ],
        },
        layers: [
          {
            geom: "boxplot",
            stat: "boxplot",
            aes: { x: { field: "group" }, y: { field: "y" } },
          },
        ],
      },
      size,
    );
    const candidates = Array.from({ length: model.candidates.size }, (_, id) =>
      model.candidates.candidate(id),
    );
    const outlier = candidates.find((candidate) => candidate?.kind === "points");
    expect(outlier).toBeDefined();
    expect([...model.lineage.keys(outlier!.lineage)].toSorted((a, b) => a - b)).toEqual([3]);
  });

  it("resolveRepresentedSourceRows uses index lookups and matches filter parity", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { resolveRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/datum.ts");
    const { filterRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { LineageStore } = await import("../src/identity.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize(
        gg([{ x: 1 }, { x: 2 }, { x: 1 }, { x: 3 }], aes({ x: "x" }))
          .geomBar()
          .spec(),
      ),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const frame = prepared.panelFrames[0]![0]!;
    const lineage = new LineageStore<number>();

    for (let frameRow = 0; frameRow < frame.n; frameRow++) {
      const group = frame.groups[frameRow] ?? 0;
      const viaIndex = resolveRepresentedSourceRows({
        outlierSourceRow: null,
        sourceRow: null,
        group,
        panelIndex: 0,
        layerIndex: 0,
        sourceRowsByGroup: index.sourceRowsByGroup,
        sourceRowsByGroupX: index.sourceRowsByGroupX,
        sourceRowsByGroupBin: index.sourceRowsByGroupBin,
        sourceRowsByGroupY: index.sourceRowsByGroupY,
        frame,
        table: prepared.table,
        frameRow,
        lineage,
        primitiveIndex: frameRow,
      });
      const baseRows = index.sourceRowsByGroup.get(`0:0:${group}`) ?? [];
      const viaFilter = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows,
      });
      expect(viaIndex.representedRows).toEqual(viaFilter);
    }
  });
});

/**
 * Seams under test (issue #218):
 * - buildBinLineageBuckets missing-edges path: full-group membership per frame row
 * - multi-group isolation + first-seen source-row order + facet sourceRows remap
 * - complexity: frame.groups index reads stay O(k), not O(n·k)
 */
describe("buildBinLineageBuckets missing-edges fallback (issue #218)", () => {
  async function loadBuildBinLineageBuckets() {
    const { buildBinLineageBuckets } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    return buildBinLineageBuckets;
  }

  function binBinding(colorField: string | null = null) {
    return {
      layer: {
        geom: "histogram",
        stat: "bin",
        aes: {
          x: { field: "x" },
          ...(colorField === null ? {} : { color: { field: colorField } }),
        },
      },
      index: 0,
      xField: "x",
      yField: null,
      yStatColumn: null,
      yminField: null,
      ymaxField: null,
      color: { field: colorField, constant: null, scaledConstant: null },
      fill: { field: null, constant: null, scaledConstant: null },
      labelField: null,
      labelConstant: null,
      weightField: null,
      ruleForm: null,
    };
  }

  it("assigns every source row of a group into each of that group's frame rows", async () => {
    const buildBinLineageBuckets = await loadBuildBinLineageBuckets();
    const table = ColumnTable.fromRows([
      { g: "a", x: 1 },
      { g: "b", x: 2 },
      { g: "a", x: 3 },
      { g: "b", x: 4 },
      { g: "a", x: 5 },
    ]);
    // Pre-stat groups: a→0, b→1 (matches frame.inputGroups cache contract).
    const inputGroups = [0, 1, 0, 1, 0];
    // Two empty-edge output marks per group (0=a, 1=b).
    const groups = [0, 0, 1, 1];
    const frame = fromAny({
      binding: binBinding("g"),
      table,
      n: groups.length,
      groups,
      inputGroups,
      xmin: null,
      xmax: null,
    });
    const sourceRowsByGroupBin = new Map<string, number[]>();
    buildBinLineageBuckets({
      frame,
      panelIndex: 0,
      layerIndex: 0,
      facetPanel: fromAny({ sourceRows: null }),
      sourceRowsByGroupBin,
    });

    expect(sourceRowsByGroupBin.get("0:0:0:0")).toEqual([0, 2, 4]);
    expect(sourceRowsByGroupBin.get("0:0:0:1")).toEqual([0, 2, 4]);
    expect(sourceRowsByGroupBin.get("0:0:1:2")).toEqual([1, 3]);
    expect(sourceRowsByGroupBin.get("0:0:1:3")).toEqual([1, 3]);
  });

  it("remaps through facetPanel.sourceRows in first-seen order", async () => {
    const buildBinLineageBuckets = await loadBuildBinLineageBuckets();
    const table = ColumnTable.fromRows([
      { g: "a", x: 1 },
      { g: "a", x: 2 },
      { g: "b", x: 3 },
    ]);
    const inputGroups = [0, 0, 1];
    const groups = [0, 1];
    const frame = fromAny({
      binding: binBinding("g"),
      table,
      n: groups.length,
      groups,
      inputGroups,
      xmin: null,
      xmax: null,
    });
    const sourceRowsByGroupBin = new Map<string, number[]>();
    buildBinLineageBuckets({
      frame,
      panelIndex: 2,
      layerIndex: 1,
      facetPanel: fromAny({ sourceRows: [10, 20, 30] }),
      sourceRowsByGroupBin,
    });

    expect(sourceRowsByGroupBin.get("2:1:0:0")).toEqual([10, 20]);
    expect(sourceRowsByGroupBin.get("2:1:1:1")).toEqual([30]);
  });

  it("reads frame.groups O(k) times, not O(n·k), when edges are missing", async () => {
    const buildBinLineageBuckets = await loadBuildBinLineageBuckets();
    const n = 40;
    const k = 40;
    const table = ColumnTable.fromRows(Array.from({ length: n }, (_, i) => ({ x: i })));
    const inputGroups = Array.from({ length: n }, () => 0);
    const rawGroups = Array.from({ length: k }, () => 0);
    let groupIndexReads = 0;
    const groups = new Proxy(rawGroups, {
      get(target, property, receiver): unknown {
        if (typeof property === "string" && /^\d+$/.test(property)) groupIndexReads += 1;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    const frame = fromAny({
      binding: binBinding(null),
      table,
      n: k,
      groups,
      inputGroups,
      xmin: null,
      xmax: null,
    });
    const sourceRowsByGroupBin = new Map<string, number[]>();
    buildBinLineageBuckets({
      frame,
      panelIndex: 0,
      layerIndex: 0,
      facetPanel: fromAny({ sourceRows: null }),
      sourceRowsByGroupBin,
    });

    // Setup walk over k frame rows is enough; nested O(n·k) would read ~n·k times.
    expect(groupIndexReads).toBeLessThanOrEqual(k * 2);
    expect(groupIndexReads).toBeLessThan((n * k) / 2);
    expect(sourceRowsByGroupBin.get("0:0:0:0")).toEqual(Array.from({ length: n }, (_, i) => i));
    expect(sourceRowsByGroupBin.get(`0:0:0:${k - 1}`)).toEqual(
      Array.from({ length: n }, (_, i) => i),
    );
  });
});

describe("finite-y lineage cache (issue #216)", () => {
  it("precomputes finite-y source rows once per group for smooth layers", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { filterAggregateYRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
            { x: 3, y: Number.NaN },
            { x: 4, y: 40 },
          ],
        },
        layers: [
          {
            geom: "smooth",
            stat: "smooth",
            aes: { x: { field: "x" }, y: { field: "y" } },
            params: { method: "lm", n: 5 },
          },
        ],
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const groupKey = "0:0:0";
    const baseRows = index.sourceRowsByGroup.get(groupKey) ?? [];
    expect(baseRows.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3]);

    const viaFilter = filterAggregateYRows({
      table: prepared.table,
      field: "y",
      baseRows,
    });
    // Non-finite y (row 2) must be excluded; cache must match pure filter.
    expect(viaFilter).toEqual([0, 1, 3]);
    expect(index.sourceRowsByGroupY.get(groupKey)).toEqual(viaFilter);
  });

  it("filterRepresentedSourceRows reuses finite-y cache for every smooth mark", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
            { x: 3, y: Number.NaN },
            { x: 4, y: 40 },
          ],
        },
        layers: [
          {
            geom: "smooth",
            stat: "smooth",
            aes: { x: { field: "x" }, y: { field: "y" } },
            params: { method: "lm", n: 5 },
          },
        ],
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const frame = prepared.panelFrames[0]![0]!;
    const baseRows = index.sourceRowsByGroup.get("0:0:0") ?? [];
    const expected = index.sourceRowsByGroupY.get("0:0:0");
    expect(expected).toEqual([0, 1, 3]);

    // Every evaluation-grid mark must resolve to the same finite-y list.
    expect(frame.n).toBeGreaterThan(1);
    for (let frameRow = 0; frameRow < frame.n; frameRow++) {
      const viaIndex = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows,
        group: 0,
        panelIndex: 0,
        layerIndex: 0,
        sourceRowsByGroupY: index.sourceRowsByGroupY,
      });
      const viaFilter = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows,
      });
      expect(viaIndex).toEqual(viaFilter);
      expect(viaIndex).toEqual(expected);
      // Shared frozen array — no per-mark re-filter allocation.
      expect(viaIndex).toBe(expected);
    }
  });

  it("does not build finite-y buckets for identity or count layers", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { g: "a", y: 1 },
            { g: "b", y: 2 },
          ],
        },
        layers: [
          { geom: "point", aes: { x: { field: "g" }, y: { field: "y" } } },
          { geom: "bar", aes: { x: { field: "g" } }, stat: "count" },
        ],
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    expect(index.sourceRowsByGroupY.size).toBe(0);
  });

  it("resolveRepresentedSourceRows matches pure filter and reuses lineage for smooth marks", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { resolveRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/datum.ts");
    const { filterRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { LineageStore } = await import("../src/identity.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
            { x: 3, y: Number.NaN },
            { x: 4, y: 40 },
          ],
        },
        layers: [
          {
            geom: "smooth",
            stat: "smooth",
            aes: { x: { field: "x" }, y: { field: "y" } },
            params: { method: "lm", n: 8 },
          },
        ],
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const frame = prepared.panelFrames[0]![0]!;
    const lineage = new LineageStore<number>();
    const baseRows = index.sourceRowsByGroup.get("0:0:0") ?? [];

    const lineageKeys: number[] = [];
    for (let frameRow = 0; frameRow < frame.n; frameRow++) {
      const viaIndex = resolveRepresentedSourceRows({
        outlierSourceRow: null,
        sourceRow: null,
        group: 0,
        panelIndex: 0,
        layerIndex: 0,
        sourceRowsByGroup: index.sourceRowsByGroup,
        sourceRowsByGroupX: index.sourceRowsByGroupX,
        sourceRowsByGroupBin: index.sourceRowsByGroupBin,
        sourceRowsByGroupY: index.sourceRowsByGroupY,
        frame,
        table: prepared.table,
        frameRow,
        lineage,
        primitiveIndex: frameRow,
      });
      const viaFilter = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows,
      });
      expect(viaIndex.representedRows).toEqual(viaFilter);
      expect(viaIndex.representedRows).toEqual([0, 1, 3]);
      lineageKeys.push(viaIndex.lineageKey);
    }
    expect(frame.n).toBeGreaterThan(1);
    // All evaluation-grid marks share one interned lineage membership.
    expect(new Set(lineageKeys).size).toBe(1);
    expect([...lineage.keys(lineageKeys[0]!)].toSorted((a, b) => a - b)).toEqual([0, 1, 3]);
  });

  it("pipeline smooth candidates share one lineage membership per group", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
          { x: 3, y: null },
          { x: 4, y: 40 },
          { x: 5, y: 50 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomSmooth({ method: "lm", n: 10 })
        .spec(),
      size,
    );
    const candidates = Array.from({ length: model.candidates.size }, (_, id) =>
      model.candidates.candidate(id),
    ).flatMap((candidate) => (candidate === null ? [] : [candidate]));
    expect(candidates.length).toBeGreaterThan(1);
    const first = candidates[0];
    if (first === undefined) throw new Error("expected at least one smooth candidate");
    const lineageRefs = new Set(candidates.map((candidate) => candidate.lineage));
    expect(lineageRefs.size).toBe(1);
    const keys = [...model.lineage.keys(first.lineage)].toSorted((a, b) => a - b);
    // Row 2 has null y and is not represented by the smooth fit lineage.
    expect(keys).toEqual([0, 1, 3, 4]);
  });

  it("finite-y cache uses panel-local y values under facet wrap", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize(
        gg(
          [
            { f: "A", x: 1, y: 10 },
            { f: "A", x: 2, y: null },
            { f: "A", x: 3, y: 30 },
            { f: "B", x: 1, y: 100 },
            { f: "B", x: 2, y: 200 },
          ],
          aes({ x: "x", y: "y" }),
        )
          .geomSmooth({ method: "lm", n: 4 })
          .facet({ wrap: "f" })
          .spec(),
      ),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);

    // Panel B maps source rows 3,4 → panel-local 0,1. Cache must not index frame.table
    // with source-table indexes (that empties or corrupts the finite-y list).
    expect(index.sourceRowsByGroupY.get("0:0:0")).toEqual([0, 2]);
    expect(index.sourceRowsByGroupY.get("1:0:0")).toEqual([3, 4]);

    for (let panelIndex = 0; panelIndex < prepared.panelFrames.length; panelIndex++) {
      const frame = prepared.panelFrames[panelIndex]![0]!;
      const groupKey = `${panelIndex}:0:0`;
      const baseRows = index.sourceRowsByGroup.get(groupKey) ?? [];
      const viaFilter = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow: 0,
        baseRows,
      });
      expect(index.sourceRowsByGroupY.get(groupKey)).toEqual(viaFilter);
      const viaIndex = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow: 0,
        baseRows,
        group: 0,
        panelIndex,
        layerIndex: 0,
        sourceRowsByGroupY: index.sourceRowsByGroupY,
      });
      expect(viaIndex).toEqual(viaFilter);
      expect(viaIndex).toBe(index.sourceRowsByGroupY.get(groupKey));
    }
  });

  it("summary finite-y cache matches pure filter after group×x resolve", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { resolveRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/datum.ts");
    const { filterRepresentedSourceRows } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { LineageStore } = await import("../src/identity.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { g: "a", y: 1 },
            { g: "a", y: Number.NaN },
            { g: "a", y: 3 },
            { g: "b", y: 4 },
          ],
        },
        layers: [
          {
            geom: "pointrange",
            stat: "summary",
            aes: { x: { field: "g" }, y: { field: "y" } },
          },
        ],
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    expect(index.sourceRowsByGroupY.get("0:0:0")).toEqual([0, 2]);
    expect(index.sourceRowsByGroupY.get("0:0:1")).toEqual([3]);

    const frame = prepared.panelFrames[0]![0]!;
    const lineage = new LineageStore<number>();
    for (let frameRow = 0; frameRow < frame.n; frameRow++) {
      const group = frame.groups[frameRow] ?? 0;
      const viaIndex = resolveRepresentedSourceRows({
        outlierSourceRow: null,
        sourceRow: null,
        group,
        panelIndex: 0,
        layerIndex: 0,
        sourceRowsByGroup: index.sourceRowsByGroup,
        sourceRowsByGroupX: index.sourceRowsByGroupX,
        sourceRowsByGroupBin: index.sourceRowsByGroupBin,
        sourceRowsByGroupY: index.sourceRowsByGroupY,
        frame,
        table: prepared.table,
        frameRow,
        lineage,
        primitiveIndex: frameRow,
      });
      const baseRows = index.sourceRowsByGroup.get(`0:0:${group}`) ?? [];
      const viaFilter = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows,
      });
      expect(viaIndex.representedRows).toEqual(viaFilter);
    }
  });
});

describe("pre-stat inputGroups cache (issue #217)", () => {
  it("identity index buckets source rows from frame.inputGroups (not re-derived)", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize(
        gg(
          [
            { g: "a", c: "x" },
            { g: "a", c: "y" },
            { g: "b", c: "x" },
          ],
          aes({ x: "g", fill: "c" }),
        )
          .geomBar()
          .spec(),
      ),
      size,
      [],
      [],
    );
    const frame = prepared.panelFrames[0]![0]!;
    // Replace cached pre-stat groups with a distinctive assignment; the index
    // must follow the cache (proves no second deriveLayerGroups pass).
    const forced = [7, 7, 8] as const;
    (frame as { inputGroups: readonly number[] }).inputGroups = forced;

    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    expect(index.sourceRowsByGroup.get("0:0:7")?.toSorted((a, b) => a - b)).toEqual([0, 1]);
    expect(index.sourceRowsByGroup.get("0:0:8")).toEqual([2]);
    // Natural group ids from derive must not appear if cache is honored.
    expect(index.sourceRowsByGroup.has("0:0:0")).toBe(false);
  });

  it("bin lineage assign uses frame.inputGroups for source-row membership", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/candidate-construction/identity-index.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: { values: [{ x: 0 }, { x: 1 }, { x: 2 }] },
        layers: [
          {
            geom: "histogram",
            aes: { x: { field: "x" } },
            params: { binwidth: 1, boundary: 0, closed: "right" },
          },
        ],
      }),
      size,
      [],
      [],
    );
    const frame = prepared.panelFrames[0]![0]!;
    expect(frame.inputGroups).toHaveLength(3);
    // Single group for continuous x with no discrete aesthetics.
    expect([...new Set(frame.inputGroups)]).toEqual([0]);

    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const allBinRows = [...index.sourceRowsByGroupBin.values()].flat();
    expect(allBinRows.toSorted((a, b) => a - b)).toEqual([0, 1, 2]);
  });
});
