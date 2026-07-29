import { describe, expect, it } from "vitest";

import {
  clamp,
  frozenZoomDomains,
  gappedCrosshairSegments,
  HOVER_CROSSHAIR_GAP_RADIUS,
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

describe("gappedCrosshairSegments", () => {
  const panel = { x: 40, y: 20, width: 200, height: 160 };
  const focus = { x: 120, y: 100 };

  it("exports a gap that clears the default hover ring (r=6 + stroke)", () => {
    // Ring is r=6 with 1.5 stroke; gap must sit outside the ring so guides
    // never paint through the focused mark under the halo.
    expect(HOVER_CROSSHAIR_GAP_RADIUS).toBeGreaterThanOrEqual(7.5);
  });

  it("splits a vertical guide around the focus gap", () => {
    expect(gappedCrosshairSegments("vertical", focus, panel, HOVER_CROSSHAIR_GAP_RADIUS)).toEqual([
      {
        x1: 120,
        y1: 20,
        x2: 120,
        y2: 100 - HOVER_CROSSHAIR_GAP_RADIUS,
      },
      {
        x1: 120,
        y1: 100 + HOVER_CROSSHAIR_GAP_RADIUS,
        x2: 120,
        y2: 180,
      },
    ]);
  });

  it("splits a horizontal guide around the focus gap", () => {
    expect(gappedCrosshairSegments("horizontal", focus, panel, HOVER_CROSSHAIR_GAP_RADIUS)).toEqual(
      [
        {
          x1: 40,
          y1: 100,
          x2: 120 - HOVER_CROSSHAIR_GAP_RADIUS,
          y2: 100,
        },
        {
          x1: 120 + HOVER_CROSSHAIR_GAP_RADIUS,
          y1: 100,
          x2: 240,
          y2: 100,
        },
      ],
    );
  });

  it("returns one continuous segment when gapRadius is 0 (rect hoverChrome)", () => {
    expect(gappedCrosshairSegments("vertical", focus, panel, 0)).toEqual([
      { x1: 120, y1: 20, x2: 120, y2: 180 },
    ]);
    expect(gappedCrosshairSegments("horizontal", focus, panel, 0)).toEqual([
      { x1: 40, y1: 100, x2: 240, y2: 100 },
    ]);
  });

  it("drops a segment when the focus sits against a panel edge", () => {
    const top = { x: 120, y: panel.y + 2 };
    const segs = gappedCrosshairSegments("vertical", top, panel, HOVER_CROSSHAIR_GAP_RADIUS);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({
      x1: 120,
      y1: top.y + HOVER_CROSSHAIR_GAP_RADIUS,
      x2: 120,
      y2: 180,
    });
  });

  it("never emits zero-length or inverted segments", () => {
    const center = { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
    for (const axis of ["vertical", "horizontal"] as const) {
      for (const gap of [0, HOVER_CROSSHAIR_GAP_RADIUS, 40, 500]) {
        for (const seg of gappedCrosshairSegments(axis, center, panel, gap)) {
          const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
          expect(len).toBeGreaterThan(0);
        }
      }
    }
  });
});
