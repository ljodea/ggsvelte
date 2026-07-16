/**
 * Characterization tests for domain snapshots and RenderModel assembly.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { runPipeline } from "../src/pipeline.ts";
import { computeEffectiveDomains } from "../src/pipeline/compute-domains.ts";
import { trainContinuous } from "../src/scales/train.ts";

const size = { width: 640, height: 400 };

describe("computeEffectiveDomains", () => {
  it("freezes x/y and per-panel domain snapshots", () => {
    const x = trainContinuous([Float64Array.of(1, 2, 3)], { type: "linear" }).scale;
    const y = trainContinuous([Float64Array.of(10, 20)], { type: "linear" }).scale;
    const snap = computeEffectiveDomains(x, y, [{ x, y }]);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.panels)).toBe(true);
    expect(snap.x.length).toBe(2);
    expect(typeof snap.x[0]).toBe("number");
    expect(snap.panels).toHaveLength(1);
  });
});

describe("assembleRenderModel via runPipeline", () => {
  it("exposes dispose that clears batches and nulls row lookup", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 3 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    expect(model.scene.batches.length).toBeGreaterThan(0);
    expect(model.row(0)).not.toBeNull();
    model.dispose();
    expect(model.scene.batches).toHaveLength(0);
    expect(model.row(0)).toBeNull();
    // dispose is idempotent
    model.dispose();
    expect(model.scene.batches).toHaveLength(0);
  });

  it("keeps baseline and effective domain snapshots on the model", () => {
    const model = runPipeline(
      gg(
        [
          { x: 1, y: 2 },
          { x: 2, y: 4 },
        ],
        aes({ x: "x", y: "y" }),
      )
        .geomPoint()
        .spec(),
      size,
    );
    expect(model.domains.effective.x.length).toBeGreaterThan(0);
    expect(model.domains.baseline.x.length).toBeGreaterThan(0);
  });
});
