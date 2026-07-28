/**
 * Layer-level `inspect: false` keeps decorative marks out of inspection (#1065).
 *
 * A full-panel background rect reports distance 0 for any pointer inside it
 * (`candidate-hit-geometry.ts` rectsOps.distance), so it beats every point and
 * every stroke everywhere on the panel. On the getting-started chart that made
 * the tooltip unable to reach a single observation or the trend line — the two
 * things the chart is about (#1068, gap D of #727).
 *
 * The fix is an author opt-out, not a change to rect hit math: intentional area
 * tooltips (bars, tiles, heatmaps) depend on that distance 0.
 */
import { describe, expect, it } from "bun:test";

import { runPipeline } from "../src/pipeline/run-pipeline.js";

const observations = [
  { year: 1000, value: 10 },
  { year: 1400, value: 14 },
  { year: 1800, value: 11 },
  { year: 2000, value: 4 },
];

/** One band covering the whole panel, the shape that swallows the pointer. */
const bands = [{ from: 800, to: 2100, low: 0, high: 20, epoch: "all" }];

const bandLayer = (inspect?: false) => ({
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
  ...(inspect !== undefined && { inspect }),
});

const specWith = (inspect?: false) => ({
  data: { values: observations },
  aes: { x: { field: "year" }, y: { field: "value" } },
  layers: [bandLayer(inspect), { geom: "point" }],
  scales: { fill: { type: "manual", domain: ["all"], range: ["#eee"] } },
});

const size = { width: 600, height: 400 };

/** Layer index of every candidate the store holds. */
function layerIndexes(model: ReturnType<typeof runPipeline>): number[] {
  return Array.from({ length: model.candidates.size }, (_, id) => model.candidates.candidate(id))
    .filter((candidate) => candidate !== null)
    .map((candidate) => candidate.layerIndex);
}

describe("layer inspect: false", () => {
  it("keeps the opted-out layer out of the candidate store entirely", () => {
    const model = runPipeline(specWith(false) as never, size);
    const layers = layerIndexes(model);

    expect(layers).not.toContain(0);
    expect(layers.filter((index) => index === 1)).toHaveLength(observations.length);
  });

  // Off any mark, which is where the pointer spends nearly all its time.
  // `hitTest` is not the failing path: it resolves topmost, so a point painted
  // above the band already wins on its own anchor. `nearest` is what
  // pointer-inspect calls, and that is where distance 0 wins.
  const probe = { x: size.width / 2, y: size.height / 2 };
  // Finite: the spatial shortlist builds its query rect from maxDistance, so
  // an infinite bound yields no candidates at all.
  const reach = size.width;

  it("stops the band answering for empty space in exact mode", () => {
    const control = runPipeline(specWith() as never, size);
    const opted = runPipeline(specWith(false) as never, size);
    const query = { mode: "exact", maxDistance: reach } as const;

    // Exact mode wants a real hit, and a point only gives one when the pointer
    // is on it. The band was giving one everywhere it was painted. So the
    // opt-out's job here is to return nothing off-mark, not to substitute a
    // distant point.
    expect(control.candidates.nearest(probe.x, probe.y, query)?.layerIndex).toBe(0);
    expect(opted.candidates.nearest(probe.x, probe.y, query)).toBeNull();
  });

  it("leaves the axis modes finding points", () => {
    const opted = runPipeline(specWith(false) as never, size);

    // Axis modes bucket by axis value rather than by distance, so the band
    // never captured them the way it captures exact mode. The opt-out must not
    // cost them their answer.
    for (const mode of ["x", "y", "xy"] as const) {
      expect(
        opted.candidates.nearest(probe.x, probe.y, { mode, maxDistance: reach })?.layerIndex,
      ).toBe(1);
    }
  });

  it("keeps the band inspectable when the field is omitted", () => {
    const model = runPipeline(specWith() as never, size);
    const layers = layerIndexes(model);

    expect(layers).toContain(0);
    expect(layers.filter((index) => index === 1)).toHaveLength(observations.length);
  });

  it("skips the opted-out layer in keyboard traversal", () => {
    const model = runPipeline(specWith(false) as never, size);

    const visited: number[] = [];
    let id = model.candidates.traverse(null, "first");
    while (id !== null && visited.length <= model.candidates.size) {
      visited.push(model.candidates.candidate(id)!.layerIndex);
      id = model.candidates.traverse(id, "next");
    }

    expect(visited).not.toContain(0);
    expect(visited.length).toBeGreaterThan(0);
  });
});
