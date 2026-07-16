import { expect, test } from "vitest";

import GGPlot from "../src/lib/GGPlot.svelte";
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

test("disappeared filter values return visible while resetScales keeps active filters", async () => {
  let candidates = 0;
  const base = {
    aes: { x: "x", y: "y", color: "group" },
    layers: [{ geom: "point" as const }],
    legendFilter: true,
    width: 360,
    height: 260,
    onrender: (model: { candidates: { size: number } }) => {
      candidates = model.candidates.size;
    },
  };
  const both = [
    { x: 1, y: 1, group: "north" },
    { x: 2, y: 2, group: "south" },
  ];
  const view = render(GGPlot, { ...base, data: both });
  await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
  view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
  await until(() => candidates === 1);

  await view.rerender({ ...base, data: [both[1]!] });
  await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 1);
  await view.rerender({ ...base, data: both });
  await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
  expect(
    view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.checked,
  ).toBe(true);
  expect(candidates).toBe(2);

  view.container.querySelector<HTMLInputElement>("input[aria-label='Show south']")!.click();
  await until(() => candidates === 1);
  (view as unknown as { component: { resetScales(): void } }).component.resetScales();
  await until(() => candidates === 1);
  expect(
    view.container.querySelector<HTMLInputElement>("input[aria-label='Show south']")!.checked,
  ).toBe(false);
});
