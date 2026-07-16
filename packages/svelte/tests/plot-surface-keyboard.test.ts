import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../src/lib/interaction.js";
import type { BrushCorners } from "../src/lib/plot-area-brush.js";
import {
  resolveSurfaceKeyAction,
  type SurfaceKeyboardInput,
} from "../src/lib/plot-surface-keyboard.js";

const draft: BrushCorners = { x0: 10, y0: 20, x1: 40, y1: 50 };
/** Reversed corners — pure table must normalize before finish routing. */
const reversedDraft: BrushCorners = { x0: 40, y0: 50, x1: 10, y1: 20 };
/** Zero-size draft — keyboard still commits (no too-small evaluation). */
const zeroDraft: BrushCorners = { x0: 5, y0: 5, x1: 5, y1: 5 };

const panel = { x: 0, y: 0, width: 100, height: 80 };
/** Interior free corner so unclamped ±1/±10 steps stay in-bounds. */
const draftInterior: BrushCorners = { x0: 10, y0: 20, x1: 50, y1: 40 };

const base = (
  overrides: Partial<SurfaceKeyboardInput> & Pick<SurfaceKeyboardInput, "key" | "activeTool">,
): SurfaceKeyboardInput => ({
  shiftKey: false,
  brushCorners: null,
  hasInspection: false,
  pinEnabled: false,
  // Meaningful only when hasInspection (toggle-point-keys); unused otherwise.
  focusKey: null,
  sourceKeys: [],
  // Meaningful for begin-area / nudge; unused otherwise.
  inspectionAnchor: null,
  inspectionPanel: null,
  firstPanel: undefined,
  ...overrides,
});

describe("resolveSurfaceKeyAction", () => {
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

  describe("inspection navigation", () => {
    it("cycles coincident hits with [ and ]", () => {
      expect(resolveSurfaceKeyAction(base({ key: "]", activeTool: "inspect" }))).toEqual({
        preventDefault: true,
        action: { type: "cycle-coincident", delta: 1 },
      });
      expect(resolveSurfaceKeyAction(base({ key: "[", activeTool: "point" }))).toEqual({
        preventDefault: true,
        action: { type: "cycle-coincident", delta: -1 },
      });
    });

    it("maps Arrow keys to navigation deltas", () => {
      expect(resolveSurfaceKeyAction(base({ key: "ArrowDown", activeTool: "inspect" }))).toEqual({
        preventDefault: true,
        action: { type: "navigate-direction", dx: 0, dy: 1 },
      });
    });
  });

  describe("Enter / Space priority", () => {
    it("point tool + inspection toggles point keys (wins over pin) with focus key", () => {
      expect(
        resolveSurfaceKeyAction(
          base({
            key: "Enter",
            activeTool: "point",
            hasInspection: true,
            pinEnabled: true,
            focusKey: "row-a",
            sourceKeys: ["row-a", "row-b"],
          }),
        ),
      ).toEqual({
        preventDefault: true,
        action: { type: "toggle-point-keys", keys: ["row-a"] },
      });
    });

    it("toggle-point-keys uses sourceKeys when focusKey is null", () => {
      expect(
        resolveSurfaceKeyAction(
          base({
            key: " ",
            activeTool: "point",
            hasInspection: true,
            focusKey: null,
            sourceKeys: ["group-1", "group-2"],
          }),
        ),
      ).toEqual({
        preventDefault: true,
        action: { type: "toggle-point-keys", keys: ["group-1", "group-2"] },
      });
    });

    it("inspect tool + pin toggles pin when inspection is active", () => {
      expect(
        resolveSurfaceKeyAction(
          base({
            key: " ",
            activeTool: "inspect",
            hasInspection: true,
            pinEnabled: true,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        action: { type: "toggle-pin" },
      });
    });

    it("Enter without inspection is a no-op even when pin is enabled", () => {
      expect(
        resolveSurfaceKeyAction(
          base({
            key: "Enter",
            activeTool: "inspect",
            hasInspection: false,
            pinEnabled: true,
          }),
        ),
      ).toEqual({ preventDefault: false, action: { type: "none" } });
    });

    it("area Enter wins over point/pin semantics", () => {
      // activeTool is area; hasInspection/pin would not matter
      expect(
        resolveSurfaceKeyAction(
          base({
            key: "Enter",
            activeTool: "select-area",
            brushCorners: null,
            hasInspection: true,
            pinEnabled: true,
          }),
        ).action.type,
      ).toBe("begin-area");
    });
  });

  describe("Escape", () => {
    it("returns to inspect when area tool has no draft", () => {
      expect(resolveSurfaceKeyAction(base({ key: "Escape", activeTool: "select-area" }))).toEqual({
        preventDefault: true,
        action: { type: "escape", returnToInspect: true },
      });
    });

    it("does not return to inspect when a brush draft is active", () => {
      expect(
        resolveSurfaceKeyAction(
          base({
            key: "Escape",
            activeTool: "zoom-area",
            brushCorners: draft,
          }),
        ),
      ).toEqual({
        preventDefault: true,
        action: { type: "escape", returnToInspect: false },
      });
    });

    it("does not return to inspect for non-area tools", () => {
      expect(resolveSurfaceKeyAction(base({ key: "Escape", activeTool: "inspect" }))).toEqual({
        preventDefault: true,
        action: { type: "escape", returnToInspect: false },
      });
    });
  });

  describe("unrelated keys", () => {
    it("leaves non-interaction keys unhandled", () => {
      for (const key of ["a", "Tab", "F1", "Meta"] as const) {
        expect(resolveSurfaceKeyAction(base({ key, activeTool: "inspect" }))).toEqual({
          preventDefault: false,
          action: { type: "none" },
        });
      }
    });
  });

  describe("tools matrix smoke", () => {
    const tools: InteractionTool[] = ["inspect", "point", "select-area", "zoom-area"];
    it("never throws for common keys across tools", () => {
      for (const activeTool of tools) {
        for (const key of ["ArrowLeft", "Enter", " ", "Escape", "[", "]", "x"]) {
          expect(() =>
            resolveSurfaceKeyAction(
              base({
                key,
                activeTool,
                brushCorners: draft,
                hasInspection: true,
                pinEnabled: true,
              }),
            ),
          ).not.toThrow();
        }
      }
    });
  });
});
