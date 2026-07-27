/**
 * Behaviour coverage for the plot engine factory: assemble → model →
 * interaction config across a chart lifecycle. Guards the #982 merge of
 * orchestrator + interaction assembly (no layout/substring tests).
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import { LayerRegistry } from "../src/lib/geoms/registry.svelte.js";
import { createPlotEngine } from "../src/lib/plot-engine.svelte.js";
import { withEffectRoot, withFlushedEffectRoot } from "./helpers/effect-root.svelte.js";
import { reactiveBox } from "./helpers/reactive-box.svelte.js";

const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
  { x: 3, y: 15, cls: "a" },
  { x: 4, y: 25, cls: "b" },
];

function engineInputs(opts: {
  registry?: LayerRegistry;
  data?: () => readonly (typeof rows)[number][] | undefined;
  mapping?: () => { x: string; y: string; color?: string } | undefined;
  layers?: () => { geom: "point" }[] | undefined;
  width?: () => number | undefined;
  height?: () => number | undefined;
  inspect?: () => boolean;
  select?: () => boolean;
  zoom?: () => boolean;
  onrender?: () => ((model: RenderModel, spec: PortableSpec) => void) | undefined;
}) {
  const noop = () => {};
  return {
    registry: opts.registry ?? new LayerRegistry(),
    plotId: "plot-engine-lifecycle",
    root: () => null as HTMLDivElement | null,
    captureSurface: () => null as HTMLDivElement | null,
    spec: () => {},
    data: opts.data ?? (() => rows),
    mapping: opts.mapping ?? (() => ({ x: "x", y: "y" })),
    layers: opts.layers ?? (() => [{ geom: "point" as const }]),
    facet: noop,
    coord: noop,
    scales: noop,
    guides: noop,
    legend: noop,
    theme: noop,
    labs: noop,
    a11y: noop,
    width: opts.width ?? (() => 480),
    height: opts.height ?? (() => 320),
    datumKey: noop,
    inspect: opts.inspect ?? (() => false),
    select: opts.select ?? (() => false),
    zoom: opts.zoom ?? (() => false),
    legendFocus: () => false,
    legendFilter: () => false,
    tool: noop,
    interaction: noop,
    interactionScope: noop,
    oninspect: noop,
    onselect: noop,
    onzoom: noop,
    onlegendfocus: noop,
    onlegendfilter: noop,
    oninteraction: noop,
    ondiagnostic: noop,
    ontoolchange: noop,
    onrender: opts.onrender ?? noop,
  };
}

describe("createPlotEngine chart lifecycle", () => {
  it("assembles a portable spec and produces a render model from data/layers", () => {
    const { value: engine, destroy } = withFlushedEffectRoot(() =>
      createPlotEngine(engineInputs({})),
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
        engineInputs({
          data: () => data.value,
          onrender: () => (model) => {
            models.push(model);
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
        engineInputs({
          inspect: () => inspect.value,
          select: () => select.value,
          zoom: () => zoom.value,
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
    const { value: engine, destroy } = withEffectRoot(() => createPlotEngine(engineInputs({})));
    expect(engine.assembled).not.toBeNull();
    // Before flush, model production may not have committed yet — factory must still exist.
    expect(engine.runtime).toBeDefined();
    destroy();
  });
});
