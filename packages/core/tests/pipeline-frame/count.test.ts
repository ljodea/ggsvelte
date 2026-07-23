/**
 * buildFrame count-stat characterization.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame } from "../../src/pipeline/frame.ts";
import { NO_ROW } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";
import type { PipelineWarning } from "../../src/pipeline/types.ts";

describe("buildFrame — count stat", () => {
  it("synthesizes NO_ROW indices and count y for bar", () => {
    const table = ColumnTable.fromRows([{ g: "a" }, { g: "a" }, { g: "b" }]);
    const warnings: PipelineWarning[] = [];
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "g" }, y: { stat: "count" } },
        stat: "count",
      },
      0,
      table,
      warnings,
    );
    const frame = buildFrame(binding, table, warnings, []);
    expect(frame.n).toBe(2);
    expect([...frame.rowIndex].every((r) => r === NO_ROW)).toBe(true);
    // counts: a=2, b=1 (order is first-seen)
    expect(frame.yNumeric).not.toBeNull();
    expect([...frame.yNumeric!].toSorted((a, b) => a - b)).toEqual([1, 2]);
  });
});
