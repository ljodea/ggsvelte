/**
 * after_stat color/fill diagnostics (#915).
 *
 * Only density_2d / density_2d_filled wire an after_stat column into
 * color/fill (`frame-stats-density-2d.ts` — every other frame builds
 * color/fill from the mapped *field* alone). Elsewhere an `{ stat }` colour
 * mapping was accepted and then silently dropped, with no diagnostic.
 */
import { describe, expect, it } from "bun:test";
import { aes, gg } from "@ggsvelte/spec";
import { runPipeline } from "../src/pipeline.ts";

const size = { width: 400, height: 300 };

function statChannelWarnings(warnings: readonly { code: string; message: string }[]): string[] {
  return warnings.filter((w) => w.code === "stat-channel-unsupported").map((w) => w.message);
}

function cloud(n: number): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    x.push(Math.cos(i) * 2);
    y.push(Math.sin(i * 1.7) * 2);
  }
  return { x, y };
}

describe("after_stat color/fill (#915)", () => {
  it("warns when a stat does not publish the after_stat fill column", () => {
    const model = runPipeline(
      gg({ x: [1, 2, 2, 3, 3, 3] }, aes({ x: "x", fill: { stat: "count" } }))
        .geomHistogram({ binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    const messages = statChannelWarnings(model.warnings);
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("fill");
    expect(messages[0]).toContain("count");
    // Diagnostic only — the layer still renders exactly as before.
    expect(model.scene.batches.length).toBeGreaterThan(0);
  });

  it("warns for after_stat color on a stat with no colour outputs", () => {
    const model = runPipeline(
      gg({ x: [1, 2, 3], y: [1, 2, 3] }, aes({ x: "x", y: "y", color: { stat: "y" } }))
        .geomPoint({ stat: "summary_bin", binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    expect(statChannelWarnings(model.warnings).length).toBe(1);
  });

  it("stays silent for density_2d_filled fill = after_stat(level)", () => {
    const model = runPipeline(
      gg(cloud(60), aes({ x: "x", y: "y" }))
        .geomDensity2dFilled({ n: 20, bins: 4 })
        .spec(),
      size,
    );
    expect(statChannelWarnings(model.warnings)).toEqual([]);
  });

  it("stays silent for density_2d color = after_stat(level)", () => {
    const model = runPipeline(
      gg(cloud(60), aes({ x: "x", y: "y", color: { stat: "level" } }))
        .geomDensity2d({ n: 20, bins: 4 })
        .spec(),
      size,
    );
    expect(statChannelWarnings(model.warnings)).toEqual([]);
  });

  it("warns for an unknown column even on density_2d_filled", () => {
    const model = runPipeline(
      gg(cloud(60), aes({ x: "x", y: "y", fill: { stat: "bogus" } }))
        .geomDensity2dFilled({ n: 20, bins: 4 })
        .spec(),
      size,
    );
    const messages = statChannelWarnings(model.warnings);
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("bogus");
  });

  it("does not warn for ordinary field-mapped fill", () => {
    const model = runPipeline(
      gg({ x: [1, 2, 3], g: ["a", "b", "a"] }, aes({ x: "x", fill: "g" }))
        .geomHistogram({ binwidth: 1, boundary: 0 })
        .spec(),
      size,
    );
    expect(statChannelWarnings(model.warnings)).toEqual([]);
  });
});
