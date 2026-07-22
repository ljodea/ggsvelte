/**
 * Pure unit tests for pointer-down / pointer-up / lost-capture tables.
 */
import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../../src/lib/interaction/interaction.js";
import {
  resolveLostPointerCaptureAction,
  resolvePointerDownAction,
  resolvePointerUpAction,
} from "../../src/lib/surface/pointer.js";

import { defaultInspect, down, draftCorners, up } from "./pointer-fixtures.js";

describe("resolvePointerDownAction", () => {
  it("starts touch-inspect before button/tool checks (non-primary button still starts)", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "inspect",
          pointerType: "touch",
          button: 1,
        }),
      ),
    ).toEqual({ type: "touch-inspect-start" });
  });

  it("ignores non-primary button for area tools", () => {
    expect(resolvePointerDownAction(down({ activeTool: "select-area", button: 2 }))).toEqual({
      type: "none",
    });
  });

  it.each(["inspect", "point"] as const)("ignores non-area tool %s on primary button", (tool) => {
    expect(resolvePointerDownAction(down({ activeTool: tool }))).toEqual({
      type: "none",
    });
  });

  it.each(["select-area", "zoom-area"] as const)(
    "%s begins a new area draft with degenerate corners when not extending",
    (tool: InteractionTool) => {
      expect(resolvePointerDownAction(down({ activeTool: tool }))).toEqual({
        type: "begin-area",
        corners: { x0: 9, y0: 8, x1: 9, y1: 8 },
        emitSelectStart: tool === "select-area",
        source: "pointer",
      });
    },
  );

  it("extends free corner when awaiting second AND draft exists", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          areaAwaitingSecond: true,
          brushCorners: { x0: 1, y0: 2, x1: 3, y1: 4 },
          point: { x: 9, y: 8 },
        }),
      ),
    ).toEqual({
      type: "begin-area",
      corners: { x0: 1, y0: 2, x1: 9, y1: 8 },
      emitSelectStart: false,
      source: "pointer",
    });
  });

  it("starts fresh when awaiting second but draft is missing", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "zoom-area",
          areaAwaitingSecond: true,
          brushCorners: null,
          point: { x: 5, y: 6 },
        }),
      ),
    ).toEqual({
      type: "begin-area",
      corners: { x0: 5, y0: 6, x1: 5, y1: 6 },
      emitSelectStart: false,
      source: "pointer",
    });
  });

  it("restarts fresh when draft exists but reducer is not awaiting second", () => {
    // Regression: draft alone must not extend — both gates required.
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          areaAwaitingSecond: false,
          brushCorners: { x0: 1, y0: 2, x1: 3, y1: 4 },
          point: { x: 9, y: 8 },
        }),
      ),
    ).toEqual({
      type: "begin-area",
      corners: { x0: 9, y0: 8, x1: 9, y1: 8 },
      emitSelectStart: true,
      source: "pointer",
    });
  });

  it("maps begin-area source from pointerType (touch vs mouse)", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          pointerType: "touch",
        }),
      ),
    ).toEqual({
      type: "begin-area",
      corners: { x0: 9, y0: 8, x1: 9, y1: 8 },
      emitSelectStart: true,
      source: "touch",
    });
  });
});

describe("resolvePointerUpAction", () => {
  it("resolves touch inspect tap with state/mode/maxDistance from inspect snapshot", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspect: { mode: "xy", maxDistance: 16, pin: true },
          hasTouchInspectStart: true,
          touchInspectMoved: false,
        }),
      ),
    ).toEqual({
      type: "touch-inspect-tap",
      state: "pinned",
      mode: "xy",
      maxDistance: 16,
    });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspect: { mode: "auto", maxDistance: 24, pin: false },
          hasTouchInspectStart: true,
          touchInspectMoved: false,
        }),
      ),
    ).toEqual({
      type: "touch-inspect-tap",
      state: "transient",
      mode: "auto",
      maxDistance: 24,
    });
  });

  it("ignores touch inspect drag (moved past threshold)", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspect: defaultInspect,
          hasTouchInspectStart: true,
          touchInspectMoved: true,
        }),
      ),
    ).toEqual({ type: "touch-inspect-drag-ignore" });
  });

  it("does not take touch-inspect path when inspect null or tool changed", () => {
    const finishTouch = resolvePointerUpAction(
      up({
        activeTool: "inspect",
        pointerType: "touch",
        inspect: null,
        hasTouchInspectStart: true,
        brushing: true,
        brushCorners: draftCorners,
      }),
    );
    expect(finishTouch.type).toBe("finish-brush");
    if (finishTouch.type === "finish-brush") {
      expect(finishTouch.source).toBe("touch");
      expect(finishTouch.finish.type).toBe("end-area");
    }

    const finishSelect = resolvePointerUpAction(
      up({
        activeTool: "select-area",
        pointerType: "touch",
        inspect: defaultInspect,
        hasTouchInspectStart: true,
        brushing: true,
        brushCorners: draftCorners,
      }),
    );
    expect(finishSelect).toEqual({
      type: "finish-brush",
      source: "touch",
      finish: {
        type: "select-end",
        rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
      },
    });
  });

  it("finishes brush only when both brushing and draft exist; carries finish payload", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "select-area",
          brushing: true,
          brushCorners: draftCorners,
        }),
      ),
    ).toEqual({
      type: "finish-brush",
      source: "pointer",
      finish: {
        type: "select-end",
        rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
      },
    });
  });

  it("maps finish-brush source from pointerType and zoom-end finish", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          pointerType: "touch",
          brushing: true,
          brushCorners: draftCorners,
        }),
      ),
    ).toEqual({
      type: "finish-brush",
      source: "touch",
      finish: {
        type: "zoom-end",
        rect: { x0: 10, y0: 20, x1: 40, y1: 50 },
      },
    });
  });

  it("finish-brush keep-second-corner when free corner is too-small", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "select-area",
          brushing: true,
          brushCorners: { x0: 10, y0: 10, x1: 10, y1: 10 },
          endPoint: { x: 12, y: 12 },
        }),
      ),
    ).toEqual({
      type: "finish-brush",
      source: "pointer",
      finish: {
        type: "keep-second-corner",
        corners: { x0: 10, y0: 10, x1: 12, y1: 12 },
      },
    });
  });

  it("returns none when brushing/draft state diverges", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          brushing: true,
          brushCorners: null,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          brushing: false,
          brushCorners: draftCorners,
        }),
      ),
    ).toEqual({ type: "none" });
  });
});

describe("resolveLostPointerCaptureAction", () => {
  it("ignores idle (not brushing)", () => {
    expect(resolveLostPointerCaptureAction("idle")).toEqual({ type: "ignore" });
  });

  it("keeps draft and cancels area when awaiting second corner", () => {
    expect(resolveLostPointerCaptureAction("first-corner")).toEqual({
      type: "cancel-keep-draft",
    });
  });

  it("clears draft and cancels area when dragging", () => {
    expect(resolveLostPointerCaptureAction("dragging")).toEqual({
      type: "cancel-clear-draft",
    });
  });
});
