/**
 * pruneSpecData: spec payloads embedded into llms-full.txt are truncated to a
 * bounded row count while small specs stay byte-identical in structure.
 */
import { describe, expect, it } from "bun:test";

import { pruneSpecData } from "../gen-llms.ts";

describe("pruneSpecData", () => {
  it("truncates values rows and column arrays, reporting the pruned count", () => {
    const values = pruneSpecData(
      {
        data: { values: Array.from({ length: 50 }, (_, i) => ({ x: i })) },
        layers: [],
      },
      20,
    );
    expect(values.prunedRows).toBe(30);
    expect((values.spec as { data: { values: unknown[] } }).data.values).toHaveLength(20);
    const columns = pruneSpecData(
      {
        datasets: {
          d: { columns: { x: Array.from({ length: 25 }, (_, i) => i) } },
        },
        layers: [],
      },
      20,
    );
    expect(columns.prunedRows).toBe(5);
  });

  it("leaves small specs byte-identical in structure", () => {
    const spec = { data: { values: [{ x: 1 }] }, layers: [{ geom: "point" }] };
    expect(pruneSpecData(spec, 20).spec).toEqual(spec);
    expect(pruneSpecData(spec, 20).prunedRows).toBe(0);
  });
});
