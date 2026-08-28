import { describe, expect, it } from "vitest";

import { buildLegendEntryKeyIndexForPlot } from "../../src/lib/legend/entry-key-index.js";
import { keysForLegendEntry } from "../../src/lib/legend/focus.js";
import { discreteFill } from "./focus-fixtures.js";

describe("buildLegendEntryKeyIndexForPlot", () => {
  it("returns an empty map when model is null", () => {
    expect(
      buildLegendEntryKeyIndexForPlot({
        model: null,
        semanticKey: () => "k",
      }).size,
    ).toBe(0);
  });

  it("indexes keys from id-ascending candidates with field mappings", () => {
    const candidates = [
      { layerIndex: 0, lineage: 0, rowIndex: 0 },
      { layerIndex: 0, lineage: 1, rowIndex: 1 },
    ];
    const index = buildLegendEntryKeyIndexForPlot({
      model: {
        scene: { legends: [discreteFill] },
        candidates: {
          size: candidates.length,
          candidate: (id) => candidates[id] ?? null,
        },
        layerFields: [[{ channel: "fill", field: "channel" }]],
        layerScaledConstants: [undefined],
        lineage: {
          keys: (lineageId) => (lineageId === 0 ? [0] : lineageId === 1 ? [1] : []),
        },
        row: (rowIndex) =>
          rowIndex === 0 ? { channel: "web" } : rowIndex === 1 ? { channel: "store" } : null,
      },
      semanticKey: (rowIndex) => (rowIndex === 0 ? "k-web" : rowIndex === 1 ? "k-store" : null),
    });
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 0 })).toEqual(["k-web"]);
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 1 })).toEqual(["k-store"]);
  });

  it("reads layerScaledConstants through the plot adapter when constants are present", () => {
    // Constant-only fill (no field mapping) — ForPlot must forward scaled constants.
    const candidates = [{ layerIndex: 0, lineage: 0, rowIndex: 0 }];
    const index = buildLegendEntryKeyIndexForPlot({
      model: {
        scene: { legends: [discreteFill] },
        candidates: {
          size: candidates.length,
          candidate: (id) => candidates[id] ?? null,
        },
        layerFields: [[]],
        layerScaledConstants: [{ fill: "web" }],
        lineage: { keys: () => [0] },
        row: () => ({ id: "row-0" }),
      },
      semanticKey: () => "k-const",
    });
    expect(keysForLegendEntry(index, { scale: "fill", entryIndex: 0 })).toEqual(["k-const"]);
  });
});
