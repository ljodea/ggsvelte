import { describe, expect, it } from "vitest";

import GGPlot from "../src/lib/GGPlot.svelte";
import LargePinnedTooltip from "./fixtures/LargePinnedTooltip.svelte";
import { render } from "./helpers/render.js";

const rows = [
  { id: "a", x: 1, y: 3 },
  { id: "b", x: 2, y: 7 },
  { id: "c", x: 3, y: 4 },
];

function pointer(capture: Element, type: "pointerdown" | "pointermove", x: number, y: number) {
  capture.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      clientX: x,
      clientY: y,
      buttons: 1,
    }),
  );
}

describe("DESIGN.md interaction presentation", () => {
  it("uses a borderless underline rail and theme-role variables", () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      select: "interval",
      zoom: true,
      width: 480,
      height: 320,
    });
    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    const active = container.querySelector<HTMLElement>(".gg-tool-rail button.active")!;
    expect(root.getAttribute("style")).toContain("--gg-theme-interactionInk");
    expect(getComputedStyle(active).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(active).borderTopWidth).toBe("0px");
    expect(getComputedStyle(active).borderBottomWidth).toBe("2px");
    expect(active.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it("renders a solid translucent select draft and outline-only labelled zoom draft", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      select: "interval",
      zoom: true,
      width: 480,
      height: 320,
    });
    const capture = container.querySelector(".gg-capture")!;
    const buttons = [...container.querySelectorAll<HTMLButtonElement>(".gg-tool-rail button")];

    buttons.find((button) => button.textContent === "Select area")!.click();
    pointer(capture, "pointerdown", 120, 100);
    pointer(capture, "pointermove", 260, 220);
    await expect.poll(() => container.querySelector(".gg-area-draft-select")).not.toBeNull();
    const selectDraft = container.querySelector<SVGRectElement>(".gg-area-draft-select")!;
    expect(selectDraft.getAttribute("stroke-dasharray")).toBeNull();
    expect(selectDraft.getAttribute("fill")).not.toBe("none");

    capture.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 }));
    buttons.find((button) => button.textContent === "Zoom area")!.click();
    pointer(capture, "pointerdown", 140, 110);
    pointer(capture, "pointermove", 280, 230);
    await expect.poll(() => container.querySelector(".gg-area-draft-zoom")).not.toBeNull();
    expect(container.querySelector(".gg-area-draft-zoom")?.getAttribute("fill")).toBe("none");
    expect(container.querySelector(".gg-zoom-label")?.textContent).toBe("Zoom");
  });

  it("keeps crosshairs solid", async () => {
    const { container } = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: { mode: "xy" },
      width: 480,
      height: 320,
    });
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    capture.focus();
    capture.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await expect.poll(() => container.querySelector(".gg-crosshair")).not.toBeNull();
    expect(container.querySelector(".gg-crosshair")?.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("keeps extracted tool rail and overlay positioned as plot-root siblings", async () => {
    const narrow = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      key: "id",
      inspect: true,
      select: "interval",
      zoom: true,
      width: 400,
      height: 280,
    });
    const narrowRoot = narrow.container.querySelector(".gg-plot-root")!;
    const rail = narrow.container.querySelector<HTMLElement>(".gg-tool-rail")!;
    expect(rail.parentElement).toBe(narrowRoot);
    expect(rail.classList.contains("gg-tool-rail-narrow")).toBe(true);
    expect(getComputedStyle(rail).position).toBe("absolute");

    const wide = render(GGPlot, {
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: { mode: "xy" },
      width: 640,
      height: 360,
    });
    const wideRoot = wide.container.querySelector(".gg-plot-root")!;
    const capture = wide.container.querySelector<HTMLElement>(".gg-capture")!;
    capture.focus();
    capture.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await expect.poll(() => wide.container.querySelector(".gg-interaction-overlay")).not.toBeNull();
    const overlay = wide.container.querySelector<SVGElement>(".gg-interaction-overlay")!;
    expect(overlay.parentElement).toBe(wideRoot);
    expect(getComputedStyle(overlay).position).toBe("absolute");
    expect(getComputedStyle(overlay).pointerEvents).toBe("none");
    // Capture remains the last interactive sibling after the overlay.
    expect([...wideRoot.children].indexOf(overlay) < [...wideRoot.children].indexOf(capture)).toBe(
      true,
    );
  });

  it("preserves chart chrome and reports empty and unavailable states", () => {
    const empty = render(GGPlot, {
      data: [],
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      inspect: true,
      labs: { title: "Empty chart" },
      width: 480,
      height: 320,
    });
    expect(empty.container.querySelector(".gg-empty-state")?.textContent).toBe(
      "No data to display",
    );
    expect(empty.container.textContent).toContain("Empty chart");

    const unavailable = render(GGPlot, {
      data: rows.map((row) => ({ ...row, facet: row.id })),
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      facet: { wrap: "facet" },
      select: "interval",
      width: 480,
      height: 320,
    });
    const status = unavailable.container.querySelector(".gg-capability-status");
    expect(status?.textContent).toContain("unavailable");
    expect(status?.getAttribute("role")).toBe("status");
  });

  it("keeps all 1,000 pinned members in labelled, navigable DOM", () => {
    const { container } = render(LargePinnedTooltip);
    const tooltip = container.querySelector(".gg-tooltip")!;
    expect(tooltip.getAttribute("role")).toBe("dialog");
    expect(tooltip.getAttribute("aria-label")).toBe("Data inspection");
    expect(tooltip.classList.contains("gg-tooltip-docked")).toBe(true);
    expect(tooltip.querySelectorAll("dl")).toHaveLength(1_000);
    expect(tooltip.querySelector("button")?.textContent).toBe("Close");
  });
});
