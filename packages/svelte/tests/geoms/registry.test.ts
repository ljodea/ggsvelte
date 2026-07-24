/**
 * Direct LayerRegistry coverage: insertion-ordered Map + version-counter
 * reactivity, plus provideRegistry/registerLayer context pairing (requires a
 * parent/child component harness — setContext/getContext/onDestroy).
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { LayerRegistry, type LayerDescriptor } from "../../src/lib/geoms/registry.svelte.js";
import PlotLayerLiveTheme from "../fixtures/PlotLayerLiveTheme.svelte";
import PlotLayerRegisterChild from "../fixtures/PlotLayerRegisterChild.svelte";
import PlotLayerRegistryPair from "../fixtures/PlotLayerRegistryPair.svelte";
import PlotLayerToggle from "../fixtures/PlotLayerToggle.svelte";
import RegistryLayerChild from "../fixtures/RegistryLayerChild.svelte";
import RegistryPair from "../fixtures/RegistryPair.svelte";
import { render } from "../helpers/render.js";
import { trackLayerCount } from "../helpers/track-layers.svelte.js";

function desc(geom: LayerDescriptor["geom"], tag?: string): LayerDescriptor {
  return {
    geom,
    ...(tag === undefined ? {} : { params: { tag } }),
  };
}

describe("LayerRegistry (module-level)", () => {
  it("preserves insertion order across register/unregister", () => {
    const registry = new LayerRegistry();
    const a = registry.register(desc("point", "a"));
    const b = registry.register(desc("line", "b"));
    const c = registry.register(desc("col", "c"));
    expect(registry.markLayers.map((layer) => layer.params?.tag)).toEqual(["a", "b", "c"]);

    registry.unregister(b);
    expect(registry.markLayers.map((layer) => layer.params?.tag)).toEqual(["a", "c"]);

    const d = registry.register(desc("area", "d"));
    expect(registry.markLayers.map((layer) => layer.params?.tag)).toEqual(["a", "c", "d"]);

    registry.unregister(a);
    registry.unregister(c);
    registry.unregister(d);
    expect(registry.markLayers).toEqual([]);
    expect(registry.layers).toEqual([]);
  });

  it("bumps the version counter so layers reads are reactive", () => {
    const registry = new LayerRegistry();
    const { seen, destroy: destroyTrack } = trackLayerCount(registry);
    flushSync();
    expect(seen).toEqual([0]);

    registry.register(desc("point"));
    flushSync();
    expect(seen).toEqual([0, 1]);

    const id = registry.register(desc("line"));
    flushSync();
    expect(seen).toEqual([0, 1, 2]);

    registry.unregister(id);
    flushSync();
    expect(seen).toEqual([0, 1, 2, 1]);
    destroyTrack();
  });

  it("layers returns all kinds in registration order; markLayers unwraps marks only", () => {
    const registry = new LayerRegistry();
    registry.register(desc("point", "m1"));
    registry.registerPlotLayer({
      kind: "theme",
      get value() {
        return "dark";
      },
    });
    registry.register(desc("line", "m2"));
    registry.registerPlotLayer({
      kind: "labs",
      get value() {
        return { title: "T" };
      },
    });

    expect(registry.layers.map((layer) => layer.kind)).toEqual(["mark", "theme", "mark", "labs"]);
    expect(registry.markLayers.map((layer) => layer.params?.tag)).toEqual(["m1", "m2"]);
    // markLayers is toLayerInput-compatible (has .geom, not .kind).
    expect(registry.markLayers.map((layer) => layer.geom)).toEqual(["point", "line"]);
    expect(registry.registrationCount).toBe(4);
  });
});

describe("provideRegistry / registerLayer context pairing", () => {
  it("registers children during init in declaration order", () => {
    let host: LayerRegistry | undefined;
    render(RegistryPair, {
      descriptors: [desc("point", "a"), desc("line", "b"), desc("col", "c")],
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    expect(host).toBeDefined();
    expect(host!.markLayers.map((layer) => layer.params?.tag)).toEqual(["a", "b", "c"]);
    expect(host!.markLayers.map((layer) => layer.geom)).toEqual(["point", "line", "col"]);
  });

  it("unregisters on child destroy when descriptors shrink", async () => {
    let host: LayerRegistry | undefined;
    const view = render(RegistryPair, {
      descriptors: [desc("point", "a"), desc("line", "b")],
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    expect(host!.markLayers).toHaveLength(2);

    await view.rerender({
      descriptors: [desc("point", "a")],
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    flushSync();
    expect(host!.markLayers.map((layer) => layer.params?.tag)).toEqual(["a"]);
  });

  it("is inert without a provideRegistry ancestor", () => {
    // Orphan child: getContext is undefined → registerLayer no-ops (no throw).
    expect(() => {
      render(RegistryLayerChild, { descriptor: desc("point", "orphan") });
    }).not.toThrow();
  });
});

describe("registerPlotLayer (non-mark)", () => {
  it("unregisters a non-mark layer on destroy; two hosts stay isolated", async () => {
    let hostA: LayerRegistry | undefined;
    let hostB: LayerRegistry | undefined;
    const viewA = render(PlotLayerRegistryPair, {
      plotLayers: [
        {
          kind: "theme",
          get value() {
            return "dark" as const;
          },
        },
      ],
      capture: (registry: LayerRegistry) => {
        hostA = registry;
      },
    });
    render(PlotLayerRegistryPair, {
      plotLayers: [
        {
          kind: "labs",
          get value() {
            return { title: "B" };
          },
        },
      ],
      capture: (registry: LayerRegistry) => {
        hostB = registry;
      },
    });
    expect(hostA!.layers).toHaveLength(1);
    expect(hostA!.layers[0]!.kind).toBe("theme");
    expect(hostB!.layers).toHaveLength(1);
    expect(hostB!.layers[0]!.kind).toBe("labs");

    await viewA.rerender({
      plotLayers: [],
      capture: (registry: LayerRegistry) => {
        hostA = registry;
      },
    });
    flushSync();
    expect(hostA!.layers).toEqual([]);
    // Sibling host untouched.
    expect(hostB!.layers).toHaveLength(1);
    expect(hostB!.layers[0]!.kind).toBe("labs");
  });

  it("is inert without a provideRegistry ancestor", () => {
    expect(() => {
      render(PlotLayerRegisterChild, {
        layer: {
          kind: "theme",
          get value() {
            return "light" as const;
          },
        },
      });
    }).not.toThrow();
  });

  it("live non-mark getters update without re-registration (registrationCount stable)", async () => {
    let host: LayerRegistry | undefined;
    const view = render(PlotLayerLiveTheme, {
      theme: "light",
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    expect(host).toBeDefined();
    expect(host!.layers).toHaveLength(1);
    const layer = host!.layers[0]!;
    expect(layer.kind).toBe("theme");
    if (layer.kind !== "theme") throw new Error("expected theme layer");
    expect(layer.value).toBe("light");
    const countAfterInit = host!.registrationCount;
    expect(countAfterInit).toBe(1);

    await view.rerender({
      theme: "dark",
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    flushSync();
    expect(host!.layers).toHaveLength(1);
    expect(host!.layers[0]).toBe(layer);
    if (host!.layers[0]!.kind !== "theme") throw new Error("expected theme layer");
    expect(host!.layers[0]!.value).toBe("dark");
    // ADR 0001: prop updates must not re-register.
    expect(host!.registrationCount).toBe(countAfterInit);
  });

  it("keyed each destroy+create in one flush never loses the new non-mark registration", async () => {
    // ADR 0001 finding 3: Map+version is commutative across init/teardown in
    // the same flush. 10-cycle rapid toggle matching the spike stress case.
    let host: LayerRegistry | undefined;
    const view = render(PlotLayerToggle, {
      tags: ["a", "b", "c"],
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    expect(host!.layers).toHaveLength(3);

    const capture = (registry: LayerRegistry) => {
      host = registry;
    };
    for (let cycle = 0; cycle < 10; cycle++) {
      // Remove "b", add "d" in one flush (keyed each).
      const tags = cycle % 2 === 0 ? (["a", "d", "c"] as const) : (["a", "b", "c"] as const);
      await view.rerender({ tags, capture });
      flushSync();
      expect(host!.layers).toHaveLength(3);
      expect(host!.layers.every((layer) => layer.kind === "theme")).toBe(true);
    }
  });
});
