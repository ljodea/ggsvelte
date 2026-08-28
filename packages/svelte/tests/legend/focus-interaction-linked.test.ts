import { describe, expect, it } from "vitest";
import LinkedLegendFocusPlot from "../fixtures/LinkedLegendFocusPlot.svelte";
import { expectAccessible } from "../helpers/accessibility.js";
import { render } from "../helpers/render.js";
import { until } from "../helpers/until.js";

function state(container: HTMLElement): DOMStringMap {
  return container.querySelector<HTMLElement>("[data-legend-state]")!.dataset;
}

function afterFrame(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  requestAnimationFrame(() => {
    resolve();
  });
  return promise;
}
describe("linked legend focus", () => {
  it("maps encoded legend values to stable row keys with one transition and no rerun", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const before = {
      rendersA: state(container)["rendersA"],
      rendersB: state(container)["rendersB"],
      rendersC: state(container)["rendersC"],
    };
    const north = container.querySelectorAll<HTMLButtonElement>(
      "[data-plot-a] .gg-legend-target",
    )[0];
    const target = north.getBoundingClientRect();
    expect(
      document.elementFromPoint(target.left + target.width / 2, target.top + target.height / 2),
    ).toBe(north);
    north.click();
    await until(() => state(container)["transitions"] === "1");

    expect(state(container)["emphasized"]).toBe("a,c");
    expect(state(container)["emphasized"]).not.toContain("north");
    expect(state(container)["callbacksA"]).toBe("1");
    expect(state(container)["callbacksB"]).toBe("0");
    expect(state(container)["callbacksC"]).toBe("0");
    expect(state(container)["rendersA"]).toBe(before["rendersA"]);
    expect(state(container)["rendersB"]).toBe(before["rendersB"]);
    expect(state(container)["rendersC"]).toBe(before["rendersC"]);
    expect(container.querySelectorAll("[data-plot-a] [data-gg-focused='true']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-plot-c] [data-gg-focused='true']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-plot-other] [data-gg-focused]")).toHaveLength(0);

    north.click();
    await until(() => state(container)["transitions"] === "2");
    expect(state(container)["emphasized"]).toBe("");
    await expectAccessible(container);
  });

  it("previews without mutating the shared controller", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    const north = container.querySelector<HTMLButtonElement>("[data-plot-a] .gg-legend-target")!;
    north.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await until(
      () => container.querySelectorAll("[data-plot-a] [data-gg-focused='true']").length === 2,
    );
    expect(state(container)["transitions"]).toBe("0");
    expect(state(container)["emphasized"]).toBe("");
    expect(container.querySelectorAll("[data-plot-b] [data-gg-focused]")).toHaveLength(0);
    north.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await until(() => container.querySelectorAll("[data-plot-a] [data-gg-focused]").length === 0);
  });

  it("uses deterministic non-wrapping roving focus and supports Enter, Space, and Escape", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const targets = [
      ...container.querySelectorAll<HTMLButtonElement>("[data-plot-a] .gg-legend-target"),
    ];
    const [north, south] = targets as [HTMLButtonElement, HTMLButtonElement];

    expect(targets.map((target) => target.tabIndex)).toEqual([0, -1]);
    north.focus();
    north.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(document.activeElement).toBe(north);

    north.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await until(() => document.activeElement === south);
    expect(targets.map((target) => target.tabIndex)).toEqual([-1, 0]);
    south.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(south);

    south.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await until(() => state(container)["emphasized"] === "b");
    expect(south.getAttribute("aria-pressed")).toBe("true");

    south.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    await until(() => document.activeElement === north);
    north.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await until(() => state(container)["emphasized"] === "a,c");
    expect(north.getAttribute("aria-pressed")).toBe("true");

    north.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await until(() => state(container)["emphasized"] === "");
    expect(north.getAttribute("aria-pressed")).toBe("false");
  });

  it("commits one touch activation and suppresses its compatibility click", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const targets = [
      ...container.querySelectorAll<HTMLButtonElement>("[data-plot-a] .gg-legend-target"),
    ];
    const [north, south] = targets as [HTMLButtonElement, HTMLButtonElement];

    south.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch" }),
    );
    south.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch" }),
    );
    south.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    await until(() => state(container)["emphasized"] === "b");
    expect(state(container)["transitions"]).toBe("1");
    expect(south.getAttribute("aria-pressed")).toBe("true");

    // Suppress must clear: a subsequent real click must still activate.
    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => state(container)["emphasized"] === "a,c");
    expect(state(container)["transitions"]).toBe("2");
    expect(north.getAttribute("aria-pressed")).toBe("true");
  });

  it("cancels a touch sequence without committing emphasis", async () => {
    const { container } = render(LinkedLegendFocusPlot);
    await until(() => container.querySelectorAll("[data-plot-a] .gg-legend-target").length === 2);
    const south = container.querySelectorAll<HTMLButtonElement>(
      "[data-plot-a] .gg-legend-target",
    )[1];

    south.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 8, pointerType: "touch" }),
    );
    south.dispatchEvent(
      new PointerEvent("pointercancel", { bubbles: true, pointerId: 8, pointerType: "touch" }),
    );
    south.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 8, pointerType: "touch" }),
    );
    await afterFrame();

    expect(state(container)["transitions"]).toBe("0");
    expect(state(container)["emphasized"]).toBe("");
    expect(south.getAttribute("aria-pressed")).toBe("false");
  });
});
