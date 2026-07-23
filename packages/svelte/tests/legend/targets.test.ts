import { describe, expect, it, vi } from "vitest";

import type { InteractiveLegendEntry } from "../../src/lib/legend/focus.js";
import LegendTargets from "../../src/lib/legend/LegendTargets.svelte";
import { render } from "../helpers/render.js";

const webEntry = { value: "web", label: "Web", color: "#123456", y: 18 };
const storeEntry = { value: "store", label: "Store", color: "#654321", y: 42 };

const discreteFill = {
  type: "discrete" as const,
  scale: "fill",
  title: "Channel",
  x: 100,
  y: 12,
  width: 10,
  height: 72,
  swatchSize: 12,
  entries: [webEntry, storeEntry],
};

const entries: InteractiveLegendEntry[] = [
  {
    legend: discreteFill,
    entry: webEntry,
    identity: { scale: "fill", entryIndex: 0 },
  },
  {
    legend: discreteFill,
    entry: storeEntry,
    identity: { scale: "fill", entryIndex: 1 },
  },
];

const noopHandlers = {
  onPreviewIndex: () => {},
  onPreviewClear: () => {},
  onPointerDown: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
  onFocus: () => {},
  onBlur: () => {},
  onClick: () => {},
  onKeyDown: () => {},
  onClearPointerDown: () => {},
  onClearPointerCancel: () => {},
  onClearClick: () => {},
};

describe("LegendTargets", () => {
  it("renders one hit target per entry and hides clear when clearLegendX is null", () => {
    const { container } = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: null,
      ...noopHandlers,
    });
    expect(container.querySelectorAll("[data-gg-legend-target]")).toHaveLength(2);
    expect(container.querySelector(".gg-legend-clear")).toBeNull();
  });

  it("shows clear control at clamped left and sceneHeight+4 top", () => {
    const { container } = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: 100,
      pressedIdentity: { scale: "fill", entryIndex: 0 },
      ...noopHandlers,
    });
    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear");
    expect(clear).not.toBeNull();
    expect(clear?.style.left).toBe("100px");
    expect(clear?.style.top).toBe("304px");
  });

  it("honors kebab-case tooltip background/foreground aliases on clear control", () => {
    // Same chrome family as filter chips (#207): kebab-only theme path must
    // not fall through to a white surface under light text.
    const { container } = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: 100,
      pressedIdentity: { scale: "fill", entryIndex: 0 },
      ...noopHandlers,
    });
    container.style.setProperty("--gg-tooltip-background", "#111111");
    container.style.setProperty("--gg-tooltip-foreground", "#ffffff");

    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    expect(getComputedStyle(clear).backgroundColor).toBe("rgb(17, 17, 17)");
    expect(getComputedStyle(clear).color).toBe("rgb(255, 255, 255)");
  });

  it("prefers camelCase tooltip tokens over kebab-case aliases on clear control", () => {
    const { container } = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: 100,
      pressedIdentity: { scale: "fill", entryIndex: 0 },
      ...noopHandlers,
    });
    container.style.setProperty("--gg-tooltipPaper", "#ffffff");
    container.style.setProperty("--gg-tooltipInk", "#262626");
    container.style.setProperty("--gg-tooltip-background", "#111111");
    container.style.setProperty("--gg-tooltip-foreground", "#ffffff");

    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    expect(getComputedStyle(clear).backgroundColor).toBe("rgb(255, 255, 255)");
    expect(getComputedStyle(clear).color).toBe("rgb(38, 38, 38)");
  });

  it("clamps clear left into [4, sceneWidth-52]", () => {
    const low = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 200,
      clearLegendX: 0,
      ...noopHandlers,
    });
    const lowClear = low.container.querySelector<HTMLButtonElement>(".gg-legend-clear");
    expect(lowClear?.style.left).toBe("4px");

    const high = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 200,
      clearLegendX: 500,
      ...noopHandlers,
    });
    const highClear = high.container.querySelector<HTMLButtonElement>(".gg-legend-clear");
    expect(highClear?.style.left).toBe("348px");
  });

  it("applies min target width of 24 when legend width is smaller", () => {
    const { container } = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: null,
      ...noopHandlers,
    });
    const targets = container.querySelectorAll<HTMLButtonElement>("[data-gg-legend-target]");
    expect(targets.length).toBeGreaterThan(0);
    // legend width is 10 → max(24, 10) = 24
    expect(targets.item(0)?.style.width).toBe("24px");
  });

  it("extends a row-ending horizontal target to the legend edge", () => {
    const horizontal = {
      ...discreteFill,
      direction: "horizontal" as const,
      width: 180,
      entries: [
        { ...webEntry, x: 0, y: 18 },
        { ...storeEntry, x: 80, y: 18 },
        { value: "partner", label: "Partner", color: "#abcdef", x: 0, y: 42 },
      ],
    };
    const horizontalEntries: InteractiveLegendEntry[] = horizontal.entries.map((entry, index) => ({
      legend: horizontal,
      entry,
      identity: { scale: "fill", entryIndex: index },
    }));
    const { container } = render(LegendTargets, {
      entries: horizontalEntries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: null,
      ...noopHandlers,
    });
    const targets = container.querySelectorAll<HTMLButtonElement>("[data-gg-legend-target]");
    expect(targets.item(1)?.style.width).toBe("100px");
  });

  it("wires preview enter for non-touch pointers", () => {
    const onPreviewIndex = vi.fn();
    const { container } = render(LegendTargets, {
      entries,
      sceneWidth: 400,
      sceneHeight: 300,
      clearLegendX: null,
      ...noopHandlers,
      onPreviewIndex,
    });
    const targets = container.querySelectorAll<HTMLButtonElement>("[data-gg-legend-target]");
    const first = targets.item(0);
    expect(first).not.toBeNull();
    first?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
    expect(onPreviewIndex).toHaveBeenCalledWith(0, "pointer");
  });
});
