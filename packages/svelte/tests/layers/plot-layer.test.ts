/**
 * Runtime coverage for createPlotLayer (#786): kind registration, live getter,
 * registrationCount stability (ADR 0001), destroy unregister, inert orphan.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import type { PlotLayerKind } from "../../src/lib/layers/plot-layer.svelte.js";
import PlotLayerFactoryHost from "../fixtures/PlotLayerFactoryHost.svelte";
import PlotLayerFactoryOrphan from "../fixtures/PlotLayerFactoryOrphan.svelte";
import { render } from "../helpers/render.js";

/** Six issue families + theme (same createPlotLayer path). */
const KINDS: readonly {
  kind: PlotLayerKind;
  initial: unknown;
  updated: unknown;
}[] = [
  {
    kind: "scale",
    initial: { color: { type: "ordinal" } },
    updated: { color: { type: "sequential" } },
  },
  { kind: "theme", initial: "light", updated: "dark" },
  { kind: "coord", initial: "flip", updated: { type: "cartesian" } },
  { kind: "facet", initial: { wrap: "x" }, updated: { wrap: "y" } },
  { kind: "labs", initial: { title: "a" }, updated: { title: "b" } },
  {
    kind: "guides",
    initial: { color: "none" },
    updated: { color: { type: "legend" } },
  },
  {
    kind: "legend",
    initial: { order: "sorted" },
    updated: { order: "stable-domain" },
  },
];

describe("createPlotLayer", () => {
  it.each(KINDS)(
    "$kind registers one layer with the given kind and live value",
    ({ kind, initial }) => {
      let registry: LayerRegistry | undefined;
      render(PlotLayerFactoryHost, {
        kind,
        value: initial,
        capture: (r: LayerRegistry) => {
          registry = r;
        },
      });
      expect(registry).toBeDefined();
      expect(registry!.layers).toHaveLength(1);
      const layer = registry!.layers[0]!;
      expect(layer.kind).toBe(kind);
      if (layer.kind === "mark") throw new Error("expected non-mark layer");
      expect(layer.value).toEqual(initial);
      expect(registry!.registrationCount).toBe(1);
    },
  );

  it.each(KINDS)(
    "$kind prop update changes value without re-registration",
    async ({ kind, initial, updated }) => {
      let registry: LayerRegistry | undefined;
      const view = render(PlotLayerFactoryHost, {
        kind,
        value: initial,
        capture: (r: LayerRegistry) => {
          registry = r;
        },
      });
      const layer = registry!.layers[0]!;
      const countAfterInit = registry!.registrationCount;

      await view.rerender({
        kind,
        value: updated,
        capture: (r: LayerRegistry) => {
          registry = r;
        },
      });
      flushSync();
      expect(registry!.layers).toHaveLength(1);
      expect(registry!.layers[0]).toBe(layer);
      if (registry!.layers[0]!.kind === "mark") throw new Error("expected non-mark");
      expect(registry!.layers[0]!.value).toEqual(updated);
      expect(registry!.registrationCount).toBe(countAfterInit);
    },
  );

  it("unregisters on destroy; registrationCount does not decrease", async () => {
    let registry: LayerRegistry | undefined;
    const view = render(PlotLayerFactoryHost, {
      kind: "labs",
      value: { title: "gone" },
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry!.layers).toHaveLength(1);
    const countAfterInit = registry!.registrationCount;

    // Drop the child by remounting host without a layer is not how destroy
    // works here — unmount the whole host and confirm count is monotonic
    // while layers empty via a second host that shares no registry.
    // Use rerender pattern: host always has one child; destroy is covered by
    // unmounting the view and checking a fresh host is empty until register.
    view.unmount();
    flushSync();
    // After unmount the captured registry still exists but the layer is gone.
    expect(registry!.layers).toHaveLength(0);
    expect(registry!.registrationCount).toBe(countAfterInit);
  });

  it("is inert without a provideRegistry ancestor", () => {
    expect(() => {
      render(PlotLayerFactoryOrphan, {});
    }).not.toThrow();
  });
});
