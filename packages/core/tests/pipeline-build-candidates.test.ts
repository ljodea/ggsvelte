/**
 * Characterization tests for pipeline candidate construction paths:
 * source-backed (identity layers) vs identity-indexed (stats/annotations).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { ordinalSeriesRank } from "../src/pipeline/build-candidates-datum-context.ts";
import { resolveCandidateLogicalValues } from "../src/pipeline/build-candidates-datum-values.ts";
import { runPipeline } from "../src/pipeline.ts";

const size = { width: 640, height: 400 };

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
});

describe("resolveCandidateSeries / resolveRepresentedSourceRows", () => {
  it("uses derived group when sourceRow is null", async () => {
    const { resolveCandidateSeries } =
      await import("../src/pipeline/build-candidates-datum-series.ts");
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
      await import("../src/pipeline/build-candidates-datum-series.ts");
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

describe("isAllSourceBacked", () => {
  it("is true only when every layer is identity and non-annotation", async () => {
    const { isAllSourceBacked } = await import("../src/pipeline/build-candidates-source-backed.ts");
    expect(
      isAllSourceBacked([
        { layer: { stat: "identity" }, ruleForm: null },
        { layer: {}, ruleForm: null },
      ] as never),
    ).toBe(true);
    expect(isAllSourceBacked([{ layer: { stat: "count" }, ruleForm: null }] as never)).toBe(false);
    expect(
      isAllSourceBacked([{ layer: { stat: "identity" }, ruleForm: "annotation" }] as never),
    ).toBe(false);
  });
});

describe("collectColorChannelValues", () => {
  it("returns empty when no color mapping is present", async () => {
    const { collectColorChannelValues } = await import("../src/pipeline/scale-color-collect.ts");
    const table = { has: () => false, discreteness: () => "continuous" } as never;
    const frames = [
      {
        binding: {
          color: { field: null, scaledConstant: null },
          fill: { field: null, scaledConstant: null },
        },
        colorValues: null,
        fillValues: null,
      },
    ] as never;
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
      await import("../src/pipeline/build-candidates-identity-lazy.ts");
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
      await import("../src/pipeline/build-candidates-datum-outlier.ts");
    expect(
      resolveOutlierContext({
        frame: undefined,
        batch: { kind: "points" } as never,
        primitiveIndex: 0,
        facetPanel: undefined,
      }),
    ).toEqual({ outlierLocalRow: null, outlierSourceRow: null });
  });
});

describe("lineage represented-row filters", () => {
  it("keeps rows whose band key matches the aggregate x output", async () => {
    const { filterAggregateXRows } =
      await import("../src/pipeline/build-candidates-lineage-filters.ts");
    const { ColumnTable } = await import("../src/table.ts");
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
      await import("../src/pipeline/build-candidates-lineage-filters.ts");
    const { ColumnTable } = await import("../src/table.ts");
    const table = ColumnTable.fromRows([{ x: 0.5 }, { x: 1.5 }, { x: 2.5 }, { x: 3.5 }]);
    const frame = {
      xmin: new Float64Array([0, 2]),
      xmax: new Float64Array([2, 4]),
      groups: new Uint32Array([0, 0]),
      n: 2,
      binding: { layer: { params: { closed: "right" } } },
    } as never;
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
});

describe("aggregate lineage index (issue #184)", () => {
  it("pre-buckets group source rows by x band key for O(1) mark resolve", async () => {
    const { preparePanels } = await import("../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../src/pipeline/build-candidates-identity.ts");
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
      await import("../src/pipeline/build-candidates-identity.ts");
    const { filterBinRepresentedRows } =
      await import("../src/pipeline/build-candidates-lineage-filters.ts");
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
      await import("../src/pipeline/build-candidates-identity.ts");
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
      await import("../src/pipeline/build-candidates-identity.ts");
    const { resolveRepresentedSourceRows } =
      await import("../src/pipeline/build-candidates-datum-represented.ts");
    const { filterRepresentedSourceRows } =
      await import("../src/pipeline/build-candidates-lineage.ts");
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
