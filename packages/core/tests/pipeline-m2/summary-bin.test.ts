/**
 * M2 pipeline — stat summary_bin on point / line / errorbar (#817).
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { PipelineError, runPipeline } from "../../src/pipeline.ts";
import type { PathsBatch, PointsBatch, SegmentsBatch } from "../../src/scene.ts";
import { size } from "./fixtures.ts";

const data = {
  x: [0.5, 1.5, 1.6, 2.5, 2.4],
  y: [10, 20, 30, 40, 50],
};

describe("stat summary_bin (#817)", () => {
  it("errorbar summary_bin emits segments for non-empty bins", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomErrorbar({ stat: "summary_bin", binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as SegmentsBatch;
    expect(batch.kind).toBe("segments");
    // 3 non-empty bins → 3 vertical ranges (each errorbar = 3 segments typically)
    expect(batch.segments.length / 4).toBeGreaterThanOrEqual(3);
  });

  it("point summary_bin emits one mark per non-empty bin", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomPoint({ stat: "summary_bin", binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PointsBatch;
    expect(batch.kind).toBe("points");
    expect(batch.positions.length / 2).toBe(3);
  });

  it("line summary_bin connects bin centers", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomLine({ stat: "summary_bin", binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    const batch = model.scene.batches[0] as PathsBatch;
    expect(batch.kind).toBe("paths");
    // one open path with 3 vertices (non-empty bins)
    expect(batch.positions.length / 2).toBe(3);
    expect(batch.pathOffsets.length).toBe(2);
  });

  it("default bins emits advisory", () => {
    const model = runPipeline(
      gg(data, aes({ x: "x", y: "y" }))
        .geomPoint({ stat: "summary_bin" })
        .spec(),
      size,
    );
    expect(model.advisories.some((a) => a.code === "bin-default-bins")).toBe(true);
  });

  it("center + boundary is rejected", () => {
    expect(() =>
      runPipeline(
        gg(data, aes({ x: "x", y: "y" }))
          .geomPoint({
            stat: "summary_bin",
            binwidth: 1,
            center: 0,
            boundary: 0,
          })
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
  });

  it("discrete x is rejected", () => {
    expect(() =>
      runPipeline(
        gg({ x: ["a", "b", "a"], y: [1, 2, 3] }, aes({ x: "x", y: "y" }))
          .geomPoint({ stat: "summary_bin", bins: 5 })
          .spec(),
        size,
      ),
    ).toThrow(PipelineError);
  });
});
