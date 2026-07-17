/**
 * Legend-filter controller unit + integration tests (S2 extraction).
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import GGPlot from "../src/lib/GGPlot.svelte";
import type { LegendFilterEvent } from "../src/lib/legend-filter.js";
import { createLegendFilterState } from "../src/lib/legend-filter-state.svelte.js";
import { createPlotRuntime, type PlotRuntime } from "../src/lib/plot-runtime.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { modelFor } from "./helpers/model.js";
import { reactiveBox } from "./helpers/reactive-box.svelte.js";
import { createReactiveRuntimeDeps } from "./helpers/runtime-deps.svelte.js";
import { render } from "./helpers/render.js";
import { until } from "./helpers/until.js";

const filterRows = [
  { x: 1, y: 1, group: "north" },
  { x: 2, y: 2, group: "south" },
];

type FilterCb = ((event: LegendFilterEvent) => void) | undefined;
/** Getter that supplies no host callback. */
const noCallback = (): FilterCb => undefined;

function colorSpec(
  data: readonly { x: number; y: number; group: string }[] = filterRows,
): PortableSpec {
  return gg([...data], aes({ x: "x", y: "y", color: "group" }))
    .geomPoint()
    .spec();
}

function clickEvent(detail = 1): MouseEvent {
  return new MouseEvent("click", { bubbles: true, detail });
}

describe("createLegendFilterState construction", () => {
  it("does not invoke the model getter during construction (before first flush)", () => {
    let modelCalls = 0;
    const { value: state, destroy } = withEffectRoot(() =>
      createLegendFilterState({
        effectiveSpec: () => colorSpec(),
        legendFilterProp: () => true,
        onlegendfilter: noCallback,
        oninteraction: noCallback,
        announce: () => {},
        model: () => {
          modelCalls++;
          return null;
        },
      }),
    );

    expect(modelCalls).toBe(0);
    // Client deriveds are lazy, so the construction-time assertion alone
    // cannot catch a model-reading $derived added to the factory. Force
    // every exposed accessor and one effect flush, then re-assert — that is
    // the closest client-side stand-in for Svelte 5.29's SSR behavior,
    // where such a derived evaluates eagerly at construction (TDZ hazard).
    expect(state.options).not.toBeNull();
    expect(state.filters).toEqual([]);
    expect(state.hasActiveFilters).toBe(false);
    flushSync();
    expect(modelCalls).toBe(0);
    destroy();
  });
});

describe("createLegendFilterState toggle and mode", () => {
  it("exclude-mode: first toggle hides value and emits a change clause", () => {
    const events: LegendFilterEvent[] = [];
    const announcements: string[] = [];
    const spec = colorSpec();
    const model = modelFor(spec);

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const controller = createLegendFilterState({
        effectiveSpec: () => spec,
        legendFilterProp: () => true,
        onlegendfilter: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: (message) => {
          announcements.push(message);
        },
        model: () => model,
      });
      controller.registerCatalogEffects(() => controller.computeEntries(model));
      return controller;
    });

    const entries = state.computeEntries(model);
    expect(entries).toHaveLength(2);
    const north = entries.find((entry) => entry.entry.value === "north")!;
    expect(north.visible).toBe(true);

    state.toggle(north, clickEvent());
    flushSync();

    expect(state.hasActiveFilters).toBe(true);
    expect(state.filters).toEqual([
      {
        scale: "color",
        field: "group",
        values: ["north"],
        mode: "exclude",
      },
    ]);
    expect(events).toEqual([
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
    expect(announcements.at(-1)).toBe("north hidden.");
    expect(state.computeEntries(model).find((e) => e.entry.value === "north")!.visible).toBe(false);

    destroy();
  });

  it("include-mode baseline starts from the full catalog", () => {
    const events: LegendFilterEvent[] = [];
    const spec = colorSpec();
    const model = modelFor(spec);

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const controller = createLegendFilterState({
        effectiveSpec: () => spec,
        legendFilterProp: () => ({ mode: "include" as const }),
        onlegendfilter: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
        model: () => model,
      });
      controller.registerCatalogEffects(() => controller.computeEntries(model));
      return controller;
    });

    const south = state.computeEntries(model).find((entry) => entry.entry.value === "south")!;
    // Include + multiple: first toggle removes south from the shown set.
    state.toggle(south, clickEvent());
    flushSync();

    expect(state.filters).toEqual([
      {
        scale: "color",
        field: "group",
        values: ["north"],
        mode: "include",
      },
    ]);
    expect(events[0]?.clause).toMatchObject({
      mode: "include",
      values: ["north"],
    });
    expect(state.computeEntries(model).find((e) => e.entry.value === "south")!.visible).toBe(false);
    expect(state.computeEntries(model).find((e) => e.entry.value === "north")!.visible).toBe(true);

    destroy();
  });
});

describe("createLegendFilterState capability and mode reset", () => {
  it("capability disable resets filters atomically with a single clear event + announce", () => {
    const events: LegendFilterEvent[] = [];
    const announcements: string[] = [];
    const prop = reactiveBox<boolean | { mode: "exclude" | "include" }>(true);
    const spec = colorSpec();
    const model = modelFor(spec);

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const controller = createLegendFilterState({
        effectiveSpec: () => spec,
        legendFilterProp: () => prop.value,
        onlegendfilter: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: (message) => {
          announcements.push(message);
        },
        model: () => model,
      });
      controller.registerCatalogEffects(() => controller.computeEntries(model));
      return controller;
    });

    const north = state.computeEntries(model).find((entry) => entry.entry.value === "north")!;
    state.toggle(north, clickEvent());
    flushSync();
    expect(state.filters).toHaveLength(1);
    const afterToggle = events.length;

    prop.set(false);
    flushSync();

    expect(state.options).toBeNull();
    expect(state.filters).toEqual([]);
    expect(state.hasActiveFilters).toBe(false);
    const clears = events.slice(afterToggle).filter((event) => event.phase === "clear");
    expect(clears).toHaveLength(1);
    expect(clears[0]).toEqual({
      type: "legend-filter",
      phase: "clear",
      source: "programmatic",
      clause: null,
    });
    expect(announcements).toContain("Legend filters reset after the filter capability changed.");

    destroy();
  });

  it("mode flip exclude→include resets clauses (no stale reinterpretation)", () => {
    const events: LegendFilterEvent[] = [];
    const prop = reactiveBox<boolean | { mode: "exclude" | "include" }>({
      mode: "exclude",
    });
    const spec = colorSpec();
    const model = modelFor(spec);

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const controller = createLegendFilterState({
        effectiveSpec: () => spec,
        legendFilterProp: () => prop.value,
        onlegendfilter: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
        model: () => model,
      });
      controller.registerCatalogEffects(() => controller.computeEntries(model));
      return controller;
    });

    const north = state.computeEntries(model).find((entry) => entry.entry.value === "north")!;
    state.toggle(north, clickEvent());
    flushSync();
    expect(state.filters[0]?.mode).toBe("exclude");
    const afterToggle = events.length;

    prop.set({ mode: "include" });
    flushSync();

    expect(state.filters).toEqual([]);
    expect(state.hasActiveFilters).toBe(false);
    expect(events.slice(afterToggle).at(-1)).toEqual({
      type: "legend-filter",
      phase: "clear",
      source: "programmatic",
      clause: null,
    });

    destroy();
  });
});

describe("createLegendFilterState catalog reconciliation", () => {
  it("prunes disappeared values, removes emptied clauses, and returns visible later", () => {
    const events: LegendFilterEvent[] = [];
    const both = filterRows;
    const onlySouth = [{ x: 2, y: 2, group: "south" }];
    const data = reactiveBox(both);
    const modelBox = reactiveBox(modelFor(colorSpec(data.value)));

    const { value: state, destroy } = withFlushedEffectRoot(() => {
      const controller = createLegendFilterState({
        effectiveSpec: () => colorSpec(data.value),
        legendFilterProp: () => true,
        onlegendfilter: () => (event) => {
          events.push(event);
        },
        oninteraction: noCallback,
        announce: () => {},
        model: () => modelBox.value,
      });
      controller.registerCatalogEffects(() => controller.computeEntries(modelBox.value));
      return controller;
    });

    const north = state
      .computeEntries(modelBox.value)
      .find((entry) => entry.entry.value === "north")!;
    state.toggle(north, clickEvent());
    flushSync();
    expect(state.filters[0]?.values).toEqual(["north"]);

    // Drop north from the catalog: exclude clause empties → removed.
    data.set(onlySouth);
    modelBox.set(modelFor(colorSpec(onlySouth)));
    flushSync();

    expect(state.filters).toEqual([]);
    expect(events.some((event) => event.phase === "remove")).toBe(true);

    // North returns: no residual clause; entry visible again.
    data.set(both);
    modelBox.set(modelFor(colorSpec(both)));
    flushSync();

    const restored = state
      .computeEntries(modelBox.value)
      .find((entry) => entry.entry.value === "north")!;
    expect(restored.visible).toBe(true);

    destroy();
  });
});

describe("runtime + legend-filter real cycle", () => {
  it("toggling a filter retrains the model via rowFilters", () => {
    const spec = colorSpec();

    const { value, destroy } = withFlushedEffectRoot(() => {
      const runtimeDeps = createReactiveRuntimeDeps({
        assembled: spec,
        effectiveSpec: spec,
      });
      // Host wiring: the controller is constructed BEFORE the runtime and
      // reads the model through a getter closure over the later-declared
      // runtime (never invoked during construction), so the catalog effect
      // always sees the freshly retrained model — no manual re-sync.
      let runtimeRef: PlotRuntime | null = null;
      const controller = createLegendFilterState({
        effectiveSpec: () => spec,
        legendFilterProp: () => true,
        onlegendfilter: noCallback,
        oninteraction: noCallback,
        announce: () => {},
        model: () => runtimeRef?.model ?? null,
      });
      const runtime = createPlotRuntime({
        ...runtimeDeps,
        effectiveLegendFilters: () => controller.filters,
      });
      runtimeRef = runtime;
      // Host registration order (GGPlot.svelte): model -> catalog -> late.
      runtime.registerModelEffects();
      controller.registerCatalogEffects(() => controller.computeEntries(runtime.model));
      runtime.registerLateEffects();
      return { runtime, controller };
    });

    const { runtime, controller } = value;
    expect(runtime.model).not.toBeNull();
    expect(runtime.model!.candidates.size).toBe(2);

    const north = controller
      .computeEntries(runtime.model)
      .find((entry) => entry.entry.value === "north")!;
    controller.toggle(north, clickEvent());
    flushSync();

    expect(controller.filters).toHaveLength(1);
    expect(runtime.model).not.toBeNull();
    expect(runtime.model!.candidates.size).toBe(1);

    destroy();
  });
});

describe("PlotLegendFilters component layout and pointer source", () => {
  it("combined legend-focus clear + filters reserves both rows", async () => {
    const view = render(GGPlot, {
      data: [
        { id: "a", x: 1, y: 1, group: "north" },
        { id: "b", x: 2, y: 2, group: "south" },
      ],
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      key: "id",
      legendFilter: true,
      legendFocus: true,
      width: 360,
      height: 260,
    });
    await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
    await until(() => view.container.querySelector(".gg-legend-target") !== null);

    // Commit a legend focus so the clear control appears (combined layout).
    const legendTarget = view.container.querySelector<HTMLElement>(".gg-legend-target")!;
    legendTarget.focus();
    legendTarget.click();
    await until(() => view.container.querySelector(".gg-with-legend-clear") !== null);

    const root = view.container.querySelector<HTMLElement>(".gg-plot-root")!;
    expect(root.classList.contains("gg-with-legend-filters")).toBe(true);
    expect(getComputedStyle(root).marginBottom).toBe("106px");

    const fieldset = view.container.querySelector<HTMLElement>(".gg-legend-filters")!;
    // Cross-component rewrite: below-clear class carries the old combined
    // selector's `top: calc(100% + 52px)` (used value = scene height + 52).
    expect(fieldset.classList.contains("gg-legend-filters-below-clear")).toBe(true);
    // Used value of calc(100% + 52px) with scene height 260 → 312px
    // (default without below-clear is calc(100% + 4px) → 264px).
    expect(getComputedStyle(fieldset).top).toBe("312px");
  });

  it("narrow container keeps existing max-width and overflow behavior", async () => {
    const view = render(GGPlot, {
      data: filterRows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      legendFilter: true,
      width: 120,
      height: 200,
    });
    await until(() => view.container.querySelector(".gg-legend-filters") !== null);

    const fieldset = view.container.querySelector<HTMLElement>(".gg-legend-filters")!;
    const style = getComputedStyle(fieldset);
    expect(style.maxWidth).toBe("calc(100% - 8px)");
    expect(style.overflowX).toBe("auto");
  });

  it("reset-button focus restoration lands on the first checkbox", async () => {
    const view = render(GGPlot, {
      data: filterRows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      legendFilter: true,
      width: 360,
      height: 260,
    });
    await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);

    view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
    await until(
      () => view.container.querySelector("button[aria-label='Reset legend filters']") !== null,
    );
    const reset = view.container.querySelector<HTMLButtonElement>(
      "button[aria-label='Reset legend filters']",
    )!;
    reset.focus();
    reset.click();
    await until(
      () =>
        document.activeElement ===
        view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']"),
    );
    expect(document.activeElement).toBe(
      view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']"),
    );
  });

  it("pointerdown touch sets event source; pointercancel clears it", async () => {
    const events: LegendFilterEvent[] = [];
    const view = render(GGPlot, {
      data: filterRows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      legendFilter: true,
      width: 360,
      height: 260,
      onlegendfilter: (event: LegendFilterEvent) => {
        events.push(event);
      },
    });
    await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);

    const north = view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!;
    north.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    north.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => events.some((event) => event.phase === "change"));
    expect(events.at(-1)?.source).toBe("touch");

    // Cancel clears the sticky pointer type so the next click is pointer.
    const south = view.container.querySelector<HTMLInputElement>("input[aria-label='Show south']")!;
    south.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    south.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    south.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await until(() => events.filter((event) => event.phase === "change").length >= 2);
    expect(events.at(-1)?.source).toBe("pointer");
  });
});

describe("filter capability disable onrender sequence (S2 host)", () => {
  it("emits onrender without a stale filtered model when filtering is disabled", async () => {
    const renders: number[] = [];
    const props = {
      data: filterRows,
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      legendFilter: true as boolean,
      width: 360,
      height: 260,
      onrender: (model: { candidates: { size: number } }) => {
        renders.push(model.candidates.size);
      },
    };
    const view = render(GGPlot, props);
    await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
    expect(renders.at(-1)).toBe(2);

    view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
    await until(() => renders.at(-1) === 1);
    const afterFilterCount = renders.length;

    await view.rerender({ ...props, legendFilter: false });
    await until(() => renders.at(-1) === 2 && renders.length > afterFilterCount);

    expect(renders.at(-1)).toBe(2);
    const afterDisable = renders.slice(afterFilterCount);
    expect(afterDisable.at(-1)).toBe(2);
  });
});
