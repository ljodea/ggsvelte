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
});
