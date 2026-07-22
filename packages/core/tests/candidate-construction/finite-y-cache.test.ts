/**
 * Finite-y lineage cache (issue #216).
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { runPipeline } from "../../src/pipeline.ts";
import { size } from "./fixtures.ts";

describe("finite-y lineage cache (issue #216)", () => {
  it("precomputes finite-y source rows once per group for smooth layers", async () => {
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterAggregateYRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { resolveRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/datum.ts");
    const { filterRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const { LineageStore } = await import("../../src/identity.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { resolveRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/datum.ts");
    const { filterRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const { LineageStore } = await import("../../src/identity.ts");
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

  it("summary/boxplot group×x buckets prefilter finite y for O(1) resolve", async () => {
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows, filterAggregateXRows, filterAggregateYRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const { resolveRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/datum.ts");
    const { bandKey } = await import("../../src/scales/train.ts");
    const { LineageStore } = await import("../../src/identity.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { g: "a", y: 1 },
            { g: "a", y: Number.NaN },
            { g: "a", y: 3 },
            { g: "b", y: Number.NaN },
            { g: "b", y: null },
            { g: "c", y: 9 },
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
    const groupA = "0:0:0";
    const groupB = "0:0:1";
    const groupC = "0:0:2";

    // Finite-y prefilter at build (NaN/null y excluded); empty bucket still present for b.
    expect(index.sourceRowsByGroupX.get(`${groupA}:${bandKey("a")}`)).toEqual([0, 2]);
    expect(index.sourceRowsByGroupX.get(`${groupB}:${bandKey("b")}`)).toEqual([]);
    expect(index.sourceRowsByGroupX.get(`${groupC}:${bandKey("c")}`)).toEqual([5]);

    // Parity with pure x then y filter (no index).
    const baseA = index.sourceRowsByGroup.get(groupA) ?? [];
    const pureA = filterAggregateYRows({
      table: prepared.table,
      field: "y",
      baseRows: filterAggregateXRows({
        table: prepared.table,
        field: "g",
        outputX: "a",
        baseRows: baseA,
      }),
    });
    expect(index.sourceRowsByGroupX.get(`${groupA}:${bandKey("a")}`)).toEqual(pureA);

    const frame = prepared.panelFrames[0]![0]!;
    const lineage = new LineageStore<number>();
    const lineageByX = new Map<string, number>();
    for (let frameRow = 0; frameRow < frame.n; frameRow++) {
      const group = frame.groups[frameRow] ?? 0;
      const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
      const expected = index.sourceRowsByGroupX.get(`0:0:${group}:${bandKey(outputX)}`);
      expect(expected).toBeDefined();

      const viaIndex = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows: index.sourceRowsByGroup.get(`0:0:${group}`) ?? [],
        group,
        panelIndex: 0,
        layerIndex: 0,
        sourceRowsByGroupX: index.sourceRowsByGroupX,
      });
      // Shared frozen bucket — no per-mark y re-filter allocation.
      expect(viaIndex).toBe(expected);

      const viaFilter = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows: index.sourceRowsByGroup.get(`0:0:${group}`) ?? [],
      });
      expect(viaIndex).toEqual(viaFilter);

      const resolved = resolveRepresentedSourceRows({
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
      expect(resolved.representedRows).toBe(expected);
      const xKey = bandKey(outputX);
      const prior = lineageByX.get(xKey);
      if (prior === undefined) lineageByX.set(xKey, resolved.lineageKey);
      else expect(resolved.lineageKey).toBe(prior);
    }

    // Empty all-non-finite bucket interns as empty lineage, not a miss/fallback.
    expect(lineage.count(lineageByX.get(bandKey("b"))!)).toBe(0);
  });

  it("count group×x reuses frozen bucket without clone (no y prefilter)", async () => {
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const { bandKey } = await import("../../src/scales/train.ts");
    const { normalize } = await import("@ggsvelte/spec");

    // Count never sets finiteY — every source row stays in the group×x bucket.
    const prepared = preparePanels(
      normalize(
        gg([{ g: "a" }, { g: "a" }, { g: "a" }], aes({ x: "g" }))
          .geomBar()
          .spec(),
      ),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const bucket = index.sourceRowsByGroupX.get(`0:0:0:${bandKey("a")}`);
    expect(bucket).toEqual([0, 1, 2]);
    const frame = prepared.panelFrames[0]![0]!;
    const viaIndex = filterRepresentedSourceRows({
      frame,
      table: prepared.table,
      frameRow: 0,
      baseRows: index.sourceRowsByGroup.get("0:0:0") ?? [],
      group: 0,
      panelIndex: 0,
      layerIndex: 0,
      sourceRowsByGroupX: index.sourceRowsByGroupX,
    });
    expect(viaIndex).toBe(bucket);
  });

  it("boxplot group×x drops non-finite y and reuses frozen bucket on resolve", async () => {
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterRepresentedSourceRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
    const { bandKey } = await import("../../src/scales/train.ts");
    const { normalize } = await import("@ggsvelte/spec");

    const prepared = preparePanels(
      normalize({
        data: {
          values: [
            { group: "a", y: 1 },
            { group: "a", y: 2 },
            { group: "a", y: 3 },
            { group: "a", y: null },
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
      }),
      size,
      [],
      [],
    );
    const index = buildCandidateIdentityIndex(prepared.panelFrames, prepared.facetPanels);
    const bucket = index.sourceRowsByGroupX.get(`0:0:0:${bandKey("a")}`);
    // null y (row 3) excluded at build; finite y retained in first-seen order.
    expect(bucket).toEqual([0, 1, 2, 4]);
    const frame = prepared.panelFrames[0]![0]!;
    for (let frameRow = 0; frameRow < frame.n; frameRow++) {
      const viaIndex = filterRepresentedSourceRows({
        frame,
        table: prepared.table,
        frameRow,
        baseRows: index.sourceRowsByGroup.get("0:0:0") ?? [],
        group: 0,
        panelIndex: 0,
        layerIndex: 0,
        sourceRowsByGroupX: index.sourceRowsByGroupX,
      });
      expect(viaIndex).toBe(bucket);
    }

    // Pipeline: non-outlier box candidates share one lineage membership.
    const model = runPipeline(
      {
        data: {
          values: [
            { group: "a", y: 1 },
            { group: "a", y: 2 },
            { group: "a", y: 3 },
            { group: "a", y: null },
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
    ).flatMap((candidate) => (candidate === null ? [] : [candidate]));
    const boxes = candidates.filter((candidate) => candidate.kind !== "points");
    expect(boxes.length).toBeGreaterThan(0);
    const refs = new Set(boxes.map((candidate) => candidate.lineage));
    expect(refs.size).toBe(1);
    expect([...model.lineage.keys(boxes[0]!.lineage)].toSorted((a, b) => a - b)).toEqual([
      0, 1, 2, 4,
    ]);
  });
});
