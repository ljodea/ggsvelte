import { describe, expect, it } from "vitest";

import {
  clamp,
  expandIntervalQuery,
  frozenZoomDomains,
  invertedDomain,
  normalizedRect,
  panelContainingAnchor,
  panelDataDomains,
} from "../src/lib/plot-geometry.js";

const continuousScale = (domain: [number, number]) => {
  const [d0, d1] = domain;
  const span = d1 - d0;
  return {
    type: "continuous" as const,
    invert: (t: number) => d0 + t * span,
  };
};

const bandScale = {
  type: "band" as const,
  invert: (_t: number) => 0,
};

describe("clamp", () => {
  it("bounds values inclusively", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("panelContainingAnchor", () => {
  const panels = [
    { id: "a", x: 0, y: 0, width: 100, height: 50 },
    { id: "b", x: 100, y: 0, width: 100, height: 50 },
  ];

  it("returns the first panel whose inclusive bounds contain the anchor", () => {
    expect(panelContainingAnchor(panels, { x: 50, y: 25 })?.id).toBe("a");
    expect(panelContainingAnchor(panels, { x: 100, y: 0 })?.id).toBe("a"); // shared edge → first
    expect(panelContainingAnchor(panels, { x: 150, y: 25 })?.id).toBe("b");
    expect(panelContainingAnchor(panels, { x: 200, y: 50 })?.id).toBe("b"); // far corner inclusive
  });

  it("returns null when no panel contains the point or panels are empty", () => {
    expect(panelContainingAnchor(panels, { x: -1, y: 0 })).toBeNull();
    expect(panelContainingAnchor(panels, { x: 50, y: 51 })).toBeNull();
    expect(panelContainingAnchor([], { x: 0, y: 0 })).toBeNull();
  });
});

describe("invertedDomain", () => {
  it("returns undefined for band scales", () => {
    expect(invertedDomain(bandScale as never, 0.2, 0.8)).toBeUndefined();
  });

  it("inverts continuous domains and sorts endpoints", () => {
    const scale = continuousScale([0, 100]);
    expect(invertedDomain(scale as never, 0.2, 0.8)).toEqual([20, 80]);
    expect(invertedDomain(scale as never, 0.8, 0.2)).toEqual([20, 80]);
  });

  it("handles reversed continuous domains", () => {
    const scale = continuousScale([100, 0]);
    expect(invertedDomain(scale as never, 0.25, 0.75)).toEqual([25, 75]);
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
    x[0] = 99;
    y[0] = 99;
    expect(frozen.x).toEqual([1, 2]);
    expect(frozen.y).toEqual([3, 4]);
  });

  it("omits missing channels", () => {
    const frozen = frozenZoomDomains({ x: [0, 1] });
    expect(frozen.x).toEqual([0, 1]);
    expect(frozen.y).toBeUndefined();
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

describe("panelDataDomains", () => {
  const panel = { x: 40, y: 20, width: 200, height: 100 };
  const scales = {
    x: continuousScale([0, 10]) as never,
    y: continuousScale([0, 50]) as never,
  };

  it("maps a full panel rect to full scale domains", () => {
    const domains = panelDataDomains({ x0: 40, y0: 20, x1: 240, y1: 120 }, panel, scales, false);
    expect(domains.x?.[0]).toBeCloseTo(0);
    expect(domains.x?.[1]).toBeCloseTo(10);
    expect(domains.y?.[0]).toBeCloseTo(0);
    expect(domains.y?.[1]).toBeCloseTo(50);
  });

  it("clips out-of-panel coordinates", () => {
    const domains = panelDataDomains({ x0: -100, y0: -50, x1: 400, y1: 400 }, panel, scales, false);
    expect(domains.x?.[0]).toBeCloseTo(0);
    expect(domains.x?.[1]).toBeCloseTo(10);
    expect(domains.y?.[0]).toBeCloseTo(0);
    expect(domains.y?.[1]).toBeCloseTo(50);
  });

  it("remaps channels when flipped", () => {
    // Left half of panel, full vertical → horizontal half of y scale when flipped.
    const domains = panelDataDomains({ x0: 40, y0: 20, x1: 140, y1: 120 }, panel, scales, true);
    // Screen-x half → y data domain (scale y inverted with tx)
    expect(domains.y?.[0]).toBeCloseTo(0);
    expect(domains.y?.[1]).toBeCloseTo(25);
    // Screen-y full → x data domain (scale x inverted with ty)
    expect(domains.x?.[0]).toBeCloseTo(0);
    expect(domains.x?.[1]).toBeCloseTo(10);
  });

  it("omits band-scale channels", () => {
    const mixed = {
      x: bandScale as never,
      y: continuousScale([0, 50]) as never,
    };
    const domains = panelDataDomains({ x0: 40, y0: 20, x1: 240, y1: 120 }, panel, mixed, false);
    expect(domains.x).toBeUndefined();
    expect(domains.y?.[0]).toBeCloseTo(0);
    expect(domains.y?.[1]).toBeCloseTo(50);
  });
});

describe("expandIntervalQuery", () => {
  const panel = { x: 10, y: 20, width: 100, height: 50 };
  const rect = { x0: 30, y0: 25, x1: 70, y1: 55 };

  it("returns the rect unchanged when panel is absent", () => {
    expect(expandIntervalQuery(rect, undefined, "x", false)).toEqual(rect);
  });

  it("expands the free axis for x/y modes and swaps under flip", () => {
    expect(expandIntervalQuery(rect, panel, "x", false)).toEqual({
      ...rect,
      y0: 20,
      y1: 70,
    });
    expect(expandIntervalQuery(rect, panel, "y", false)).toEqual({
      ...rect,
      x0: 10,
      x1: 110,
    });
    // Flipped: x-mode expands horizontal (panel x span); y-mode expands vertical.
    expect(expandIntervalQuery(rect, panel, "x", true)).toEqual({
      ...rect,
      x0: 10,
      x1: 110,
    });
    expect(expandIntervalQuery(rect, panel, "y", true)).toEqual({
      ...rect,
      y0: 20,
      y1: 70,
    });
  });

  it("leaves xy mode unexpanded", () => {
    expect(expandIntervalQuery(rect, panel, "xy", false)).toEqual(rect);
    expect(expandIntervalQuery(rect, panel, "xy", true)).toEqual(rect);
  });
});
