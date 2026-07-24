import { describe, expect, it } from "vitest";

import ToolRail from "../../src/lib/chrome/ToolRail.svelte";
import { render } from "../helpers/render.js";

function toolRailProps(activeTool: "inspect" | "point" = "point") {
  return {
    availableTools: ["inspect", "point", "zoom-area"] as const,
    activeTool,
    ready: true,
    emptyPlot: false,
    zoomDomains: null,
    hasPointSelection: false,
    hasIntervalSelection: false,
    canSetIntervalBounds: false,
    intervalAxes: [] as const,
    onChooseTool: () => {},
    onResetZoom: () => {},
    onClearPointSelection: () => {},
    onClearIntervalSelection: () => {},
    onClearCurrentInterval: () => {},
    onEditBounds: () => {},
  };
}

/** Relative luminance (sRGB), WCAG. */
function relativeLuminance(cssRgb: string): number {
  const match = cssRgb.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (match === null) throw new Error(`expected rgb() color, got ${cssRgb}`);
  const channel = (raw: string) => {
    const s = Number(raw) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(match[1]);
  const g = channel(match[2]);
  const b = channel(match[3]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("<ToolRail> dark-host contrast (#651)", () => {
  it("fails contrast when light chart theme tokens paint active mode text", () => {
    document.body.style.background = "#16181d";
    document.body.style.color = "#e6e8eb";

    const { container } = render(ToolRail, toolRailProps("point"));
    const rail = container.querySelector<HTMLElement>(".gg-tool-rail")!;
    // Mimic GGPlot rootStyle from the default (light) chart theme.
    rail.style.setProperty("--gg-theme-toolActive", "#262626");
    rail.style.setProperty("--gg-theme-interactionMuted", "0.36");
    rail.style.setProperty("--gg-theme-interactionInk", "#262626");

    const active = container.querySelector<HTMLButtonElement>("button.active")!;
    const activeColor = getComputedStyle(active).color;
    expect(contrastRatio(activeColor, "rgb(22, 24, 29)")).toBeLessThan(3);
  });

  it("meets WCAG AA when the host publishes tool chrome color overrides", () => {
    document.body.style.background = "#16181d";
    document.body.style.color = "#e6e8eb";

    const { container } = render(ToolRail, toolRailProps("point"));
    const rail = container.querySelector<HTMLElement>(".gg-tool-rail")!;
    rail.style.setProperty("--gg-theme-toolActive", "#262626");
    rail.style.setProperty("--gg-theme-interactionMuted", "0.36");
    rail.style.setProperty("--gg-theme-interactionInk", "#262626");
    // Docs .gg-example-frame bridge (site appearance ≠ chart theme).
    rail.style.setProperty("--gg-toolActive", "#e6e8eb");
    rail.style.setProperty("--gg-interactionMuted", "#9aa2ab");

    const active = container.querySelector<HTMLButtonElement>("button.active")!;
    const inactive = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => !button.classList.contains("active"),
    )!;

    const bg = "rgb(22, 24, 29)";
    expect(contrastRatio(getComputedStyle(active).color, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(getComputedStyle(inactive).color, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
