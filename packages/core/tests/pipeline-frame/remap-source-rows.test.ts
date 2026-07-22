/**
 * remapSourceRows unit characterization.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame, remapSourceRows } from "../../src/pipeline/frame.ts";
import { NO_ROW } from "../../src/pipeline/types.ts";
import { ColumnTable } from "../../src/table.ts";

describe("remapSourceRows", () => {
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
    remapSourceRows(frame, [10, 20]);
    expect(frame.rowIndex[0]).toBe(10);
    expect(frame.rowIndex[1]).toBe(NO_ROW);
  });
});
