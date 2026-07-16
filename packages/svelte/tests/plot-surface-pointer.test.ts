import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../src/lib/interaction.js";
import {
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
  TOUCH_INSPECT_MOVE_PX,
  advanceTouchInspectMoved,
  interactionSourceFromPointerType,
  resolveCaptureClickAction,
  resolveFinishBrushAction,
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

const down = (
  overrides: Partial<SurfacePointerDownInput> & Pick<SurfacePointerDownInput, "activeTool">,
): SurfacePointerDownInput => ({
  pointerType: "mouse",
  button: 0,
  areaAwaitingSecond: false,
  hasBrushDraft: false,
  ...overrides,
});

const up = (
  overrides: Partial<SurfacePointerUpInput> & Pick<SurfacePointerUpInput, "activeTool">,
): SurfacePointerUpInput => ({
  pointerType: "mouse",
  inspectEnabled: true,
  pinEnabled: false,
  hasTouchInspectStart: false,
  touchInspectMoved: false,
  brushing: false,
  hasBrushDraft: false,
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
  inspectEnabled: true,
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
    "%s begins a new area draft when not extending",
    (tool: InteractionTool) => {
      expect(resolvePointerDownAction(down({ activeTool: tool }))).toEqual({
        type: "begin-area",
        extendExisting: false,
        emitSelectStart: tool === "select-area",
      });
    },
  );

  it("extends only when awaiting second corner AND draft exists", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          areaAwaitingSecond: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({
      type: "begin-area",
      extendExisting: true,
      emitSelectStart: false,
    });
  });

  it("does not extend when awaiting second corner but draft is missing", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "zoom-area",
          areaAwaitingSecond: true,
          hasBrushDraft: false,
        }),
      ),
    ).toEqual({
      type: "begin-area",
      extendExisting: false,
      emitSelectStart: false,
    });
  });

  it("does not extend when draft exists but reducer is not awaiting second", () => {
    expect(
      resolvePointerDownAction(
        down({
          activeTool: "select-area",
          areaAwaitingSecond: false,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({
      type: "begin-area",
      extendExisting: false,
      emitSelectStart: true,
    });
  });
});

describe("resolvePointerUpAction", () => {
  it("resolves touch inspect tap with pin flag", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          touchInspectMoved: false,
          pinEnabled: true,
        }),
      ),
    ).toEqual({ type: "touch-inspect-tap", pin: true });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          touchInspectMoved: false,
          pinEnabled: false,
        }),
      ),
    ).toEqual({ type: "touch-inspect-tap", pin: false });
  });

  it("ignores touch inspect drag (moved past threshold)", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          touchInspectMoved: true,
        }),
      ),
    ).toEqual({ type: "touch-inspect-drag-ignore" });
  });

  it("does not take touch-inspect path when inspect disabled or tool changed", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "inspect",
          pointerType: "touch",
          inspectEnabled: false,
          hasTouchInspectStart: true,
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "finish-brush" });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "select-area",
          pointerType: "touch",
          inspectEnabled: true,
          hasTouchInspectStart: true,
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "finish-brush" });
  });

  it("finishes brush only when both brushing and draft exist", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "select-area",
          brushing: true,
          hasBrushDraft: true,
        }),
      ),
    ).toEqual({ type: "finish-brush" });
  });

  it("returns none when brushing/draft state diverges", () => {
    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          brushing: true,
          hasBrushDraft: false,
        }),
      ),
    ).toEqual({ type: "none" });

    expect(
      resolvePointerUpAction(
        up({
          activeTool: "zoom-area",
          brushing: false,
          hasBrushDraft: true,
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
          inspectEnabled: true,
        }),
      ),
    ).toEqual({ type: "touch-inspect-drag-cancel" });
  });

  it("cancels even when inspect config is disabled (tool-only gate)", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "touch",
          hasTouchInspectStart: true,
          touchInspectMoved: true,
          inspectEnabled: false,
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
            inspectEnabled: true,
          }),
        ),
      ).toEqual({ type: "queue-inspect", source: "pointer" });
    }
  });

  it("does not cancel when unmoved — falls through to queue-inspect", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "touch",
          hasTouchInspectStart: true,
          touchInspectMoved: false,
          inspectEnabled: true,
        }),
      ),
    ).toEqual({ type: "queue-inspect", source: "touch" });
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

  it("queues inspect for mouse with pointer source", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          pointerType: "mouse",
          inspectEnabled: true,
        }),
      ),
    ).toEqual({ type: "queue-inspect", source: "pointer" });
  });

  it("returns none for inspect tool when inspect disabled", () => {
    expect(
      resolvePointerMoveAction(
        move({
          activeTool: "inspect",
          inspectEnabled: false,
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

describe("resolveFinishBrushAction", () => {
  it("keeps second corner on too-small for any tool", () => {
    for (const activeTool of [
      "select-area",
      "zoom-area",
      "inspect",
      "point",
    ] as const satisfies readonly InteractionTool[]) {
      expect(resolveFinishBrushAction({ endedKind: "too-small", activeTool })).toEqual({
        type: "keep-second-corner",
      });
    }
  });

  it("routes commit + select-area to select-end", () => {
    expect(resolveFinishBrushAction({ endedKind: "commit", activeTool: "select-area" })).toEqual({
      type: "select-end",
    });
  });

  it("routes commit + zoom-area to zoom-end", () => {
    expect(resolveFinishBrushAction({ endedKind: "commit", activeTool: "zoom-area" })).toEqual({
      type: "zoom-end",
    });
  });

  it("routes commit + non-area tools to end-area (clear draft, no emit)", () => {
    expect(resolveFinishBrushAction({ endedKind: "commit", activeTool: "inspect" })).toEqual({
      type: "end-area",
    });
    expect(resolveFinishBrushAction({ endedKind: "commit", activeTool: "point" })).toEqual({
      type: "end-area",
    });
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
