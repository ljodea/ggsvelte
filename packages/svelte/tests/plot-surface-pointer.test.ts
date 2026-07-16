import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../src/lib/interaction.js";
import {
  POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
  TOUCH_INSPECT_MOVE_PX,
  advanceTouchInspectMoved,
  interactionSourceFromPointerType,
  resolveCaptureClickAction,
  isAreaAwaitingSecond,
  isAreaBrushing,
  resolveLostPointerCaptureAction,
  resolvePointerDownAction,
  resolvePointerMoveAction,
  resolvePointerUpAction,
  shouldClearInspectionOnPointerLeave,
  type SurfaceClickInput,
  type SurfacePointerDownInput,
  type SurfacePointerMoveInput,
  type SurfacePointerUpInput,
} from "../src/lib/plot-surface-pointer.js";

const downPoint = { x: 9, y: 8 } as const;
const draftCorners = { x0: 10, y0: 20, x1: 10, y1: 20 } as const;
const endAt = { x: 40, y: 50 } as const;

const down = (
  overrides: Partial<SurfacePointerDownInput> & Pick<SurfacePointerDownInput, "activeTool">,
): SurfacePointerDownInput => ({
  pointerType: "mouse",
  button: 0,
  areaAwaitingSecond: false,
  brushCorners: null,
  point: downPoint,
  ...overrides,
});

const defaultInspect = {
  mode: "auto" as const,
  maxDistance: 24,
  pin: false,
};

const up = (
  overrides: Partial<SurfacePointerUpInput> & Pick<SurfacePointerUpInput, "activeTool">,
): SurfacePointerUpInput => ({
  pointerType: "mouse",
  inspect: defaultInspect,
  hasTouchInspectStart: false,
  touchInspectMoved: false,
  brushing: false,
  brushCorners: null,
  endPoint: endAt,
  ...overrides,
});

const click = (
  overrides: Partial<SurfaceClickInput> & Pick<SurfaceClickInput, "activeTool">,
): SurfaceClickInput => ({
  suppressClick: false,
  pointSelectEnabled: false,
  inspectEnabled: true,
  pinEnabled: false,
  hasInspection: false,
  ...overrides,
});

const move = (
  overrides: Partial<SurfacePointerMoveInput> & Pick<SurfacePointerMoveInput, "activeTool">,
): SurfacePointerMoveInput => ({
  pointerType: "mouse",
  touchInspectMoved: false,
  hasTouchInspectStart: false,
  brushing: false,
  hasBrushDraft: false,
  inspect: defaultInspect,
  ...overrides,
});

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

describe("resolveCaptureClickAction", () => {
  it("suppress outranks point and pin", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "point",
          suppressClick: true,
          pointSelectEnabled: true,
          hasInspection: true,
          pinEnabled: true,
          inspectEnabled: true,
        }),
      ),
    ).toEqual({ type: "suppress" });
  });

  it("toggles point selection when point tool and point select enabled", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "point",
          pointSelectEnabled: true,
        }),
      ),
    ).toEqual({ type: "toggle-point" });
  });

  it("toggles pin when inspect tool, inspection present, and pin enabled", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "inspect",
          inspectEnabled: true,
          pinEnabled: true,
          hasInspection: true,
        }),
      ),
    ).toEqual({ type: "toggle-pin" });
  });

  it("returns none without pin, inspection, or wrong tool", () => {
    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "inspect",
          pinEnabled: true,
          hasInspection: false,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "inspect",
          pinEnabled: false,
          hasInspection: true,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolveCaptureClickAction(
        click({
          activeTool: "point",
          pointSelectEnabled: false,
        }),
      ),
    ).toEqual({ type: "none" });
  });
});

describe("advanceTouchInspectMoved", () => {
  const start = { x: 0, y: 0 };

  it("stays false under the threshold", () => {
    expect(
      advanceTouchInspectMoved(false, start, {
        x: TOUCH_INSPECT_MOVE_PX - 1,
        y: 0,
      }),
    ).toBe(false);
  });

  it("becomes true at exactly the threshold (plotPoint coords)", () => {
    expect(
      advanceTouchInspectMoved(false, start, {
        x: TOUCH_INSPECT_MOVE_PX,
        y: 0,
      }),
    ).toBe(true);
  });

  it("is sticky once true", () => {
    expect(advanceTouchInspectMoved(true, start, { x: 0, y: 0 })).toBe(true);
  });
});

describe("resolvePointerMoveAction", () => {
  it("cancels touch-inspect drag only for touch + start + moved + inspect tool", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "touch",
          hasTouchInspectStart: true,
          touchInspectMoved: true,
          brushing: true,
          hasBrushDraft: true,
          inspect: defaultInspect,
        }),
      ),
    ).toEqual({ type: "touch-inspect-drag-cancel" });
  });

  it("cancels even when inspect config is null (tool-only gate)", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "touch",
          hasTouchInspectStart: true,
          touchInspectMoved: true,
          inspect: null,
        }),
      ),
    ).toEqual({ type: "touch-inspect-drag-cancel" });
  });

  it("does not cancel when pointerType is mouse/pen with residual touch-start state", () => {
    for (const pointerType of ["mouse", "pen"] as const) {
      expect(
        resolvePointerMoveAction(
          move({
            activeTool: "inspect",
            pointerType,
            hasTouchInspectStart: true,
            touchInspectMoved: true,
            inspect: { mode: "x", maxDistance: 12, pin: true },
          }),
        ),
      ).toEqual({
        type: "queue-inspect",
        source: "pointer",
        mode: "x",
        maxDistance: 12,
      });
    }
  });

  it("does not cancel when unmoved — falls through to queue-inspect with payload", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "touch",
          hasTouchInspectStart: true,
          touchInspectMoved: false,
          inspect: { mode: "auto", maxDistance: 24, pin: false },
        }),
      ),
    ).toEqual({
      type: "queue-inspect",
      source: "touch",
      mode: "auto",
      maxDistance: 24,
    });
  });

  it("does not cancel when tool is no longer inspect (area wins if brushing)", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "select-area",
          pointerType: "touch",
          hasTouchInspectStart: true,
          touchInspectMoved: true,
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "queue-area-move", source: "touch" });
  });

  it("queues area move when brushing and draft both present", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "zoom-area",
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "queue-area-move", source: "pointer" });
  });

  it("returns none when brushing/draft diverge", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "select-area",
          brushing: true,
          hasBrushDraft: false,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "select-area",
          brushing: false,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "none" });
  });

  it("queues inspect for mouse with pointer source and inspect snapshot fields", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "mouse",
          inspect: { mode: "xy", maxDistance: 8, pin: true },
        }),
      ),
    ).toEqual({
      type: "queue-inspect",
      source: "pointer",
      mode: "xy",
      maxDistance: 8,
    });
  });

  it("returns none for inspect tool when inspect config is null", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          inspect: null,
        }),
      ),
    ).toEqual({ type: "none" });
  });

  it("returns none for non-inspect tools without brush", () => {
    expect(resolvePointerMoveAction(move({ activeTool: "point" }))).toEqual({
      type: "none",
    });
  });
});

describe("shouldClearInspectionOnPointerLeave", () => {
  it("clears only when idle brush and tooltip not hovered", () => {
    expect(shouldClearInspectionOnPointerLeave({ brushing: false, tooltipHovered: false })).toBe(
      true,
    );
  });

  it("holds while brushing", () => {
    expect(shouldClearInspectionOnPointerLeave({ brushing: true, tooltipHovered: false })).toBe(
      false,
    );
  });

  it("holds while tooltip is hovered", () => {
    expect(shouldClearInspectionOnPointerLeave({ brushing: false, tooltipHovered: true })).toBe(
      false,
    );
  });

  it("holds when both brushing and tooltip hovered", () => {
    expect(shouldClearInspectionOnPointerLeave({ brushing: true, tooltipHovered: true })).toBe(
      false,
    );
  });
});

describe("isAreaBrushing / isAreaAwaitingSecond", () => {
  it("classifies area.kind for host deriveds", () => {
    expect(isAreaBrushing("idle")).toBe(false);
    expect(isAreaBrushing("first-corner")).toBe(true);
    expect(isAreaBrushing("dragging")).toBe(true);
    expect(isAreaAwaitingSecond("idle")).toBe(false);
    expect(isAreaAwaitingSecond("first-corner")).toBe(true);
    expect(isAreaAwaitingSecond("dragging")).toBe(false);
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

describe("interactionSourceFromPointerType", () => {
  it("maps touch to touch and everything else to pointer", () => {
    expect(interactionSourceFromPointerType("touch")).toBe("touch");
    expect(interactionSourceFromPointerType("mouse")).toBe("pointer");
    expect(interactionSourceFromPointerType("pen")).toBe("pointer");
    expect(interactionSourceFromPointerType("")).toBe("pointer");
  });
});

describe("TOUCH_INSPECT_CLICK_SUPPRESS_MS", () => {
  it("is the host suppress window after a successful touch-inspect tap", () => {
    expect(TOUCH_INSPECT_CLICK_SUPPRESS_MS).toBe(500);
  });
});

describe("POINT_SELECT_NEAREST_MAX_DISTANCE_PX", () => {
  it("is the nearest-candidate radius for capture-surface point-tool click", () => {
    expect(POINT_SELECT_NEAREST_MAX_DISTANCE_PX).toBe(24);
  });
});
