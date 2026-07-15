import { describe, expect, it } from "vitest";

import { themeTokensToCss } from "../src/lib/plot-theme-css.js";

describe("themeTokensToCss", () => {
  it("emits custom properties in the stable role order", () => {
    const css = themeTokensToCss({
      interactionInk: "#111",
      interactionMuted: 0.35,
      focusRing: "#333",
      crosshair: "#444",
      selectionFill: "#555",
      selectionStroke: "#666",
      tooltipPaper: "#777",
      tooltipInk: "#888",
      tooltipBorder: "#999",
      toolActive: "#aaa",
    });
    expect(css).toBe(
      [
        "--gg-theme-interactionInk:#111",
        "--gg-theme-interactionMuted:0.35",
        "--gg-theme-focusRing:#333",
        "--gg-theme-crosshair:#444",
        "--gg-theme-selectionFill:#555",
        "--gg-theme-selectionStroke:#666",
        "--gg-theme-tooltipPaper:#777",
        "--gg-theme-tooltipInk:#888",
        "--gg-theme-tooltipBorder:#999",
        "--gg-theme-toolActive:#aaa",
      ].join(";"),
    );
  });
});
