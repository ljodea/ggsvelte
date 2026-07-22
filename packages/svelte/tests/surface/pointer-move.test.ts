/**
 * Pure unit tests for pointer-move and leave-clear tables.
 */
import { describe, expect, it } from "vitest";

import {
  isAreaAwaitingSecond,
  isAreaBrushing,
  resolvePointerMoveAction,
  shouldClearInspectionOnPointerLeave,
} from "../../src/lib/surface/pointer.js";

import { defaultInspect, move } from "./pointer-fixtures.js";

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
