/**
 * Shared helpers for candidate-construction characterization tests.
 */
import { spyOn } from "bun:test";

import { ColumnTable } from "../../src/table.ts";

export const size = { width: 640, height: 400 };

/** Count ColumnTable.column(field) calls during fn (restored after). */
export function countColumnReads(field: string, fn: () => void): number {
  let reads = 0;
  const desc = Object.getOwnPropertyDescriptor(ColumnTable.prototype, "column");
  if (desc?.value === undefined) {
    throw new Error("ColumnTable.prototype.column is not a data property");
  }
  const impl = desc.value as (this: ColumnTable, name: string) => readonly unknown[];
  const spy = spyOn(ColumnTable.prototype, "column").mockImplementation(function (
    this: ColumnTable,
    name: string,
  ) {
    if (name === field) reads += 1;
    return impl.call(this, name);
  });
  try {
    fn();
    return reads;
  } finally {
    spy.mockRestore();
  }
}
