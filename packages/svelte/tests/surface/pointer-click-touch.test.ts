/**
 * Pure unit tests for capture-click, touch sticky threshold, and pointer constants.
 */
import { describe, expect, it } from "vitest";

import {
  POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
  TOUCH_INSPECT_CLICK_SUPPRESS_MS,
  TOUCH_INSPECT_MOVE_PX,
  advanceTouchInspectMoved,
  interactionSourceFromPointerType,
  resolveCaptureClickAction,
} from "../../src/lib/surface/pointer.js";

import { click } from "./pointer-fixtures.js";

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
