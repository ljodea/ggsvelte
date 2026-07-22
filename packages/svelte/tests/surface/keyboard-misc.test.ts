/**
 * Keyboard decision tables for non-handled keys and tools-matrix smoke.
 */
import { describe, expect, it } from "vitest";

import type { InteractionTool } from "../../src/lib/interaction/interaction.js";
import { resolveSurfaceKeyAction } from "../../src/lib/surface/keyboard.js";
import { base, draft } from "./keyboard-fixtures.js";

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
