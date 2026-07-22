/**
 * buildFrame identity-stat characterization.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame } from "../../src/pipeline/frame.ts";
import { ColumnTable } from "../../src/table.ts";
import type { Advisory, PipelineWarning } from "../../src/pipeline/types.ts";

describe("buildFrame — identity", () => {
  it("maps source rows through identity stat", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const warnings: PipelineWarning[] = [];
    const advisories: Advisory[] = [];
    const binding = bindLayer(
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
      0,
      table,
      warnings,
    );
    const frame = buildFrame(binding, table, warnings, advisories);
    expect(frame.n).toBe(2);
    expect([...frame.rowIndex]).toEqual([0, 1]);
    expect(frame.xNumeric?.[0]).toBe(1);
    expect(frame.yNumeric?.[1]).toBe(20);
    expect(frame.box).toBeNull();
  });
});
