import { expect, test } from "vitest";

import GGPlot from "../src/lib/GGPlot.svelte";
import type { LegendFilterEvent } from "../src/lib/legend-filter.js";
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

  await view.rerender({ ...base, data: [both[1]] });
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

test("explicit layer aes null clears active filters instead of silently filtering", async () => {
  let candidates = 0;
  const events: LegendFilterEvent[] = [];
  const both = [
    { x: 1, y: 1, group: "north" },
    { x: 2, y: 2, group: "south" },
  ];
  const base = {
    aes: { x: "x", y: "y", color: "group" },
    layers: [{ geom: "point" as const }],
    legendFilter: true,
    width: 360,
    height: 260,
    onrender: (model: { candidates: { size: number } }) => {
      candidates = model.candidates.size;
    },
    onlegendfilter: (event: LegendFilterEvent) => {
      events.push(event);
    },
  };
  const view = render(GGPlot, { ...base, data: both });
  await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
  view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
  await until(() => candidates === 1);

  // The layer explicitly unsets color (null-unset semantics): the old global
  // binding is gone, so the active filter must clear rather than keep
  // filtering rows with no visible legend control.
  await view.rerender({
    ...base,
    data: both,
    layers: [{ geom: "point" as const, aes: { color: null } }],
  });
  await until(() => events.some((event) => event.phase === "clear"));
  await until(() => candidates === 2);
});

test("include reconciliation reports clause removal instead of an empty include change", async () => {
  let candidates = 0;
  const events: LegendFilterEvent[] = [];
  const both = [
    { x: 1, y: 1, group: "north" },
    { x: 2, y: 2, group: "south" },
  ];
  const base = {
    aes: { x: "x", y: "y", color: "group" },
    layers: [{ geom: "point" as const }],
    legendFilter: { mode: "include" as const },
    width: 360,
    height: 260,
    onrender: (model: { candidates: { size: number } }) => {
      candidates = model.candidates.size;
    },
    onlegendfilter: (event: LegendFilterEvent) => {
      events.push(event);
    },
  };
  const view = render(GGPlot, { ...base, data: both });
  await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
  view.container.querySelector<HTMLInputElement>("input[aria-label='Show south']")?.click();
  await until(() => candidates === 1 && events.length === 1);

  await view.rerender({ ...base, data: [both[1]] });
  await until(() => events.some((event) => event.phase === "remove"));
  expect(candidates).toBe(1);
  expect(events.at(-1)).toEqual({
    type: "legend-filter",
    phase: "remove",
    source: "programmatic",
    clause: {
      scale: "color",
      field: "group",
      values: [],
      mode: "include",
    },
  });
});
