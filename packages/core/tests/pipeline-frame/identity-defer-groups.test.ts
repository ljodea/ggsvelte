/**
 * Identity scatter does not bucket by group at draw time. buildFrame must
 * not intern discrete color into a per-row id vector unless something
 * reads groups (inspect / identity index).
 */
import { describe, expect, it } from "bun:test";

import { bindLayer } from "../../src/pipeline/bind-layer.ts";
import { buildFrame, deriveLayerGroups } from "../../src/pipeline/frame.ts";
import { ColumnTable } from "../../src/table.ts";

function pointBinding(table: ColumnTable) {
  return bindLayer(
    {
      geom: "point",
      aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
    },
    0,
    table,
    [],
  );
}

function isDeferredGroups(frame: { groups: readonly number[] }): boolean {
  return typeof Object.getOwnPropertyDescriptor(frame, "groups")?.get === "function";
}

describe("buildFrame — defer groups on identity scatter", () => {
  const table = ColumnTable.fromRows([
    { x: 1, y: 2, c: "red" },
    { x: 3, y: 4, c: "blue" },
    { x: 5, y: 6, c: "red" },
  ]);

  it("does not intern group ids until groups are read", () => {
    const binding = pointBinding(table);
    const frame = buildFrame(binding, table, [], []);
    expect(isDeferredGroups(frame)).toBe(true);
    expect(typeof Object.getOwnPropertyDescriptor(frame, "inputGroups")?.get).toBe("function");
  });

  it("still interns groups eagerly for identity geom_line", () => {
    const binding = bindLayer(
      {
        geom: "line",
        aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
      },
      0,
      table,
      [],
    );
    const frame = buildFrame(binding, table, [], []);
    expect(isDeferredGroups(frame)).toBe(false);
    expect(frame.groups).toEqual([0, 1, 0]);
  });

  it("resolves the same first-seen ids as eager deriveLayerGroups", () => {
    const binding = pointBinding(table);
    const frame = buildFrame(binding, table, [], []);
    expect([...frame.inputGroups]).toEqual([0, 1, 0]);
    expect([...frame.groups]).toEqual(deriveLayerGroups(binding, table));
  });
});
