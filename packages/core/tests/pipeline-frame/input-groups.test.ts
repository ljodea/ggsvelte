/**
 * buildFrame pre-stat inputGroups (issue #217).
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame, deriveLayerGroups } from "../../src/pipeline/frame.ts";
import { ColumnTable } from "../../src/table.ts";

describe("buildFrame — pre-stat inputGroups (issue #217)", () => {
  it("retains pre-stat groups on identity frames (same as post-stat groups)", () => {
    const table = ColumnTable.fromRows([
      { x: "a", c: "red", y: 1 },
      { x: "b", c: "blue", y: 2 },
      { x: "a", c: "red", y: 3 },
    ]);
    const binding = bindLayer(
      {
        geom: "point",
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    const expected = deriveLayerGroups(binding, table);
    // Known first-seen group ids for discrete x × color (decision 0005).
    expect(expected).toEqual([0, 1, 0]);
    expect([...frame.inputGroups]).toEqual([0, 1, 0]);
    expect([...frame.groups]).toEqual([0, 1, 0]);
  });

  it("retains pre-stat groups on count frames (distinct from post-stat groups)", () => {
    // Two source rows share (g, fill) so count collapses 4 rows → 3 marks.
    const table = ColumnTable.fromRows([
      { g: "a", fill: "x" },
      { g: "a", fill: "x" },
      { g: "a", fill: "y" },
      { g: "b", fill: "x" },
    ]);
    const binding = bindLayer(
      {
        geom: "bar",
        aes: { x: { field: "g" }, fill: { field: "fill" }, y: { stat: "count" } },
        stat: "count",
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    // Pre-stat: one id per source row; post-stat: one id per aggregated mark.
    expect(frame.inputGroups).toHaveLength(table.rowCount);
    expect(frame.groups).toHaveLength(frame.n);
    expect(frame.n).toBe(3);
    expect(frame.n).toBeLessThan(table.rowCount);
    expect([...frame.inputGroups]).toEqual(deriveLayerGroups(binding, table));
    // First-seen interaction of discrete x × fill: a|x=0, a|y=1, b|x=2.
    expect([...frame.inputGroups]).toEqual([0, 0, 1, 2]);
  });
});
