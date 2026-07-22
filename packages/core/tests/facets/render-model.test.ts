/**
 * RenderModel memory + tooltip contract
 */
import { describe, expect, it } from "bun:test";
import { runPipeline } from "../../src/pipeline.ts";
import { size, wrapSpec } from "./fixtures.ts";

describe("RenderModel memory + tooltip contract", () => {
  it("row() reads source rows; layerFields lists mapped channels", () => {
    const model = runPipeline(wrapSpec(), size);
    expect(model.row(2)).toEqual({ x: 1, y: 30, g: "a", cls: "u" });
    expect(model.row(0xffffffff)).toBeNull();
    expect(model.layerFields[0]).toEqual([
      { channel: "x", field: "x" },
      { channel: "y", field: "y" },
      { channel: "color", field: "cls" },
    ]);
  });

  it("dispose() releases geometry and row access", () => {
    const model = runPipeline(wrapSpec(), size);
    expect(model.scene.batches.length).toBeGreaterThan(0);
    expect(model.candidates.candidate(0)).not.toBeNull();
    model.dispose();
    expect(model.scene.batches).toHaveLength(0);
    expect(model.candidates.size).toBe(0);
    expect(model.candidates.candidate(0)).toBeNull();
    expect(model.candidates.x).toHaveLength(0);
    expect(model.row(0)).toBeNull();
    model.dispose(); // idempotent
  });
});
