/**
 * Plot runtime unit + integration tests (S1 extraction).
 * Factories own effects — instantiate under `$effect.root` and destroy.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import { aes, gg, type PortableSpec } from "@ggsvelte/spec";

import GGPlot from "../src/lib/GGPlot.svelte";
import { createPlotRuntime } from "../src/lib/plot-runtime.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import {
  createReactiveRuntimeDeps,
  type ReactiveRuntimeDeps,
} from "./helpers/runtime-deps.svelte.js";
import { render } from "./helpers/render.js";

const minimalSpec: PortableSpec = gg(
  [
    { x: 1, y: 10, cls: "a" },
    { x: 2, y: 20, cls: "b" },
  ],
  aes({ x: "x", y: "y", color: "cls" }),
)
  .geomPoint()
  .spec();

describe("createPlotRuntime construction", () => {
  it("does not invoke dep getters during construction (before first flush)", () => {
    let calls = 0;
    const count =
      <T>(v: T) =>
      () => {
        calls++;
        return v;
      };
    const emptyOnrender = (): undefined => {
      calls++;
    };

    const { value: runtime, destroy } = withEffectRoot(() => {
      const rt = createPlotRuntime({
        widthProp: count(480),
        heightProp: count(320),
        assembled: count(minimalSpec),
        effectiveSpec: count(minimalSpec),
        effectiveZoomDomains: count(null),
        effectiveLegendFilters: count([]),
        root: count(null),
        resetZoom: () => {
          calls++;
        },
        onrender: emptyOnrender,
      });
      return rt;
    });

    expect(calls).toBe(0);
    destroy();
    void runtime;
  });

  it("survives the first real cycle with legend-filter state wired both ways", () => {
    // Host holds filter state as reactive deps; runtime reads via getter.
    const { value, destroy } = withFlushedEffectRoot(() => {
      const deps = createReactiveRuntimeDeps({
        assembled: minimalSpec,
        effectiveSpec: minimalSpec,
      });
      const rt = createPlotRuntime(deps);
      rt.registerModelEffects();
      rt.registerLateEffects();
      return { runtime: rt, deps };
    });
    const { runtime, deps } = value;

    expect(runtime.model).not.toBeNull();
    expect(runtime.model!.candidates.size).toBe(2);
    expect(runtime.resolvedWidth).toBe(480);
    expect(runtime.resolvedHeight).toBe(320);
    expect(runtime.ready).toBe(true);

    deps.setFilters([
      {
        scale: "color",
        field: "cls",
        values: ["a"],
        mode: "exclude",
      },
    ]);
    // Force model re-evaluation (filters are a dep of the model derived).
    void runtime.model;
    flushSync();
    expect(runtime.model).not.toBeNull();
    expect(runtime.model!.candidates.size).toBe(1);

    destroy();
  });
});

describe("createPlotRuntime model production", () => {
  it("produces a model for a minimal spec at explicit width/height", () => {
    const { value: runtime, destroy } = withFlushedEffectRoot(() => {
      const deps = createReactiveRuntimeDeps({
        assembled: minimalSpec,
        effectiveSpec: minimalSpec,
      });
      const rt = createPlotRuntime(deps);
      rt.registerModelEffects();
      rt.registerLateEffects();
      return rt;
    });

    const model = runtime.model;
    expect(model).not.toBeNull();
    // Known-good literals from the component fixture shape (2 points, 2 colors).
    expect(model!.candidates.size).toBe(2);
    expect(model!.scene.width).toBe(480);
    expect(model!.scene.height).toBe(320);
    expect(runtime.resolvedWidth).toBe(480);
    expect(runtime.resolvedHeight).toBe(320);
    expect(runtime.strata.length).toBeGreaterThan(0);
    expect(runtime.hasCanvas).toBe(false);
    expect(runtime.canvasCount).toBe(0);

    destroy();
  });

  it("run-id gate: newer run commits; resetScales clears and retrains", () => {
    const resetZoom = vi.fn();
    let deps!: ReactiveRuntimeDeps;

    const { value: runtime, destroy } = withFlushedEffectRoot(() => {
      deps = createReactiveRuntimeDeps({
        assembled: minimalSpec,
        effectiveSpec: minimalSpec,
      });
      deps.setResetZoom(resetZoom);
      const rt = createPlotRuntime(deps);
      rt.registerModelEffects();
      rt.registerLateEffects();
      return rt;
    });

    const first = runtime.model;
    expect(first).not.toBeNull();
    const firstRunId = first!.runId;
    const firstColorState = first!.scales.state["color"];

    const nextSpec = gg(
      [
        { x: 1, y: 10, cls: "a" },
        { x: 2, y: 20, cls: "b" },
        { x: 3, y: 15, cls: "c" },
      ],
      aes({ x: "x", y: "y", color: "cls" }),
    )
      .geomPoint()
      .spec();
    deps.setAssembled(nextSpec);
    deps.setEffectiveSpec(nextSpec);
    // Force evaluation so an intermediate model exists (codex P2-4).
    const mid = runtime.model!;
    expect(mid.runId).toBeGreaterThan(firstRunId);
    expect(mid.scales.state["color"]).toBeDefined();
    if (firstColorState !== undefined) {
      expect(mid.scales.state["color"]?.type).toBe(firstColorState.type);
    }
    flushSync();

    runtime.resetScales();
    expect(resetZoom).toHaveBeenCalledOnce();
    const after = runtime.model!;
    expect(after.runId).toBeGreaterThan(mid.runId);
    expect(after.candidates.size).toBe(3);
    flushSync();

    destroy();
  });

  it("ready flips only after every canvas stratum of the CURRENT model painted", () => {
    const canvasSpec = gg(
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomPoint({ render: "canvas" })
      .spec();

    const { value: runtime, destroy } = withFlushedEffectRoot(() => {
      const deps = createReactiveRuntimeDeps({
        assembled: canvasSpec,
        effectiveSpec: canvasSpec,
      });
      const rt = createPlotRuntime(deps);
      rt.registerModelEffects();
      rt.registerLateEffects();
      return rt;
    });

    expect(runtime.hasCanvas).toBe(true);
    expect(runtime.ready).toBe(false);

    const runId = runtime.model!.runId;
    // Stale notify for an old run must not flip ready.
    runtime.notifyPainted(runId - 1, "0");
    flushSync();
    expect(runtime.ready).toBe(false);

    // Stratum keys match PlotMarkStrata: index in the strata array as string.
    runtime.strata.forEach((stratum, index) => {
      if (stratum.backend === "canvas") runtime.notifyPainted(runId, String(index));
    });
    flushSync();
    expect(runtime.ready).toBe(true);

    destroy();
  });

  it("disposes a superseded model after flush when models are forced to evaluate", () => {
    const disposed: number[] = [];
    let deps!: ReactiveRuntimeDeps;

    const { value: runtime, destroy } = withFlushedEffectRoot(() => {
      deps = createReactiveRuntimeDeps({
        assembled: minimalSpec,
        effectiveSpec: minimalSpec,
      });
      const rt = createPlotRuntime(deps);
      rt.registerModelEffects();
      rt.registerLateEffects();
      return rt;
    });

    const first = runtime.model!;
    const originalDispose = first.dispose.bind(first);
    first.dispose = () => {
      disposed.push(first.runId);
      originalDispose();
    };

    // Intermediate model: force evaluation so it genuinely exists before the
    // next write (two writes in one tick coalesce — codex P2-4).
    const midSpec = gg([{ x: 1, y: 1 }], aes({ x: "x", y: "y" }))
      .geomPoint()
      .spec();
    deps.setAssembled(midSpec);
    deps.setEffectiveSpec(midSpec);
    const mid = runtime.model!;
    expect(mid.runId).not.toBe(first.runId);
    const midDispose = mid.dispose.bind(mid);
    mid.dispose = () => {
      disposed.push(mid.runId);
      midDispose();
    };
    flushSync();
    // first should be disposed after the flush that committed mid.
    expect(disposed).toContain(first.runId);

    const lastSpec = gg(
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ],
      aes({ x: "x", y: "y" }),
    )
      .geomPoint()
      .spec();
    deps.setAssembled(lastSpec);
    deps.setEffectiveSpec(lastSpec);
    void runtime.model;
    flushSync();
    expect(disposed).toContain(mid.runId);

    destroy();
  });

  it("disconnects ResizeObserver, cancels rAF, and disposes last model on unmount", () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    const cancelAnimationFrameSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const OriginalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
      constructor(cb: ResizeObserverCallback) {
        void cb;
      }
    } as unknown as typeof ResizeObserver;

    const { value: runtime, destroy } = withFlushedEffectRoot(() => {
      const deps = createReactiveRuntimeDeps({
        assembled: minimalSpec,
        effectiveSpec: minimalSpec,
      });
      const el = document.createElement("div");
      deps.setRoot(el);
      deps.setWidth("container");
      const rt = createPlotRuntime(deps);
      rt.registerModelEffects();
      rt.registerLateEffects();
      return rt;
    });

    const lastModel = runtime.model;
    expect(lastModel).not.toBeNull();
    expect(observe).toHaveBeenCalled();

    const disposeSpy = vi.fn();
    const originalDispose = lastModel!.dispose.bind(lastModel!);
    lastModel!.dispose = () => {
      disposeSpy();
      originalDispose();
    };

    destroy();
    flushSync();

    expect(disconnect).toHaveBeenCalled();
    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    expect(disposeSpy).toHaveBeenCalled();

    globalThis.ResizeObserver = OriginalRO;
    cancelAnimationFrameSpy.mockRestore();
  });
});

describe("filter capability disable onrender sequence", () => {
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

  it("emits onrender without a stale filtered model when filtering is disabled", async () => {
    const renders: number[] = [];
    const props = {
      data: [
        { x: 1, y: 1, group: "north" },
        { x: 2, y: 2, group: "south" },
      ],
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

    // Final callback after disable must be the unfiltered model.
    expect(renders.at(-1)).toBe(2);
    const afterDisable = renders.slice(afterFilterCount);
    expect(afterDisable.at(-1)).toBe(2);
  });

  it("mode remap clears filters without a stale-mode onrender trail", async () => {
    const renders: number[] = [];
    const base = {
      data: [
        { x: 1, y: 1, group: "north" },
        { x: 2, y: 2, group: "south" },
      ],
      aes: { x: "x", y: "y", color: "group" },
      layers: [{ geom: "point" as const }],
      width: 360,
      height: 260,
      onrender: (model: { candidates: { size: number } }) => {
        renders.push(model.candidates.size);
      },
    };
    const view = render(GGPlot, {
      ...base,
      legendFilter: { mode: "exclude" as const },
    });
    await until(() => view.container.querySelectorAll(".gg-legend-filters input").length === 2);
    view.container.querySelector<HTMLInputElement>("input[aria-label='Show north']")!.click();
    await until(() => renders.at(-1) === 1);
    const afterFilter = renders.length;

    await view.rerender({
      ...base,
      legendFilter: { mode: "include" as const },
    });
    await until(() => renders.length > afterFilter && renders.at(-1) === 2);

    expect(renders.at(-1)).toBe(2);
  });
});
