/**
 * Keyboard decision tables for inspection navigation, pin/point, and Escape.
 */
import { describe, expect, it } from "vitest";

import { resolveSurfaceKeyAction } from "../../src/lib/surface/keyboard.js";
import { base, draft } from "./keyboard-fixtures.js";

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
