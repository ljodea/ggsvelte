import { describe, expect, it, vi } from "vitest";

import ToolRail from "../src/lib/ToolRail.svelte";
import { render } from "./helpers/render.js";

function toolRailProps(
  overrides: Partial<{
    availableTools: readonly ("inspect" | "select-area" | "zoom-area" | "point")[];
    activeTool: "inspect" | "select-area" | "zoom-area" | "point";
    ready: boolean;
    emptyPlot: boolean;
    zoomDomains: { x: [number, number] } | null;
    hasPointSelection: boolean;
    hasIntervalSelection: boolean;
    intervalTargetLabel: string;
    canSetIntervalBounds: boolean;
    intervalAxes: readonly ("x" | "y")[];
    onChooseTool: ReturnType<typeof vi.fn>;
    onResetZoom: ReturnType<typeof vi.fn>;
    onClearPointSelection: ReturnType<typeof vi.fn>;
    onClearIntervalSelection: ReturnType<typeof vi.fn>;
    onClearCurrentInterval: ReturnType<typeof vi.fn>;
    onEditBounds: ReturnType<typeof vi.fn>;
  }> = {},
) {
  return {
    availableTools: ["inspect"] as const,
    activeTool: "inspect" as const,
    ready: true,
    emptyPlot: false,
    zoomDomains: null,
    hasPointSelection: false,
    hasIntervalSelection: false,
    canSetIntervalBounds: false,
    intervalAxes: [] as const,
    onChooseTool: vi.fn(),
    onResetZoom: vi.fn(),
    onClearPointSelection: vi.fn(),
    onClearIntervalSelection: vi.fn(),
    onClearCurrentInterval: vi.fn(),
    onEditBounds: vi.fn(),
    ...overrides,
  };
}

function documentCssText(): string {
  return [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText);
      } catch {
        return [] as string[];
      }
    })
    .join("\n");
}

describe("<ToolRail> recovery input sources", () => {
  it("distinguishes keyboard, pointer, and touch activation", () => {
    const reset = vi.fn();
    const clearPoint = vi.fn();
    const clearPanel = vi.fn();
    const clearAll = vi.fn();
    const { container } = render(
      ToolRail,
      toolRailProps({
        zoomDomains: { x: [1, 2] },
        hasPointSelection: true,
        hasIntervalSelection: true,
        intervalTargetLabel: "North",
        canSetIntervalBounds: true,
        intervalAxes: ["x"],
        onResetZoom: reset,
        onClearPointSelection: clearPoint,
        onClearIntervalSelection: clearAll,
        onClearCurrentInterval: clearPanel,
      }),
    );
    const button = (label: string) =>
      [...container.querySelectorAll<HTMLButtonElement>("button")].find(
        (candidate) => candidate.textContent?.trim() === label,
      )!;

    button("Reset zoom").click();
    expect(reset).toHaveBeenCalledWith("keyboard");

    const clearSelection = button("Clear selection");
    clearSelection.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
      }),
    );
    clearSelection.click();
    expect(clearPoint).toHaveBeenCalledWith("pointer");

    const clearPanelSelection = button("Clear panel selection: North");
    clearPanelSelection.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "touch",
      }),
    );
    clearPanelSelection.click();
    expect(clearPanel).toHaveBeenCalledWith("touch");

    button("Clear all selections").click();
    expect(clearAll).toHaveBeenCalledWith("keyboard");

    expect(button("Edit x selection bounds: North")).not.toBeUndefined();
  });
});

describe("<ToolRail> forced-colors disabled→enabled paint contract (#161)", () => {
  it("disables all buttons while ready is false (SSR / pre-hydration state)", () => {
    const { container } = render(
      ToolRail,
      toolRailProps({
        availableTools: ["inspect", "select-area", "zoom-area"],
        ready: false,
        zoomDomains: { x: [0, 1] },
      }),
    );
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it("keeps button color free of the numeric theme alpha token", () => {
    render(ToolRail, toolRailProps());
    const cssText = documentCssText();
    // --gg-theme-interactionMuted is a number (0.36); invalid in `color:`.
    // Only the consumer color override may appear in the color chain.
    expect(cssText).toMatch(/color:\s*var\(--gg-interactionMuted,\s*currentColor\)/i);
    expect(cssText).not.toMatch(
      /color:\s*var\(\s*--gg-interactionMuted\s*,\s*var\(\s*--gg-theme-interactionMuted/i,
    );
  });

  it("declares forced-colors :disabled GrayText for color and border-bottom", () => {
    render(ToolRail, toolRailProps());
    const cssText = documentCssText();
    // Chromium freezes forced-colors paint across disabled→enabled unless the
    // computed author values change; these rules supply the state delta.
    // CSSOM may expand `button:disabled` to `button:where(...):disabled` and
    // lowercase system colors (`graytext`).
    expect(cssText).toMatch(/forced-colors:\s*active/i);
    expect(cssText).toMatch(/button(?::where\([^)]*\))?:disabled[^}]*\bcolor:\s*graytext\b/i);
    expect(cssText).toMatch(
      /button(?::where\([^)]*\))?:disabled[^}]*\bborder-bottom-color:\s*graytext\b/i,
    );
  });
});
