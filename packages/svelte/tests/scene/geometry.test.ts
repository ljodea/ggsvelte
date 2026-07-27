import { describe, expect, it } from "vitest";

import {
  clamp,
  frozenZoomDomains,
  normalizedRect,
  panelBoundsFrom,
} from "../../src/lib/scene/geometry.js";

describe("clamp", () => {
  it("bounds values inclusively", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("frozenZoomDomains", () => {
  it("freezes the object and clones input arrays", () => {
    const x: [number, number] = [1, 2];
    const y: [number, number] = [3, 4];
    const frozen = frozenZoomDomains({ x, y });
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.x)).toBe(true);
    expect(Object.isFrozen(frozen.y)).toBe(true);
    expect(frozen.x).toEqual([1, 2]);
    expect(frozen.y).toEqual([3, 4]);
    expect(frozen.x).not.toBe(x);
    expect(frozen.y).not.toBe(y);
  });
});

describe("normalizedRect", () => {
  it("orders corners independently of drag direction", () => {
    expect(normalizedRect({ x0: 10, y0: 20, x1: 5, y1: 8 })).toEqual({
      x0: 5,
      y0: 8,
      x1: 10,
      y1: 20,
    });
  });
});

describe("panelBoundsFrom", () => {
  it("converts PlotRect bounds into xywh for clamp/center callers", () => {
    expect(panelBoundsFrom({ x0: 12, y0: 34, x1: 112, y1: 84 })).toEqual({
      x: 12,
      y: 34,
      width: 100,
      height: 50,
    });
  });

  it("handles a non-origin panel (faceted offset)", () => {
    expect(panelBoundsFrom({ x0: 200, y0: 100, x1: 380, y1: 280 })).toEqual({
      x: 200,
      y: 100,
      width: 180,
      height: 180,
    });
  });
});
