import { describe, expect, it } from "vitest";

import LegendFilterPlot from "./fixtures/LegendFilterPlot.svelte";
import { expectAccessible } from "./helpers/accessibility.js";
import { render } from "./helpers/render.js";

function until(predicate: () => boolean, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (performance.now() - started > timeout) return reject(new Error("until() timed out"));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function state(container: HTMLElement): DOMStringMap {
  return container.querySelector<HTMLElement>("[data-legend-filter-state]")!.dataset;
}

describe("explicit legend filtering", () => {
  it("uses native Show-category checkboxes and filters before one pipeline render", async () => {
    const { container } = render(LegendFilterPlot);
    await until(() => container.querySelectorAll(".gg-legend-filters input").length === 2);
    const before = { ...state(container) };
    const north = container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!;

    expect(north.checked).toBe(true);
    north.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => state(container)["candidates"] === "1");

    expect(north.checked).toBe(false);
    expect(Number(state(container)["renders"])).toBe(Number(before["renders"]) + 1);
    expect(state(container)["colors"]).toBe(before["colors"]);
    expect(JSON.parse(state(container)["events"] ?? "[]")).toEqual([
      {
        type: "legend-filter",
        phase: "change",
        source: "pointer",
        clause: {
          scale: "color",
          field: "group",
          values: ["north"],
          mode: "exclude",
        },
      },
    ]);
    await expectAccessible(container);
  });

  it("can hide every category and recover with a separate reset control", async () => {
    const { container } = render(LegendFilterPlot);
    await until(() => container.querySelectorAll(".gg-legend-filters input").length === 2);
    container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
    await until(() => state(container)["candidates"] === "1");
    container.querySelector<HTMLInputElement>("input[aria-label='Show south']")!.click();
    await until(() => state(container)["candidates"] === "0");

    const reset = container.querySelector<HTMLButtonElement>(
      "button[aria-label='Reset legend filters']",
    )!;
    expect(reset).not.toBeNull();
    expect(getComputedStyle(reset).minHeight).toBe("44px");
    reset.click();
    await until(() => state(container)["candidates"] === "3");

    expect(
      [...container.querySelectorAll<HTMLInputElement>(".gg-legend-filters input")].every(
        (input) => input.checked,
      ),
    ).toBe(true);
    const events = JSON.parse(state(container)["events"] ?? "[]");
    expect(events.at(-1)).toEqual({
      type: "legend-filter",
      phase: "clear",
      source: "keyboard",
      clause: null,
    });
  });

  it("supports include/single mode and keyboard activation", async () => {
    const { container } = render(LegendFilterPlot, {
      mode: "include",
      multiple: false,
    });
    await until(() => container.querySelectorAll(".gg-legend-filters input").length === 2);
    const south = container.querySelector<HTMLInputElement>("input[aria-label='Show south']")!;
    south.focus();
    south.click();
    await until(() => state(container)["candidates"] === "1");

    expect(south.checked).toBe(true);
    expect(
      container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.checked,
    ).toBe(false);
    expect(JSON.parse(state(container)["events"] ?? "[]")[0]?.source).toBe("keyboard");
  });

  it("filters canvas marks through the same semantic path", async () => {
    const { container } = render(LegendFilterPlot, { backend: "canvas" });
    await until(() => container.querySelector("canvas.gg-canvas") !== null);
    container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
    await until(() => state(container)["candidates"] === "1");
    expect(container.querySelector("canvas.gg-canvas")).not.toBeNull();
  });
});
