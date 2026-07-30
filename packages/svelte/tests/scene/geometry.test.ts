import { describe, expect, it } from "vitest";

import {
  clamp,
  CROSSHAIR_BOX_GAP_PAD,
  crosshairGapForBox,
  crosshairGlyphObstacles,
  frozenZoomDomains,
  gappedCrosshairSegments,
  gappedCrosshairSegmentsWithObstacles,
  glyphExtentsFromBatch,
  glyphHoverBox,
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

  // Interval rewrite pin: strict `gapTop > panel.y` drops the leading segment when
  // the hole starts exactly at the panel edge (not when it starts one px below).
  it("drops the leading segment when the focus gap starts exactly at the panel edge", () => {
    const edgeFocus = { x: 120, y: panel.y + HOVER_CROSSHAIR_GAP_RADIUS };
    const segs = gappedCrosshairSegments("vertical", edgeFocus, panel, HOVER_CROSSHAIR_GAP_RADIUS);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({
      x1: 120,
      y1: edgeFocus.y + HOVER_CROSSHAIR_GAP_RADIUS,
      x2: 120,
      y2: 180,
    });
  });
});

describe("gappedCrosshairSegmentsWithObstacles", () => {
  const panel = { x: 40, y: 20, width: 200, height: 160 };
  const focus = { x: 120, y: 100 };

  it("matches the focus-only path when obstacles are empty", () => {
    expect(
      gappedCrosshairSegmentsWithObstacles(
        "vertical",
        focus,
        panel,
        HOVER_CROSSHAIR_GAP_RADIUS,
        [],
      ),
    ).toEqual(gappedCrosshairSegments("vertical", focus, panel, HOVER_CROSSHAIR_GAP_RADIUS));
  });

  it("cuts a vertical guide around a sibling label box above the focus", () => {
    // Label offset above the point (dy < 0); guide still at focus.x.
    const label = { x: 100, y: 40, width: 40, height: 14 };
    const segs = gappedCrosshairSegmentsWithObstacles(
      "vertical",
      focus,
      panel,
      HOVER_CROSSHAIR_GAP_RADIUS,
      [label],
    );
    const pad = CROSSHAIR_BOX_GAP_PAD;
    // Hole spans the padded label y-range; no segment may cover y in that range.
    const holeLo = label.y - pad;
    const holeHi = label.y + label.height + pad;
    for (const seg of segs) {
      const lo = Math.min(seg.y1, seg.y2);
      const hi = Math.max(seg.y1, seg.y2);
      const overlaps = lo < holeHi && hi > holeLo;
      expect(overlaps).toBe(false);
    }
    // Focus gap still present.
    for (const seg of segs) {
      const lo = Math.min(seg.y1, seg.y2);
      const hi = Math.max(seg.y1, seg.y2);
      expect(
        lo >= focus.y + HOVER_CROSSHAIR_GAP_RADIUS || hi <= focus.y - HOVER_CROSSHAIR_GAP_RADIUS,
      ).toBe(true);
    }
    // Both guides remain (label hole + focus hole → at least 3 vertical pieces when interior).
    expect(segs.length).toBeGreaterThanOrEqual(3);
  });

  it("ignores boxes the guide line does not intersect", () => {
    const far = { x: 200, y: 40, width: 30, height: 12 };
    expect(
      gappedCrosshairSegmentsWithObstacles("vertical", focus, panel, HOVER_CROSSHAIR_GAP_RADIUS, [
        far,
      ]),
    ).toEqual(gappedCrosshairSegments("vertical", focus, panel, HOVER_CROSSHAIR_GAP_RADIUS));
  });

  it("merges overlapping obstacle holes into one gap", () => {
    const a = { x: 110, y: 30, width: 20, height: 20 };
    const b = { x: 105, y: 40, width: 30, height: 20 }; // overlaps a in y
    const segs = gappedCrosshairSegmentsWithObstacles("vertical", focus, panel, 0, [a, b]);
    // gapRadius 0: only obstacle holes. Merged hole → two segments (above + below).
    expect(segs).toHaveLength(2);
    expect(segs[0]!.y1).toBe(panel.y);
    expect(segs[1]!.y2).toBe(panel.y + panel.height);
  });

  it("gaps a horizontal guide around an intersecting box", () => {
    const label = { x: 150, y: 90, width: 40, height: 20 };
    const segs = gappedCrosshairSegmentsWithObstacles(
      "horizontal",
      focus,
      panel,
      HOVER_CROSSHAIR_GAP_RADIUS,
      [label],
    );
    const pad = CROSSHAIR_BOX_GAP_PAD;
    const holeLo = label.x - pad;
    const holeHi = label.x + label.width + pad;
    for (const seg of segs) {
      const lo = Math.min(seg.x1, seg.x2);
      const hi = Math.max(seg.x1, seg.x2);
      expect(lo < holeHi && hi > holeLo).toBe(false);
    }
  });

  it("union of focus box diagonal gap and the focus glyph obstacle is a no-op widen", () => {
    // hoverChrome === "box": crosshairGapForBox already clears the half-diagonal;
    // the same glyph also lands in the obstacle list. Union must not shrink the hole.
    const box = { x: focus.x - 20, y: focus.y - 8, width: 40, height: 16 };
    const gap = crosshairGapForBox(box.width, box.height);
    const withObstacles = gappedCrosshairSegmentsWithObstacles("vertical", focus, panel, gap, [
      box,
    ]);
    const focusOnly = gappedCrosshairSegments("vertical", focus, panel, gap);
    // Same outer endpoints (panel edge → hole edge).
    expect(withObstacles[0]?.y1).toBe(focusOnly[0]?.y1);
    expect(withObstacles[withObstacles.length - 1]?.y2).toBe(focusOnly[focusOnly.length - 1]?.y2);
    // Obstacle pad is smaller than the diagonal gap, so segment count matches.
    expect(withObstacles).toHaveLength(focusOnly.length);
  });
});

describe("crosshairGlyphObstacles", () => {
  const panels = [
    { id: "p0", x: 10, y: 20 },
    { id: "p1", x: 300, y: 20 },
  ];

  it("converts panel-local glyph positions to plot-space boxes for the focus panel only", () => {
    const batches = [
      {
        kind: "glyphs",
        panelIndex: 0,
        positions: new Float32Array([50, 30, 80, 60]),
        boxWidths: new Float32Array([40, 20]),
        boxHeights: new Float32Array([12, 10]),
        anchor: "middle" as const,
      },
      {
        kind: "glyphs",
        panelIndex: 1,
        positions: new Float32Array([5, 5]),
        boxWidths: new Float32Array([10]),
        boxHeights: new Float32Array([8]),
        anchor: "middle" as const,
      },
      {
        kind: "points",
        panelIndex: 0,
        positions: new Float32Array([1, 2]),
      },
    ];
    const boxes = crosshairGlyphObstacles(batches, panels, "p0");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toEqual(glyphHoverBox({ x: 10 + 50, y: 20 + 30 }, { width: 40, height: 12 }));
    expect(boxes[1]).toEqual(glyphHoverBox({ x: 10 + 80, y: 20 + 60 }, { width: 20, height: 10 }));
  });

  it("skips glyphs without measured extents", () => {
    const batches = [
      {
        kind: "glyphs",
        panelIndex: 0,
        positions: new Float32Array([10, 10]),
        // no boxWidths / boxHeights
      },
    ];
    expect(crosshairGlyphObstacles(batches, panels, "p0")).toEqual([]);
  });

  it("includes uninspectable-capable glyphs via scene walk (not candidate store)", () => {
    // Doc contract: collector must see every painted glyph batch. Candidate store
    // skips uninspectable layers (#1065); scene walk must not.
    const batches = [
      {
        kind: "glyphs",
        panelIndex: 0,
        positions: new Float32Array([0, 0]),
        boxWidths: new Float32Array([24]),
        boxHeights: new Float32Array([10]),
        anchor: "start" as const,
      },
    ];
    expect(crosshairGlyphObstacles(batches, panels, "p0")).toEqual([
      glyphHoverBox({ x: 10, y: 20 }, { width: 24, height: 10, textAnchor: "start" }),
    ]);
  });
});

describe("glyphHoverBox / glyphExtentsFromBatch", () => {
  it("centers a middle-anchored box on the focus point", () => {
    expect(glyphHoverBox({ x: 100, y: 50 }, { width: 40, height: 12 })).toEqual({
      x: 80,
      y: 44,
      width: 40,
      height: 12,
    });
  });

  it("respects start and end text anchors", () => {
    expect(
      glyphHoverBox({ x: 100, y: 50 }, { width: 40, height: 12, textAnchor: "start" }),
    ).toEqual({ x: 100, y: 44, width: 40, height: 12 });
    expect(glyphHoverBox({ x: 100, y: 50 }, { width: 40, height: 12, textAnchor: "end" })).toEqual({
      x: 60,
      y: 44,
      width: 40,
      height: 12,
    });
  });

  it("reads measured extents from a glyphs batch", () => {
    expect(
      glyphExtentsFromBatch(
        {
          kind: "glyphs",
          boxWidths: [24, 48],
          boxHeights: [10, 14],
          anchor: "start",
        },
        1,
      ),
    ).toEqual({ width: 48, height: 14, textAnchor: "start" });
    expect(glyphExtentsFromBatch({ kind: "points" }, 0)).toBeNull();
  });

  it("sizes the crosshair gap to clear the box diagonal", () => {
    expect(crosshairGapForBox(30, 16)).toBeCloseTo(Math.hypot(15, 8) + 2);
  });
});
