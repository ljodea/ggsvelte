import { describe, expect, it } from "bun:test";
import { fromAny } from "@total-typescript/shoehorn";

import { runPipeline } from "../../src/pipeline.js";

import { size } from "./fixtures.ts";

describe("ordinal color scales", () => {
  it("groups lines by inferred ordinal color from domainMode grow", () => {
    const model = runPipeline(
      fromAny({
        data: {
          values: [
            { x: 1, y: 1, c: 1 },
            { x: 2, y: 2, c: 2 },
            { x: 3, y: 3, c: 1 },
          ],
        },
        layers: [
          {
            geom: "line",
            aes: { x: { field: "x" }, y: { field: "y" }, color: { field: "c" } },
          },
        ],
        scales: { color: { domainMode: "grow" } },
      }),
      size,
    );
    expect(model.scales.color?.kind).toBe("ordinal");
    const batch = model.scene.batches.find((candidate) => candidate.kind === "paths");
    expect(batch?.kind).toBe("paths");
    if (batch?.kind !== "paths") throw new Error("expected paths");
    expect(batch.pathOffsets.length).toBe(3); // two series + terminal
  });
});
