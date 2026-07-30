import { describe, expect, it } from "vitest";

import InteractionOverlay from "../../src/lib/scene/InteractionOverlay.svelte";
import { CROSSHAIR_BOX_GAP_PAD, HOVER_CROSSHAIR_GAP_RADIUS } from "../../src/lib/scene/geometry.js";
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

describe("InteractionOverlay crosshair glyph gaps (#1207)", () => {
  it("hard-gaps vertical guides through sibling label boxes", () => {
    const focus = { x: 120, y: 100 };
    const panel = { x: 40, y: 20, width: 200, height: 160 };
    const label = { x: 100, y: 40, width: 40, height: 14 };
    const inspection = {
      type: "inspect" as const,
      phase: "change" as const,
      state: "transient" as const,
      source: "keyboard" as const,
      panelId: "p0",
      mode: "xy" as const,
      focus: emptyDatum(focus),
      members: [emptyDatum(focus)] as const,
    };

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
