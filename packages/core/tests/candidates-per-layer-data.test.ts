/**
 * Regression: candidate value reads must resolve against the table that owns
 * the row, not the plot's.
 *
 * A layer carrying its own `data` (#589) has its own fields. Candidate datum
 * resolution looked every mapped field up in the plot's source table, so any
 * interactive plot containing such a layer threw
 * `ColumnTable: unknown field "..."` as soon as candidates were resolved —
 * which is exactly the shape of the getting-started flagship chart (epoch
 * bands + annotations over a shared point layer, with inspect enabled).
 */
import { describe, expect, it } from "bun:test";

import { runPipeline } from "../src/pipeline/run-pipeline.js";

const observations = [
  { year: 1000, value: 10 },
  { year: 1400, value: 14 },
  { year: 1800, value: 11 },
  { year: 2000, value: 4 },
];

const bands = [
  { from: 900, to: 1500, low: 0, high: 20, epoch: "early" },
  { from: 1500, to: 2100, low: 0, high: 20, epoch: "late" },
];

const spec = {
  data: { values: observations },
  aes: { x: { field: "year" }, y: { field: "value" } },
  layers: [
    {
      geom: "rect",
      data: { values: bands },
      aes: {
        x: null,
        y: null,
        xmin: { field: "from" },
        xmax: { field: "to" },
        ymin: { field: "low" },
        ymax: { field: "high" },
        fill: { field: "epoch" },
      },
      params: { alpha: 0.5 },
    },
    { geom: "point" },
    // A stat layer forces the identity-indexed candidate path.
    { geom: "smooth", params: { method: "lm", se: false } },
  ],
  scales: {
    fill: { type: "manual", domain: ["early", "late"], range: ["#eee", "#ddd"] },
  },
};

describe("candidates with per-layer data", () => {
  const model = runPipeline(spec as never, { width: 600, height: 400 });
  const facts = Array.from({ length: model.candidates.size }, (_, id) =>
    model.candidates.candidate(id),
  ).filter((candidate) => candidate !== null);

  it("resolves every candidate without reading the wrong table", () => {
    // Before the fix this threw `unknown field "epoch"` on the band layer.
    expect(facts.length).toBe(model.candidates.size);
    expect(facts.length).toBeGreaterThan(observations.length);
  });

  it("reads band fields from the band table and point fields from the point table", () => {
    const byLayer = new Map<number, typeof facts>();
    for (const candidate of facts) {
      byLayer.set(candidate.layerIndex, [...(byLayer.get(candidate.layerIndex) ?? []), candidate]);
    }

    const bandFacts = byLayer.get(0) ?? [];
    expect(bandFacts).toHaveLength(bands.length);
    // Two distinct manual fill categories => two distinct series ranks.
    expect(new Set(bandFacts.map((candidate) => candidate.seriesRank)).size).toBe(2);

    const pointFacts = byLayer.get(1) ?? [];
    const ascending = (a: unknown, b: unknown): number => Number(a) - Number(b);
    expect(pointFacts.map((candidate) => candidate.xValue).toSorted(ascending)).toEqual(
      observations.map((row) => row.year).toSorted(ascending),
    );
    expect(pointFacts.map((candidate) => candidate.yValue).toSorted(ascending)).toEqual(
      observations.map((row) => row.value).toSorted(ascending),
    );
  });
});
