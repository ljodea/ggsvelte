import { describe, expect, it } from "vitest";
import CoincidentLegendFocusPlot from "../fixtures/CoincidentLegendFocusPlot.svelte";
import LegendClearGeometryPlot from "../fixtures/LegendClearGeometryPlot.svelte";
import LocalLegendFocusPlot from "../fixtures/LocalLegendFocusPlot.svelte";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";

function lastEvent(element: HTMLElement): Record<string, unknown> {
  const parsed: unknown = JSON.parse(element.dataset["lastEvent"] ?? "null");
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    throw new TypeError("Expected a legend event object");
  return parsed as Record<string, unknown>;
}

function overlaps(left: DOMRect, right: DOMRect): boolean {
  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

describe("chart-local legend focus", () => {
  it("commits and clears without a controller, emitting stable keys without rerunning", async () => {
    const { container } = render(LocalLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const stateElement = container.querySelector<HTMLElement>("[data-local-legend-state]")!;
    const rendersBefore = stateElement.dataset["renders"];
    const north = container.querySelector<HTMLButtonElement>(".gg-legend-target")!;

    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(stateElement.dataset["lastEvent"]!)).toMatchObject({
      type: "legend-focus",
      phase: "change",
      state: "committed",
      source: "pointer",
      scale: "color",
      value: "north",
      label: "north",
      keys: ["a", "c"],
    });

    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    expect(clear.getAttribute("aria-label")).toBe("Clear legend focus");
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelectorAll("[data-gg-focused]").length === 0);
    expect(document.activeElement).toBe(north);
    expect(JSON.parse(stateElement.dataset["lastEvent"]!)).toMatchObject({
      type: "legend-focus",
      phase: "clear",
      source: "pointer",
    });
    expect(stateElement.dataset["renders"]).toBe(rendersBefore);
  });

  it("reports keyboard, pointer, and touch activation sources accurately", async () => {
    const { container } = render(LocalLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const stateElement = container.querySelector<HTMLElement>("[data-local-legend-state]")!;
    const north = container.querySelector<HTMLButtonElement>(".gg-legend-target")!;

    north.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await until(() => stateElement.dataset["lastEvent"] !== "");
    expect(lastEvent(stateElement)["source"]).toBe("keyboard");
    let clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    await until(() => lastEvent(stateElement)["phase"] === "clear");
    expect(lastEvent(stateElement)["source"]).toBe("keyboard");

    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastEvent(stateElement)["phase"] === "change");
    expect(lastEvent(stateElement)["source"]).toBe("pointer");
    clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastEvent(stateElement)["phase"] === "clear");
    expect(lastEvent(stateElement)["source"]).toBe("pointer");

    north.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch" }),
    );
    north.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch" }),
    );
    await until(() => lastEvent(stateElement)["phase"] === "change");
    expect(lastEvent(stateElement)["source"]).toBe("touch");
    clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    clear.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 10, pointerType: "touch" }),
    );
    clear.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => lastEvent(stateElement)["phase"] === "clear");
    expect(lastEvent(stateElement)["source"]).toBe("touch");
  });

  it("places a compact recovery control outside every legend, title, and legend target", async () => {
    const { container } = render(LegendClearGeometryPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 4);
    container
      .querySelector<HTMLButtonElement>(".gg-legend-target")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => container.querySelector(".gg-legend-clear") !== null);

    const root = container.querySelector<HTMLElement>(".gg-plot-root")!;
    const clear = container.querySelector<HTMLButtonElement>(".gg-legend-clear")!;
    // Pin chrome so Clear is opaque and hittable for geometry asserts.
    container
      .querySelector<HTMLButtonElement>("[data-gg-legend-target]")!
      .dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
    const clearBounds = clear.getBoundingClientRect();
    const rootBounds = root.getBoundingClientRect();
    // Compact legend-row sizing (AA 24px), not the old 44×44 slab.
    expect(clearBounds.height).toBeGreaterThanOrEqual(20);
    expect(clearBounds.height).toBeLessThanOrEqual(28);
    expect(clearBounds.width).toBeLessThan(80);
    // Stays inside the scene (no bottom-row layout jump / margin shove).
    expect(clearBounds.bottom).toBeLessThanOrEqual(rootBounds.bottom + 1);
    expect(clearBounds.top).toBeGreaterThanOrEqual(rootBounds.top - 1);
    expect(getComputedStyle(root).marginBottom).toBe("0px");
    const protectedElements = container.querySelectorAll<SVGGraphicsElement | HTMLButtonElement>(
      ".gg-legend, .gg-title, .gg-subtitle, .gg-legend-target",
    );
    for (const element of protectedElements)
      expect(overlaps(clearBounds, element.getBoundingClientRect())).toBe(false);
    expect(
      document.elementFromPoint(
        clearBounds.left + clearBounds.width / 2,
        clearBounds.top + clearBounds.height / 2,
      ),
    ).toBe(clear);
  });
});

describe("legend focus precedence", () => {
  it("projects externally coincident keys onto their one exact merged legend entry", async () => {
    const { container } = render(CoincidentLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const targets = [...container.querySelectorAll<HTMLButtonElement>(".gg-legend-target")];
    expect(targets.map((target) => target.getAttribute("aria-label"))).toEqual([
      "group: north (color + fill legend)",
      "group: south (color + fill legend)",
    ]);

    container.querySelector<HTMLButtonElement>("[data-external-focus]")!.click();
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    expect(targets.map((target) => target.getAttribute("aria-pressed"))).toEqual(["true", "false"]);

    container.querySelector<HTMLButtonElement>("[data-external-clear]")?.click();
    targets[0].click();
    await until(() => targets[0].getAttribute("aria-pressed") === "true");
    expect(targets.map((target) => target.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
  });

  it("keeps legend focus committed while an inspected muted mark is presented on top", async () => {
    const { container } = render(CoincidentLegendFocusPlot);
    await until(() => container.querySelectorAll(".gg-legend-target").length === 2);
    const north = container.querySelector<HTMLButtonElement>(
      ".gg-legend-target[aria-label='group: north (color + fill legend)']",
    )!;
    north.click();
    await until(() => container.querySelectorAll("[data-gg-focused='true']").length === 2);
    const southMark = container.querySelector<SVGGraphicsElement>("[data-gg-focused='false']")!;
    const markBounds = southMark.getBoundingClientRect();
    const capture = container.querySelector<HTMLElement>(".gg-capture")!;
    capture.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: markBounds.left + markBounds.width / 2,
        clientY: markBounds.top + markBounds.height / 2,
        pointerType: "mouse",
      }),
    );

    await until(() => container.querySelector(".gg-tooltip") !== null);
    await until(() => southMark.dataset.ggFocused === "true");
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".gg-hover-ring")).not.toBeNull();
    expect(container.querySelectorAll("[data-gg-focused='true']")).toHaveLength(3);

    capture.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await until(() => container.querySelector(".gg-tooltip") === null);
    await until(() => southMark.dataset.ggFocused === "false");
    expect(north.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-gg-focused='true']")).toHaveLength(2);
  });
});
