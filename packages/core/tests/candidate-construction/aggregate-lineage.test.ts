/**
 * Aggregate lineage index (issue #184) and frozen bucket seals.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";
import { size } from "./fixtures.ts";
import { runPipeline } from "../../src/pipeline.ts";

describe("aggregate lineage index (issue #184)", () => {
  it("pre-buckets group source rows by x band key for O(1) mark resolve", async () => {
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { bandKey } = await import("../../src/scales/train.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
    const { filterBinRepresentedRows } =
      await import("../../src/pipeline/candidate-construction/represented-rows.ts");
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
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
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

describe("identity index bucket sealing", () => {
  it("freezes every nonempty sourceRowsByGroup* bucket array", async () => {
    const { preparePanels } = await import("../../src/pipeline/prepare-panels.ts");
    const { buildCandidateIdentityIndex } =
      await import("../../src/pipeline/candidate-construction/identity-index.ts");
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
    let nonempty = 0;
    for (const map of [
      index.sourceRowsByGroup,
      index.sourceRowsByGroupX,
      index.sourceRowsByGroupBin,
      index.sourceRowsByGroupY,
    ]) {
      for (const rows of map.values()) {
        if (rows.length === 0) continue;
        nonempty += 1;
        expect(Object.isFrozen(rows)).toBe(true);
      }
    }
    expect(nonempty).toBeGreaterThan(0);
    expect(index.sourceRowsByGroupX.size).toBeGreaterThan(0);
  });
});
