/**
 * Behaviour coverage for the plot engine factory: assemble → model →
 * interaction config across a chart lifecycle. Guards the #982 merge of
 * orchestrator + interaction assembly and the #1040 host.props surface
 * (no layout/substring tests).
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { RenderModel } from "@ggsvelte/core";

import { LayerRegistry } from "../src/lib/geoms/registry.svelte.js";
import { createPlotEngine } from "../src/lib/plot-engine.svelte.js";
import type { EnginePlotProps } from "../src/lib/plot-props.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { reactiveBox } from "./helpers/reactive-box.svelte.js";

const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
  { x: 3, y: 15, cls: "a" },
  { x: 4, y: 25, cls: "b" },
];

/** Minimal host: registry + plot id + DOM thunks + lazy props bag (#1040). */
function engineHost(opts: { registry?: LayerRegistry; props?: EnginePlotProps }) {
  return {
    registry: opts.registry ?? new LayerRegistry(),
    plotId: "plot-engine-lifecycle",
    root: () => null as HTMLDivElement | null,
    captureSurface: () => null as HTMLDivElement | null,
    props:
      opts.props ??
      ({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [{ geom: "point" as const }],
        width: 480,
        height: 320,
      } satisfies EnginePlotProps),
  };
}

describe("createPlotEngine chart lifecycle", () => {
  it("assembles a portable spec and produces a render model from data/layers", () => {
    const { value: engine, destroy } = withFlushedEffectRoot(() =>
      createPlotEngine(engineHost({})),
    );

    expect(engine.assembled).not.toBeNull();
    expect(engine.assembled!.layers.map((layer) => layer.geom)).toEqual(["point"]);
    expect(engine.runtime.model).not.toBeNull();
    expect(engine.runtime.model!.candidates.size).toBe(4);
    expect(engine.runtime.ready).toBe(true);
    expect(engine.runtime.resolvedWidth).toBe(480);
    expect(engine.runtime.resolvedHeight).toBe(320);

    // Controllers are stable object refs the host destructures once.
    expect(engine.zoomState).toBeDefined();
    expect(engine.selectionState).toBeDefined();
    expect(engine.inspectionState).toBeDefined();
    expect(engine.surfaceState).toBeDefined();
    expect(engine.intervalState).toBeDefined();
    expect(engine.legendFocusState).toBeDefined();
    expect(engine.legendFilterState).toBeDefined();
    expect(engine.chromeState).toBeDefined();
    expect(engine.announcer).toBeDefined();

    destroy();
  });

  it("recomputes the model when data changes and disposes the previous model", () => {
    const data = reactiveBox(rows);
    const models: RenderModel[] = [];
    const { value: engine, destroy } = withFlushedEffectRoot(() =>
      createPlotEngine(
        engineHost({
          props: {
            get data() {
              return data.value;
            },
            aes: { x: "x", y: "y" },
            layers: [{ geom: "point" }],
            width: 480,
            height: 320,
            onrender: (model: RenderModel) => {
              models.push(model);
            },
          },
        }),
      ),
    );

    expect(engine.runtime.model!.candidates.size).toBe(4);
    const first = engine.runtime.model!;

    data.set(rows.slice(0, 1));
    flushSync();

    const latest = engine.runtime.model!;
    expect(latest).not.toBe(first);
    expect(latest.candidates.size).toBe(1);
    // Previous model disposed: geometry released, row() inert.
    expect(first.scene.batches).toHaveLength(0);
    expect(first.row(0)).toBeNull();
    expect(latest.scene.batches.length).toBeGreaterThan(0);
    expect(models.length).toBeGreaterThanOrEqual(2);

    destroy();
  });

  it("exposes interaction config that tracks inspect/select/zoom enablement", () => {
    const inspect = reactiveBox(false);
    const select = reactiveBox(false);
    const zoom = reactiveBox(false);
    const { value: engine, destroy } = withFlushedEffectRoot(() =>
      createPlotEngine(
        engineHost({
          props: {
            data: rows,
            aes: { x: "x", y: "y" },
            layers: [{ geom: "point" }],
            width: 480,
            height: 320,
            get inspect() {
              return inspect.value;
            },
            get select() {
              return select.value;
            },
            get zoom() {
              return zoom.value;
            },
          },
        }),
      ),
    );

    expect(engine.interactionConfig.interactive).toBe(false);
    expect(engine.interactive).toBe(false);
    expect(engine.interactionConfig.inspect).toBeNull();

    inspect.set(true);
    flushSync();
    expect(engine.interactionConfig.inspect).not.toBeNull();
    expect(engine.interactive).toBe(true);
    expect(engine.legendFocusEnabled).toBe(false);

    select.set(true);
    zoom.set(true);
    flushSync();
    expect(engine.interactionConfig.select).not.toBeNull();
    expect(engine.interactionConfig.zoom).not.toBeNull();
    expect(engine.surfaceInteractive).toBe(true);

    destroy();
  });

  it("registers effects only under an effect root (no orphan effects at construct)", () => {
    // Construction must not throw effect_orphan; effects own via $effect.root.
    const { value: engine, destroy } = withEffectRoot(() => createPlotEngine(engineHost({})));
    expect(engine.assembled).not.toBeNull();
    // Before flush, model production may not have committed yet — factory must still exist.
    expect(engine.runtime).toBeDefined();
    destroy();
  });

  it("spec short-circuit: data changes do not re-assemble when spec is set", () => {
    // Pins the #1040 lazy-props invariant: assembleCurrentSpec must not
    // depend on data/aes/layers when an explicit spec is present.
    const data = reactiveBox(rows);
    const { value: engine, destroy } = withFlushedEffectRoot(() =>
      createPlotEngine(
        engineHost({
          props: {
            get data() {
              return data.value;
            },
            aes: { x: "x", y: "y" },
            layers: [{ geom: "point" }],
            spec: {
              data: { values: rows },
              aes: { x: "x", y: "y" },
              layers: [{ geom: "point" }],
            },
            width: 480,
            height: 320,
          },
        }),
      ),
    );

    const firstAssembled = engine.assembled;
    expect(firstAssembled).not.toBeNull();
    expect(engine.runtime.model).not.toBeNull();
    expect(engine.runtime.model!.candidates.size).toBe(4);

    data.set(rows.slice(0, 1));
    flushSync();

    // Same assembled identity: data was never a dependency under the spec path.
    expect(engine.assembled).toBe(firstAssembled);
    // Spec path still renders from the embedded values, not the data prop.
    expect(engine.runtime.model).not.toBeNull();
    expect(engine.runtime.model!.candidates.size).toBe(4);

    destroy();
  });
});
