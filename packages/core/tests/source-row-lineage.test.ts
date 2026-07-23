/**
 * Source-row lineage: one owned conversion seam (#626).
 */
import { describe, expect, it } from "bun:test";

import type { LayerFrame } from "../src/pipeline/types-layer-frame.ts";
import { NO_ROW } from "../src/pipeline/types-no-row.ts";

describe("globalSourceRowForInputRow", () => {
  it("returns the finalized global id for a panel-local input row", async () => {
    const { globalSourceRowForInputRow } = await import("../src/pipeline/source-row-lineage.ts");
    const frame = { inputSourceRows: [100, 200, 300] } as LayerFrame;
    expect(globalSourceRowForInputRow(frame, 1)).toBe(200);
  });

  it("throws when inputSourceRows was not finalized", async () => {
    const { globalSourceRowForInputRow, SourceRowLineageError } =
      await import("../src/pipeline/source-row-lineage.ts");
    const frame = { inputSourceRows: null } as LayerFrame;
    expect(() => globalSourceRowForInputRow(frame, 0)).toThrow(SourceRowLineageError);
  });
});

describe("finalizeFrameSourceRows", () => {
  it("sets inputSourceRows and remaps mark rows to global ids", async () => {
    const { finalizeFrameSourceRows } = await import("../src/pipeline/source-row-lineage.ts");
    const rowIndex = new Uint32Array([0, 1, NO_ROW]);
    const outlierRow = new Uint32Array([1]);
    const frame = {
      inputSourceRows: null,
      rowIndex,
      box: { outlierRow },
    } as LayerFrame;
    finalizeFrameSourceRows(frame, { globalSourceRows: [10, 20] });
    expect(frame.inputSourceRows).toEqual([10, 20]);
    expect([...rowIndex]).toEqual([10, 20, NO_ROW]);
    expect([...outlierRow]).toEqual([20]);
  });
});
