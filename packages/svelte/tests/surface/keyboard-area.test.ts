/**
 * Keyboard decision tables for area tools (draft nudge/complete and begin-area).
 */
import { describe, expect, it } from "vitest";

import { resolveSurfaceKeyAction } from "../../src/lib/surface/keyboard.js";
import {
  base,
  draft,
  draftInterior,
  panel,
  reversedDraft,
  zeroDraft,
} from "./keyboard-fixtures.js";

describe("area tools with brush draft", () => {
  it.each(["select-area", "zoom-area"] as const)(
    "%s Arrow keys nudge free corner with clamped corners payload (shift steps by 10)",
    (tool) => {
      expect(
        resolveSurfaceKeyAction(
          base({
            key: "ArrowRight",
            activeTool: tool,
            brushCorners: draftInterior,
            firstPanel: panel,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        action: {
          type: "nudge-brush",
          corners: { x0: 10, y0: 20, x1: 51, y1: 40 },
        },
      });
      expect(
        resolveSurfaceKeyAction(
          base({
            key: "ArrowUp",
            shiftKey: true,
            activeTool: tool,
            brushCorners: draftInterior,
            firstPanel: panel,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        action: {
          type: "nudge-brush",
          corners: { x0: 10, y0: 20, x1: 50, y1: 30 },
        },
      });
    },
  );

  it("prefers inspectionPanel over firstPanel for nudge clamp", () => {
    const inspectionOnly = { x: 0, y: 0, width: 20, height: 20 };
    const firstOnly = { x: 0, y: 0, width: 1000, height: 1000 };
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "ArrowRight",
          activeTool: "select-area",
          brushCorners: { x0: 5, y0: 5, x1: 10, y1: 10 },
          inspectionPanel: inspectionOnly,
          firstPanel: firstOnly,
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: {
        type: "nudge-brush",
        // free corner clamps to inspection panel right edge (20), not 1000
        corners: { x0: 5, y0: 5, x1: 11, y1: 10 },
      },
    });
    // Prove first-only would not clamp at 20: large step hits inspection edge.
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "ArrowRight",
          shiftKey: true,
          activeTool: "select-area",
          brushCorners: { x0: 5, y0: 5, x1: 15, y1: 10 },
          inspectionPanel: inspectionOnly,
          firstPanel: firstOnly,
        }),
      ).action,
    ).toEqual({
      type: "nudge-brush",
      corners: { x0: 5, y0: 5, x1: 20, y1: 10 },
    });
  });

  it("preserves startsWith('Arrow') for nonstandard keys (zero deltas, same corners)", () => {
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "ArrowDiagonal",
          activeTool: "select-area",
          brushCorners: draftInterior,
          firstPanel: panel,
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: {
        type: "nudge-brush",
        corners: draftInterior,
      },
    });
  });

  it("swallows arrow when draft exists but no panel is available", () => {
    // Keyboard begin-area with no model can leave a draft at {0,0} without panels.
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "ArrowRight",
          activeTool: "select-area",
          brushCorners: draft,
          inspectionPanel: null,
          firstPanel: undefined,
        }),
      ),
    ).toEqual({ preventDefault: true, action: { type: "none" } });
  });

  it("select-area Enter completes with select-end finish (normalized rect)", () => {
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "Enter",
          activeTool: "select-area",
          brushCorners: draft,
          hasInspection: true,
          pinEnabled: true,
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: {
        type: "complete-area",
        finish: {
          type: "select-end",
          rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
        },
      },
    });
  });

  it("zoom-area Space completes with zoom-end finish", () => {
    expect(
      resolveSurfaceKeyAction(base({ key: " ", activeTool: "zoom-area", brushCorners: draft })),
    ).toEqual({
      preventDefault: true,
      action: {
        type: "complete-area",
        finish: {
          type: "zoom-end",
          rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
        },
      },
    });
  });

  it("normalizes reversed corners before finish routing", () => {
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "Enter",
          activeTool: "select-area",
          brushCorners: reversedDraft,
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: {
        type: "complete-area",
        finish: {
          type: "select-end",
          rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
        },
      },
    });
  });

  it("keyboard commits zero-size drafts (no too-small evaluation)", () => {
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "Enter",
          activeTool: "select-area",
          brushCorners: zeroDraft,
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: {
        type: "complete-area",
        finish: {
          type: "select-end",
          rect: { x0: 5, y0: 5, x1: 5, y1: 5 },
        },
      },
    });
  });
});

describe("area tools without draft", () => {
  it("Enter/Space begins an area brush with inspection anchor when present", () => {
    expect(
      resolveSurfaceKeyAction(
        base({
          key: "Enter",
          activeTool: "select-area",
          inspectionAnchor: { x: 12, y: 34 },
          firstPanel: { x: 0, y: 0, width: 100, height: 80 },
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: { type: "begin-area", anchor: { x: 12, y: 34 } },
    });
  });

  it("begin-area falls back to panel center when no inspection anchor", () => {
    expect(
      resolveSurfaceKeyAction(
        base({
          key: " ",
          activeTool: "zoom-area",
          inspectionAnchor: null,
          firstPanel: { x: 10, y: 20, width: 100, height: 80 },
        }),
      ),
    ).toEqual({
      preventDefault: true,
      action: { type: "begin-area", anchor: { x: 60, y: 60 } },
    });
  });

  it("begin-area uses {0,0} when no anchor and no panel", () => {
    expect(resolveSurfaceKeyAction(base({ key: "Enter", activeTool: "select-area" }))).toEqual({
      preventDefault: true,
      action: { type: "begin-area", anchor: { x: 0, y: 0 } },
    });
  });

  it("Arrow without draft falls through to inspection navigation", () => {
    expect(resolveSurfaceKeyAction(base({ key: "ArrowLeft", activeTool: "zoom-area" }))).toEqual({
      preventDefault: true,
      action: { type: "navigate-direction", dx: -1, dy: 0 },
    });
  });
});
