/**
 * Series grouping and boxplot outlier context for identity candidates.
 */
import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

describe("resolveCandidateSeries / resolveRepresentedSourceRows", () => {
  it("uses derived group when sourceRow is null", async () => {
    const { resolveCandidateSeries } =
      await import("../../src/pipeline/candidate-construction/datum.ts");
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
      await import("../../src/pipeline/candidate-construction/datum.ts");
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

describe("resolveOutlierContext", () => {
  it("returns nulls for non-boxplot point batches", async () => {
    const { resolveOutlierContext } =
      await import("../../src/pipeline/candidate-construction/datum.ts");
    expect(
      resolveOutlierContext({
        frame: undefined,
        batch: fromAny({ kind: "points" }),
        primitiveIndex: 0,
        facetPanel: undefined,
      }),
    ).toEqual({ outlierLocalRow: null, outlierSourceRow: null });
  });

  // #609 — outlierRow is already global after prepare-panels remap; do not
  // re-index through facetPanel.sourceRows (double remap).
  it("treats boxplot outlierRow as already-global source ids", async () => {
    const { resolveOutlierContext } =
      await import("../../src/pipeline/candidate-construction/datum.ts");
    const result = resolveOutlierContext({
      frame: fromAny({
        box: { outlierRow: new Uint32Array([42]) },
        binding: { layer: { geom: "boxplot" } },
      }),
      batch: fromAny({ kind: "points" }),
      primitiveIndex: 0,
      // A non-empty sourceRows would wrongly remap 42 → sourceRows[42] if still panel-local.
      facetPanel: fromAny({ sourceRows: Array.from({ length: 50 }, (_, i) => i + 1000) }),
    });
    expect(result.outlierSourceRow).toBe(42);
    expect(result.outlierLocalRow).toBe(42);
  });
});
