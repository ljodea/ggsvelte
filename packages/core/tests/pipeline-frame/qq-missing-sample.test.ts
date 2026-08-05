/**
 * buildQqFrame / buildQqLineFrame empty-sample defensive path.
 * Public bind rejects missing sample; these unit tests call the frame
 * builders with sampleField null so the empty-frame contract stays locked.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind-layer.ts";
import { buildQqFrame, buildQqLineFrame } from "../../src/pipeline/frame-stats-qq.ts";
import type { PipelineWarning } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";

const table = ColumnTable.fromRows([{ y: 1 }, { y: 2 }, { y: 3 }]);

function qqBinding() {
  return bindLayer({ geom: "qq", aes: { sample: { field: "y" } }, stat: "qq" }, 0, table, []);
}

function qqLineBinding() {
  return bindLayer(
    { geom: "qq_line", aes: { sample: { field: "y" } }, stat: "qq_line" },
    0,
    table,
    [],
  );
}

describe("buildQqFrame / buildQqLineFrame missing sample", () => {
  it("returns an empty qq frame without warnings when sampleField is null", () => {
    const warnings: PipelineWarning[] = [];
    const binding = { ...qqBinding(), sampleField: null };
    const frame = buildQqFrame(binding, table, [], warnings);
    expect(frame.n).toBe(0);
    expect(frame.xNumeric).not.toBeNull();
    expect(frame.xNumeric!.length).toBe(0);
    expect(frame.yNumeric).not.toBeNull();
    expect(frame.yNumeric!.length).toBe(0);
    expect(warnings).toEqual([]);
  });

  it("returns an empty qq_line frame without warnings when sampleField is null", () => {
    const warnings: PipelineWarning[] = [];
    const binding = { ...qqLineBinding(), sampleField: null };
    const frame = buildQqLineFrame(binding, table, [], warnings);
    expect(frame.n).toBe(0);
    expect(frame.xNumeric!.length).toBe(0);
    expect(frame.yNumeric!.length).toBe(0);
    expect(warnings).toEqual([]);
  });

  it("builds theoretical x and sample y for a finite sample", () => {
    const warnings: PipelineWarning[] = [];
    const frame = buildQqFrame(qqBinding(), table, [0, 0, 0], warnings);
    expect(frame.n).toBe(3);
    expect(frame.xNumeric!.length).toBe(3);
    expect(frame.yNumeric!.length).toBe(3);
    // samples are finite; theoretical quantiles span below/above 0 for n=3
    expect([...frame.yNumeric!].every((v) => Number.isFinite(v))).toBe(true);
    expect([...frame.xNumeric!].every((v) => Number.isFinite(v))).toBe(true);
    expect(Math.min(...frame.xNumeric!)).toBeLessThan(0);
    expect(Math.max(...frame.xNumeric!)).toBeGreaterThan(0);
  });

  it("qq_line builds a two-point theoretical/sample frame", () => {
    const frame = buildQqLineFrame(qqLineBinding(), table, [0, 0, 0], []);
    // Reference line is two endpoints spanning the sample quantiles.
    expect(frame.n).toBe(2);
    expect(frame.xNumeric!.length).toBe(2);
    expect(frame.yNumeric!.length).toBe(2);
    expect([...frame.xNumeric!, ...frame.yNumeric!].every((v) => Number.isFinite(v))).toBe(true);
  });
});
