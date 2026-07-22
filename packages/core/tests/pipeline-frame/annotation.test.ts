/**
 * buildFrame annotation-rule characterization.
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind.ts";
import { buildFrame } from "../../src/pipeline/frame.ts";
import { ColumnTable } from "../../src/table.ts";

describe("buildFrame — annotation rules", () => {
  it("stores intercepts with zero data rows", () => {
    const table = ColumnTable.fromRows([{ x: 1, y: 2 }]);
    const binding = bindLayer(
      { geom: "rule", params: { yintercept: [1, 2], xintercept: 0.5 } },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBe(0);
    expect(frame.yIntercepts).toEqual([1, 2]);
    expect(frame.xIntercepts).toEqual([0.5]);
  });

  it("keeps inputGroups empty over a non-empty source table", () => {
    // Annotation frames are rowless (n=0); pre-stat groups must stay empty so
    // the identity index does not retain O(source rows) memberships for them.
    const table = ColumnTable.fromRows([
      { x: 1, y: 2, g: "a" },
      { x: 2, y: 3, g: "b" },
      { x: 3, y: 4, g: "a" },
    ]);
    const binding = bindLayer(
      { geom: "rule", params: { yintercept: 1 }, aes: { color: { field: "g" } } },
      0,
      table,
      [],
    );
    expect(binding.ruleForm).toBe("annotation");
    const frame = buildFrame(binding, table, [], []);
    expect(frame.n).toBe(0);
    expect(frame.inputGroups).toEqual([]);
  });
});
