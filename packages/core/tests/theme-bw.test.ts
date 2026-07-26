/**
 * theme_bw (#820) — white panel, grey grid, rectangular border (print-friendly).
 */
import { aes, gg, THEME_NAMES } from "@ggsvelte/spec";
import { describe, expect, it } from "bun:test";

import { renderToSVGString } from "../src/render-svg.ts";
import { BUILTIN_THEMES, resolveTheme } from "../src/theme.ts";

const size = { width: 480, height: 320 };
const rows = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 3 },
];

describe("theme_bw registry (#820)", () => {
  it('registers "bw" in THEME_NAMES and BUILTIN_THEMES', () => {
    expect(THEME_NAMES).toContain("bw");
    expect(BUILTIN_THEMES.bw).toBeDefined();
    expect(resolveTheme("bw")).toBe(BUILTIN_THEMES.bw);
  });

  it("uses white paper/panel, grey grid, black frame, ticks, and axis lines", () => {
    const t = resolveTheme("bw");
    expect(t.paper).toBe("#ffffff");
    expect(t.panel).toBe("#ffffff");
    expect(t.grid).toBe("#cccccc");
    expect(t.ink).toBe("#000000");
    expect(t.axisText).toBe("#000000");
    expect(t.axisLine).toBe("#000000");
    expect(t.tickColor).toBe("#000000");
    expect(t.panelBorder).toBe("#000000");
    expect(t.showPanelBorder).toBe(true);
    expect(t.panelBorderWidth).toBe(0.5);
    expect(t.axisLineX).toBe(true);
    expect(t.axisLineY).toBe(true);
    expect(t.ticksX).toBe(true);
    expect(t.ticksY).toBe(true);
    expect(t.gridX).toBe(true);
    expect(t.gridY).toBe(true);
    // Readable chrome floor (#753) and non-degenerate titles.
    expect(t.axisTextSize).toBeGreaterThanOrEqual(12);
    expect(t.titleSize).toBeGreaterThanOrEqual(12);
    expect(t.subtitleSize).toBeGreaterThanOrEqual(10);
  });
});

describe("theme_bw render contract (#820)", () => {
  it("SVG carries white paper/panel vars, grey grid lines, and panel border", () => {
    const svg = renderToSVGString(
      gg(rows, aes({ x: "x", y: "y" }))
        .geomPoint({ size: 3 })
        .theme("bw")
        .labs({ title: "BW chrome check" })
        .spec(),
      size,
    );
    expect(svg).toContain("var(--gg-paper, #ffffff)");
    expect(svg).toContain("var(--gg-panel, #ffffff)");
    expect(svg).toContain("var(--gg-grid, #cccccc)");
    expect(svg).toMatch(/class="gg-grid"[^>]*>[\s\S]*?<line /);
    expect(svg).toContain("gg-panel-border");
    expect(svg).toContain("gg-axis-line");
  });
});
