/**
 * Characterization tests for data-space position adjustments on LayerFrames.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "@ggsvelte/spec";

import { bindLayer } from "../src/pipeline/bind.ts";
import { buildFrame } from "../src/pipeline/frame.ts";
import { applyPosition } from "../src/pipeline/position.ts";
import { runPipeline } from "../src/pipeline.ts";
import { ColumnTable } from "../src/table.ts";
import type { Advisory } from "../src/pipeline/types.ts";

const size = { width: 640, height: 400 };

describe("applyPosition — stack/fill/dodge on bars", () => {
  it("stacks grouped cols from zero baseline into ymin/ymax", () => {
    const table = ColumnTable.fromRows([
      { g: "a", cls: "x", y: 1 },
      { g: "a", cls: "y", y: 2 },
      { g: "b", cls: "x", y: 3 },
      { g: "b", cls: "y", y: 4 },
    ]);
    const binding = bindLayer(
      {
        geom: "col",
        aes: { x: { field: "g" }, y: { field: "y" }, fill: { field: "cls" } },
        position: "stack",
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    applyPosition(frame, [], table);
    expect(frame.ymin).not.toBeNull();
    expect(frame.ymax).not.toBeNull();
    // per x slot, stacked totals equal group y sums
    // first-seen group order: x then y for each band
    expect(frame.n).toBe(4);
    for (let i = 0; i < frame.n; i++) {
      expect(frame.ymax![i]!).toBeGreaterThan(frame.ymin![i]!);
    }
  });

  it("dodges boxplots into per-slot indices", () => {
    const table = ColumnTable.fromRows([
      { g: "a", cls: "x", y: 1 },
      { g: "a", cls: "x", y: 2 },
      { g: "a", cls: "x", y: 3 },
      { g: "a", cls: "y", y: 4 },
      { g: "a", cls: "y", y: 5 },
      { g: "a", cls: "y", y: 6 },
    ]);
    const binding = bindLayer(
      {
        geom: "boxplot",
        aes: { x: { field: "g" }, y: { field: "y" }, fill: { field: "cls" } },
        position: "dodge",
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    applyPosition(frame, [], table);
    const slots = frame.dodgeSlot;
    expect(slots).not.toBeNull();
    expect(frame.dodgeSlotCounts).not.toBeNull();
    expect(new Set(slots ?? []).size).toBeGreaterThan(1);
  });
});

describe("applyPosition — jitter", () => {
  it("records seeded jitter advisory and offsets for points", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    const binding = bindLayer(
      {
        geom: "point",
        aes: { x: { field: "x" }, y: { field: "y" } },
        position: "jitter",
        positionParams: { seed: 7, width: 0.2, height: 0.2 },
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    const advisories: Advisory[] = [];
    applyPosition(frame, advisories, table);
    expect(frame.offsetX).not.toBeNull();
    expect(frame.offsetY).not.toBeNull();
    expect(advisories.some((a) => a.code === "jitter-seeded")).toBe(true);
  });
});

describe("applyPosition via runPipeline (regression)", () => {
  it("stacked cols force zero and produce rects", () => {
    const model = runPipeline(
      gg(
        [
          { g: "a", cls: "x", y: 1 },
          { g: "a", cls: "y", y: 2 },
        ],
        aes({ x: "g", y: "y", fill: "cls" }),
      )
        .geomCol({ position: "stack" })
        .spec(),
      size,
    );
    expect(model.scene.batches.some((b) => b.kind === "rects")).toBe(true);
    expect(model.advisories.some((a) => a.code === "zero-forced")).toBe(true);
  });
});
