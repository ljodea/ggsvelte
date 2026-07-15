import { describe, expect, it } from "vitest";

import LinkedControllerPlot from "./fixtures/LinkedControllerPlot.svelte";
import MissingControllerScopePlot from "./fixtures/MissingControllerScopePlot.svelte";
import { expectAccessible } from "./helpers/accessibility.js";
import { render } from "./helpers/render.js";

function until(predicate: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - started > timeout) {
        reject(new Error("until() timed out"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function state(container: HTMLElement): DOMStringMap {
  return container.querySelector<HTMLElement>("[data-controller-state]")!.dataset;
}

function clickFirstMark(container: HTMLElement): void {
  const plot = container.querySelector<HTMLElement>("[data-plot-a]")!;
  const capture = plot.querySelector<HTMLElement>(".gg-capture")!;
  const mark = plot.querySelector<SVGCircleElement>(".gg-points circle")!;
  const bounds = mark.getBoundingClientRect();
  capture.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    }),
  );
}

describe("linked semantic interaction controller", () => {
  it("requires an explicit semantic scope for every controlled plot", () => {
    expect(() => render(MissingControllerScopePlot)).toThrow(/requires interactionScope/);
  });

  it("links two plots and a table with one transition and no passive callback echo", async () => {
    const { container } = render(LinkedControllerPlot);
    clickFirstMark(container);
    await until(() => state(container)["transitions"] === "1");

    expect(state(container)["callbacksA"]).toBe("1");
    expect(state(container)["callbacksB"]).toBe("0");
    expect(container.querySelectorAll("[data-plot-a] .gg-selected-ring")).toHaveLength(1);
    expect(container.querySelectorAll("[data-plot-b] .gg-selected-ring")).toHaveLength(1);
    expect(container.querySelectorAll("[data-plot-other] .gg-selected-ring")).toHaveLength(0);
    expect(container.querySelector("[data-row='a']")?.getAttribute("aria-selected")).toBe("true");

    container.querySelector<HTMLButtonElement>("[data-select-b]")!.click();
    await until(() => state(container)["transitions"] === "2");
    expect(state(container)["callbacksA"]).toBe("1");
    expect(state(container)["callbacksB"]).toBe("0");
    expect(container.querySelector("[data-row='b']")?.getAttribute("aria-selected")).toBe("true");

    container.querySelector<HTMLButtonElement>("[data-clear]")!.click();
    await until(() => state(container)["transitions"] === "3");
    const linkedSurface = container.querySelector<HTMLElement>("[data-plot-b] .gg-capture")!;
    linkedSurface.focus();
    linkedSurface.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await until(() => state(container)["transitions"] === "4");
    expect(state(container)["callbacksA"]).toBe("1");
    expect(state(container)["callbacksB"]).toBe("1");
    expect(container.querySelectorAll(".gg-selected-ring")).toHaveLength(2);
    await expectAccessible(container);
  });

  it("projects emphasis without rerunning the pipeline and reconciles replacement explicitly", async () => {
    const { container } = render(LinkedControllerPlot);
    const beforeRendersA = state(container)["rendersA"];
    const beforeRendersB = state(container)["rendersB"];
    container.querySelector<HTMLButtonElement>("[data-emphasize-c]")!.click();
    await until(() => state(container)["transitions"] === "1");

    expect(container.querySelectorAll("[data-plot-a] .gg-emphasized-ring")).toHaveLength(1);
    expect(container.querySelectorAll("[data-plot-b] .gg-emphasized-ring")).toHaveLength(1);
    expect(container.querySelectorAll("[data-plot-other] .gg-emphasized-ring")).toHaveLength(0);
    expect(state(container)["rendersA"]).toBe(beforeRendersA);
    expect(state(container)["rendersB"]).toBe(beforeRendersB);

    container.querySelector<HTMLButtonElement>("[data-replace]")!.click();
    await until(() => container.querySelector("[data-row='c']") === null);
    expect(state(container)["transitions"]).toBe("2");
    expect(container.querySelectorAll(".gg-emphasized-ring")).toHaveLength(0);
  });

  it("links matching zoom channels and ignores a mismatched scope", async () => {
    const { container } = render(LinkedControllerPlot);
    const beforeRendersA = state(container)["rendersA"];
    const beforeRendersB = state(container)["rendersB"];
    const beforeRendersOther = state(container)["rendersOther"];
    container.querySelector<HTMLButtonElement>("[data-zoom-x]")!.click();
    await until(
      () =>
        Number(state(container)["rendersA"]) > Number(beforeRendersA) &&
        Number(state(container)["rendersB"]) > Number(beforeRendersB),
    );
    expect(state(container)["transitions"]).toBe("1");
    expect(state(container)["rendersOther"]).toBe(beforeRendersOther);
    expect(state(container)["callbacksA"]).toBe("0");
    expect(state(container)["callbacksB"]).toBe("0");
  });
});
