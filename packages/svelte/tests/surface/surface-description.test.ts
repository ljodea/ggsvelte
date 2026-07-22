/**
 * Pure surface a11y description strings (no harness / runes).
 */
import { describe, expect, it } from "vitest";

import { buildSurfaceDescription } from "../../src/lib/surface/surface-description.js";

describe("buildSurfaceDescription", () => {
  it("describes select-area brush keyboard flow", () => {
    expect(buildSurfaceDescription("select-area", false)).toBe(
      "Press Enter or Space to set the first selection corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the selection. Press Escape to cancel.",
    );
    // pin flag ignored for non-inspect tools
    expect(buildSurfaceDescription("select-area", true)).toBe(
      buildSurfaceDescription("select-area", false),
    );
  });

  it("describes zoom-area brush keyboard flow", () => {
    expect(buildSurfaceDescription("zoom-area", false)).toBe(
      "Press Enter or Space to set the first zoom corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the zoom. Press Escape to cancel.",
    );
  });

  it("describes point selection keyboard flow", () => {
    expect(buildSurfaceDescription("point", false)).toBe(
      "Use Arrow keys to inspect data. Press Enter or Space to toggle the focused point selection. Press Escape to dismiss.",
    );
  });

  it("describes inspect tool with pin enabled vs disabled", () => {
    expect(buildSurfaceDescription("inspect", true)).toBe(
      "Use Arrow keys to inspect data. Press Enter or Space to pin. Press Escape to dismiss.",
    );
    expect(buildSurfaceDescription("inspect", false)).toBe(
      "Use Arrow keys to inspect data. Press Escape to dismiss.",
    );
  });
});
