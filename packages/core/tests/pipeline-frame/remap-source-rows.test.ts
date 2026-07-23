/**
 * finalizeFrameSourceRows characterization (formerly remapSourceRows).
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame } from "../../src/pipeline/frame.ts";
import { finalizeFrameSourceRows } from "../../src/pipeline/source-row-lineage.ts";
import { NO_ROW } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";

describe("finalizeFrameSourceRows", () => {
  it("rewrites local panel rows to source rows, leaving NO_ROW alone", () => {
    const table = ColumnTable.fromRows([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    const binding = bindLayer(
      { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    frame.rowIndex[0] = 0;
    frame.rowIndex[1] = NO_ROW;
    finalizeFrameSourceRows(frame, { globalSourceRows: [10, 20] });
    expect(frame.rowIndex[0]).toBe(10);
    expect(frame.rowIndex[1]).toBe(NO_ROW);
    expect(frame.inputSourceRows).toEqual([10, 20]);
  });
});
