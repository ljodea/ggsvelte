import { describe, expect, it } from "vitest";

import {
  brushAtPoint,
  brushWithEnd,
  evaluatePointerBrushEnd,
  nudgeBrushEnd,
  panelCenterAnchor,
} from "../src/lib/plot-area-brush.js";

const panel = { x: 10, y: 20, width: 100, height: 50 };

describe("brushAtPoint", () => {
  it("creates a degenerate brush", () => {
    expect(brushAtPoint({ x: 3, y: 4 })).toEqual({ x0: 3, y0: 4, x1: 3, y1: 4 });
  });
});

describe("brushWithEnd", () => {
  it("updates only the free corner", () => {
    expect(brushWithEnd({ x0: 1, y0: 2, x1: 1, y1: 2 }, { x: 9, y: 8 })).toEqual({
      x0: 1,
      y0: 2,
      x1: 9,
      y1: 8,
    });
  });
});

describe("nudgeBrushEnd", () => {
  it("clamps the free corner to the panel", () => {
    const corners = { x0: 50, y0: 40, x1: 50, y1: 40 };
    expect(nudgeBrushEnd(corners, 1000, 0, panel)).toEqual({
      x0: 50,
      y0: 40,
      x1: 110,
      y1: 40,
    });
    expect(nudgeBrushEnd(corners, 0, -1000, panel)).toEqual({
      x0: 50,
      y0: 40,
      x1: 50,
      y1: 20,
    });
  });

  it("applies finite steps without normalizing", () => {
    // reverse-direction free corner stays denormalized
    expect(nudgeBrushEnd({ x0: 50, y0: 40, x1: 50, y1: 40 }, -5, 3, panel)).toEqual({
      x0: 50,
      y0: 40,
      x1: 45,
      y1: 43,
    });
  });
});

describe("evaluatePointerBrushEnd", () => {
  it("keeps a normalized draft when both spans are under the min", () => {
    const result = evaluatePointerBrushEnd({ x0: 10, y0: 10, x1: 10, y1: 10 }, { x: 12, y: 12 });
    expect(result).toEqual({
      kind: "too-small",
      corners: { x0: 10, y0: 10, x1: 12, y1: 12 },
    });
  });

  it("normalizes reverse brushes on commit", () => {
    const result = evaluatePointerBrushEnd({ x0: 20, y0: 30, x1: 20, y1: 30 }, { x: 5, y: 8 });
    expect(result).toEqual({
      kind: "commit",
      rect: { x0: 5, y0: 8, x1: 20, y1: 30 },
    });
  });

  it("commits when only one axis is thin (existing min-size rule)", () => {
    const result = evaluatePointerBrushEnd({ x0: 0, y0: 0, x1: 0, y1: 0 }, { x: 10, y: 1 });
    expect(result.kind).toBe("commit");
  });
});

describe("panelCenterAnchor", () => {
  it("uses panel center or origin when missing", () => {
    const missing: Parameters<typeof panelCenterAnchor>[0] = undefined;
    expect(panelCenterAnchor(missing)).toEqual({ x: 0, y: 0 });
    expect(panelCenterAnchor(panel)).toEqual({ x: 60, y: 45 });
  });
});
