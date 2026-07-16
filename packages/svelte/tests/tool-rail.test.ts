import { describe, expect, it, vi } from "vitest";

import ToolRail from "../src/lib/ToolRail.svelte";
import { render } from "./helpers/render.js";

describe("<ToolRail> recovery input sources", () => {
  it("distinguishes keyboard, pointer, and touch activation", () => {
    const reset = vi.fn();
    const clearPoint = vi.fn();
    const clearPanel = vi.fn();
    const clearAll = vi.fn();
    const { container } = render(ToolRail, {
      availableTools: ["inspect"],
      activeTool: "inspect",
      ready: true,
      emptyPlot: false,
      zoomDomains: { x: [1, 2] },
      hasPointSelection: true,
      hasIntervalSelection: true,
      intervalTargetLabel: "North",
      canSetIntervalBounds: true,
      intervalAxes: ["x"],
      onChooseTool: vi.fn(),
      onResetZoom: reset,
      onClearPointSelection: clearPoint,
      onClearIntervalSelection: clearAll,
      onClearCurrentInterval: clearPanel,
      onEditBounds: vi.fn(),
    });
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
