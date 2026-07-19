import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import type { CandidateFacts } from "@ggsvelte/core";
import { hitFromCandidate, plotPointFromClient } from "../../src/lib/surface/plot-px.js";

describe("plotPointFromClient", () => {
  it("maps client coordinates into scene space", () => {
    expect(
      plotPointFromClient(
        150,
        120,
        { left: 100, top: 100, width: 200, height: 100 },
        { width: 400, height: 200 },
      ),
    ).toEqual({ x: 100, y: 40 });
  });

  it("returns origin when the element has zero size", () => {
    expect(
      plotPointFromClient(
        10,
        10,
        { left: 0, top: 0, width: 0, height: 50 },
        { width: 400, height: 200 },
      ),
    ).toEqual({ x: 0, y: 0 });
    expect(
      plotPointFromClient(
        10,
        10,
        { left: 0, top: 0, width: 50, height: 0 },
        { width: 400, height: 200 },
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it("does not clamp out-of-bounds client coordinates", () => {
    expect(
      plotPointFromClient(
        50,
        50,
        { left: 100, top: 100, width: 100, height: 100 },
        { width: 100, height: 100 },
      ),
    ).toEqual({ x: -50, y: -50 });
  });
});

describe("hitFromCandidate", () => {
  it("copies hit fields from a candidate", () => {
    const candidate = fromPartial<CandidateFacts>({
      layerIndex: 2,
      panelIndex: 1,
      rowIndex: 7,
      x: 12.5,
      y: 44,
      kind: "line",
    });
    expect(hitFromCandidate(candidate)).toEqual({
      layerIndex: 2,
      panelIndex: 1,
      rowIndex: 7,
      x: 12.5,
      y: 44,
      kind: "line",
    });
  });
});
