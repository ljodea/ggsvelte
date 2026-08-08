/**
 * position: "fill" must publish post-position proportions as candidate y
 * values so scale labels like ".0%" format shares (65%), not raw counts
 * (87300%). Repro: examples/bar/proportions — Naples Soldiers men=873.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { registerAll } from "../src/index.ts";
import { runPipeline } from "../src/pipeline.ts";

registerAll();

const size = { width: 640, height: 400 };

/** Armada Naples subset from examples/bar/proportions/data.ts. */
const naples = [
  { squadron: "Naples", role: "Soldiers", men: 873 },
  { squadron: "Naples", role: "Sailors", men: 468 },
] as const;

describe("position fill — candidate y matches axis space", () => {
  it("publishes proportions (not raw weights) so percent labels format shares", () => {
    const model = runPipeline(
      gg([...naples], aes({ x: "squadron", fill: "role", weight: "men" }))
        .geomBar({ position: "fill" })
        .scales({ y: { labels: ".0%" } })
        .spec(),
      size,
    );

    const candidates = Array.from({ length: model.candidates.size }, (_, id) =>
      model.candidates.candidate(id),
    ).filter((c) => c !== null);

    expect(candidates.length).toBe(2);

    // Soldiers 873 / (873+468) ≈ 0.650; Sailors ≈ 0.350.
    const byRole = new Map(
      candidates.map((c) => {
        // seriesId follows first-seen fill order: Soldiers=0, Sailors=1.
        return [c.seriesId, c] as const;
      }),
    );
    const soldiers = byRole.get(0)!;
    const sailors = byRole.get(1)!;

    expect(soldiers.yValue).toBeCloseTo(873 / (873 + 468), 8);
    expect(sailors.yValue).toBeCloseTo(468 / (873 + 468), 8);

    // Axis formatter multiplies by 100 — pre-fix this printed "87300%".
    expect(model.axisFormatters.y(soldiers.yValue)).toBe("65%");
    expect(model.axisFormatters.y(sailors.yValue)).toBe("35%");
    expect(model.axisFormatters.y(soldiers.yValue)).not.toContain("873");
  });

  it("keeps stack candidate y as the segment height (raw contribution)", () => {
    const model = runPipeline(
      gg([...naples], aes({ x: "squadron", fill: "role", weight: "men" }))
        .geomBar({ position: "stack" })
        .spec(),
      size,
    );
    const candidates = Array.from({ length: model.candidates.size }, (_, id) =>
      model.candidates.candidate(id),
    ).filter((c) => c !== null);
    const yValues = candidates.map((c) => c.yValue as number).toSorted((a, b) => a - b);
    expect(yValues[0]).toBeCloseTo(468, 8);
    expect(yValues[1]).toBeCloseTo(873, 8);
  });
});

describe("percent labels out-of-range advisory", () => {
  it("fires when labels are percent and the domain is not proportion-scale", () => {
    const model = runPipeline(
      gg(
        [
          { x: "a", y: 40 },
          { x: "b", y: 80 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomCol()
        .scales({ y: { labels: ".0%" } })
        .spec(),
      size,
    );
    expect(model.advisories.some((a) => a.code === "percent-labels-out-of-range")).toBe(true);
  });

  it("stays quiet for position fill with percent labels (domain ≈ [0,1])", () => {
    const model = runPipeline(
      gg([...naples], aes({ x: "squadron", fill: "role", weight: "men" }))
        .geomBar({ position: "fill" })
        .scales({ y: { labels: ".0%" } })
        .spec(),
      size,
    );
    expect(model.advisories.some((a) => a.code === "percent-labels-out-of-range")).toBe(false);
  });
});
