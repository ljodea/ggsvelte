import { describe, expect, it } from "vitest";

import InteractionOverlay from "../../src/lib/scene/InteractionOverlay.svelte";
import {
  CROSSHAIR_BOX_GAP_PAD,
  HOVER_CROSSHAIR_GAP_RADIUS,
  glyphHoverBox,
} from "../../src/lib/scene/geometry.js";
import { render } from "../helpers/render.js";

function emptyDatum(anchor: { x: number; y: number }) {
  return {
    key: "a",
    row: { id: "a" },
    sourceKeys: ["a"] as const,
    lineageCount: 1,
    layerIndex: 0,
    panelId: "p0",
    fields: [],
    anchor,
  };
}

function modeInspection(mode: "exact" | "x" | "y" | "xy", focus: { x: number; y: number }) {
  return {
    type: "inspect" as const,
    phase: "change" as const,
    state: "transient" as const,
    source: "keyboard" as const,
    panelId: "p0",
    mode,
    focus: emptyDatum(focus),
    members: [emptyDatum(focus)] as const,
  };
}

function xyInspection(focus: { x: number; y: number }) {
  return modeInspection("xy", focus);
}

describe("InteractionOverlay crosshair glyph gaps (#1207)", () => {
  it("hard-gaps vertical guides through sibling label boxes", () => {
    const focus = { x: 120, y: 100 };
    const panel = { x: 40, y: 20, width: 200, height: 160 };
    const label = { x: 100, y: 40, width: 40, height: 14 };
    const inspection = xyInspection(focus);

    const { container } = render(InteractionOverlay, {
      width: 280,
      height: 220,
      interactive: true,
      inspection,
      inspectionPanel: panel,
      hoverChrome: "ring",
      crosshairGapObstacles: [label],
    });

    const vertical = [...container.querySelectorAll<SVGLineElement>(".gg-crosshair")].filter(
      (line) => Number(line.getAttribute("x1")) === Number(line.getAttribute("x2")),
    );
    expect(vertical.length).toBeGreaterThanOrEqual(3);

    const pad = CROSSHAIR_BOX_GAP_PAD;
    const holeLo = label.y - pad;
    const holeHi = label.y + label.height + pad;
    for (const line of vertical) {
      const y1 = Number(line.getAttribute("y1"));
      const y2 = Number(line.getAttribute("y2"));
      const lo = Math.min(y1, y2);
      const hi = Math.max(y1, y2);
      expect(lo < holeHi && hi > holeLo).toBe(false);
    }

    // Focus ring gap still present.
    for (const line of vertical) {
      const y1 = Number(line.getAttribute("y1"));
      const y2 = Number(line.getAttribute("y2"));
      const lo = Math.min(y1, y2);
      const hi = Math.max(y1, y2);
      const coversFocus =
        lo < focus.y + HOVER_CROSSHAIR_GAP_RADIUS && hi > focus.y - HOVER_CROSSHAIR_GAP_RADIUS;
      expect(coversFocus).toBe(false);
    }
  });
});

describe("InteractionOverlay glyph box chrome", () => {
  it("paints a measured hover box for glyph inspection (not a point ring)", () => {
    const focus = { x: 80, y: 60 };
    const panel = { x: 20, y: 10, width: 160, height: 120 };
    const boxW = 36;
    const boxH = 14;
    const { container } = render(InteractionOverlay, {
      width: 220,
      height: 160,
      interactive: true,
      inspection: xyInspection(focus),
      inspectionPanel: panel,
      hoverChrome: "box",
      hoverBoxWidth: boxW,
      hoverBoxHeight: boxH,
      hoverBoxAnchor: "middle",
    });

    expect(container.querySelector(".gg-hover-ring")).toBeNull();
    const box = container.querySelector<SVGRectElement>(".gg-hover-box");
    expect(box).not.toBeNull();
    const expected = glyphHoverBox(focus, {
      width: boxW,
      height: boxH,
      textAnchor: "middle",
    });
    expect(Number(box?.getAttribute("x"))).toBeCloseTo(expected.x, 5);
    expect(Number(box?.getAttribute("y"))).toBeCloseTo(expected.y, 5);
    expect(Number(box?.getAttribute("width"))).toBe(boxW);
    expect(Number(box?.getAttribute("height"))).toBe(boxH);
  });

  it("paints selected and emphasized glyph boxes from presentation anchors", () => {
    const selected = {
      x: 50,
      y: 40,
      chrome: "box" as const,
      width: 28,
      height: 12,
      textAnchor: "start" as const,
    };
    const emphasized = {
      x: 90,
      y: 70,
      chrome: "box" as const,
      width: 40,
      height: 16,
      textAnchor: "end" as const,
    };
    const { container } = render(InteractionOverlay, {
      width: 200,
      height: 140,
      interactive: false,
      selectedAnchors: [selected],
      emphasizedAnchors: [emphasized],
    });

    const selectedBox = container.querySelector<SVGRectElement>(".gg-selected-box");
    const emphasizedBox = container.querySelector<SVGRectElement>(".gg-emphasized-box");
    expect(selectedBox).not.toBeNull();
    expect(emphasizedBox).not.toBeNull();

    const expectedSelected = glyphHoverBox(selected, {
      width: selected.width,
      height: selected.height,
      textAnchor: selected.textAnchor,
    });
    const expectedEmphasized = glyphHoverBox(emphasized, {
      width: emphasized.width,
      height: emphasized.height,
      textAnchor: emphasized.textAnchor,
    });
    expect(Number(selectedBox?.getAttribute("x"))).toBeCloseTo(expectedSelected.x, 5);
    expect(Number(selectedBox?.getAttribute("width"))).toBe(selected.width);
    expect(Number(emphasizedBox?.getAttribute("x"))).toBeCloseTo(expectedEmphasized.x, 5);
    expect(Number(emphasizedBox?.getAttribute("width"))).toBe(emphasized.width);
  });
});

describe("InteractionOverlay inspect guide axes", () => {
  const panel = { x: 40, y: 20, width: 200, height: 160 };
  const focus = { x: 120, y: 100 };

  function countGuides(mode: "exact" | "x" | "y" | "xy", coordFlipped: boolean) {
    const { container } = render(InteractionOverlay, {
      width: 280,
      height: 220,
      interactive: true,
      inspection: modeInspection(mode, focus),
      inspectionPanel: panel,
      coordFlipped,
      hoverChrome: "none",
    });
    const lines = [...container.querySelectorAll<SVGLineElement>(".gg-crosshair")];
    const vertical = lines.filter(
      (line) => Number(line.getAttribute("x1")) === Number(line.getAttribute("x2")),
    ).length;
    const horizontal = lines.filter(
      (line) => Number(line.getAttribute("y1")) === Number(line.getAttribute("y2")),
    ).length;
    return { vertical, horizontal };
  }

  it("paints no guides for exact, both for xy, and swaps x/y under flip", () => {
    expect(countGuides("exact", false)).toEqual({ vertical: 0, horizontal: 0 });
    expect(countGuides("exact", true)).toEqual({ vertical: 0, horizontal: 0 });
    expect(countGuides("xy", false).vertical).toBeGreaterThan(0);
    expect(countGuides("xy", false).horizontal).toBeGreaterThan(0);
    expect(countGuides("x", false).vertical).toBeGreaterThan(0);
    expect(countGuides("x", false).horizontal).toBe(0);
    expect(countGuides("x", true).vertical).toBe(0);
    expect(countGuides("x", true).horizontal).toBeGreaterThan(0);
    expect(countGuides("y", false).vertical).toBe(0);
    expect(countGuides("y", false).horizontal).toBeGreaterThan(0);
    expect(countGuides("y", true).vertical).toBeGreaterThan(0);
    expect(countGuides("y", true).horizontal).toBe(0);
  });
});
