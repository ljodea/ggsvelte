/**
 * Source-row lineage: one owned conversion seam (#626).
 * FinalizedLayerFrame is the post-assembly contract (null lineage is typed out).
 */
import { describe, expect, it } from "bun:test";

import type { FinalizedLayerFrame, LayerFrame } from "../src/pipeline/types-layer-frame.ts";
import { NO_ROW } from "../src/pipeline/types-no-row.ts";

describe("globalSourceRowForInputRow", () => {
  it("returns the finalized global id for a panel-local input row", async () => {
    const { globalSourceRowForInputRow } = await import("../src/pipeline/source-row-lineage.ts");
    const frame = { inputSourceRows: [100, 200, 300] } as FinalizedLayerFrame;
    expect(globalSourceRowForInputRow(frame, 1)).toBe(200);
  });

  it("throws when panel-local row is out of range", async () => {
    const { globalSourceRowForInputRow, SourceRowLineageError } =
      await import("../src/pipeline/source-row-lineage.ts");
    const frame = { inputSourceRows: [100] } as FinalizedLayerFrame;
    expect(() => globalSourceRowForInputRow(frame, 5)).toThrow(SourceRowLineageError);
  });
});

describe("finalizeFrameSourceRows", () => {
  it("sets inputSourceRows and returns FinalizedLayerFrame", async () => {
    const { finalizeFrameSourceRows } = await import("../src/pipeline/source-row-lineage.ts");
    const rowIndex = new Uint32Array([0, 1, NO_ROW]);
    const outlierRow = new Uint32Array([1]);
    const frame = {
      inputSourceRows: null,
      rowIndex,
      box: { outlierRow },
      bin: null,
      dodge: null,
      smooth: null,
    } as LayerFrame;
    const finalized = finalizeFrameSourceRows(frame, { globalSourceRows: [10, 20] });
    expect(finalized.inputSourceRows).toEqual([10, 20]);
    // Same object, narrowed type: lineage is non-null.
    expect(finalized).toBe(frame);
    expect([...rowIndex]).toEqual([10, 20, NO_ROW]);
    expect([...outlierRow]).toEqual([20]);
  });

  it("does not require box payload when outliers are absent", async () => {
    const { finalizeFrameSourceRows } = await import("../src/pipeline/source-row-lineage.ts");
    const rowIndex = new Uint32Array([0]);
    const frame = {
      inputSourceRows: null,
      rowIndex,
      box: null,
      bin: null,
      dodge: null,
      smooth: null,
    } as LayerFrame;
    const finalized = finalizeFrameSourceRows(frame, { globalSourceRows: [42] });
    expect(finalized.inputSourceRows).toEqual([42]);
    expect([...rowIndex]).toEqual([42]);
  });
});

describe("LayerFrame payload seam", () => {
  it("core + payloads are distinct optional slots (empty extras)", async () => {
    const { emptyFrameExtras } = await import("../src/pipeline/frame-helpers.ts");
    const extras = emptyFrameExtras();
    expect(extras.bin).toBeNull();
    expect(extras.dodge).toBeNull();
    expect(extras.box).toBeNull();
    expect(extras.smooth).toBeNull();
    // Flat geom fields no longer exist on the shared extras bag.
    expect("xBinId" in extras).toBe(false);
    expect("dodgeSlot" in extras).toBe(false);
    expect("smoothBand" in extras).toBe(false);
  });
});
