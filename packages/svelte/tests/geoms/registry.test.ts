/**
 * Direct LayerRegistry coverage: insertion-ordered Map + version-counter
 * reactivity, plus provideRegistry/registerLayer context pairing (requires a
 * parent/child component harness — setContext/getContext/onDestroy).
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { LayerRegistry, type LayerDescriptor } from "../../src/lib/geoms/registry.svelte.js";
import RegistryLayerChild from "../fixtures/RegistryLayerChild.svelte";
import RegistryPair from "../fixtures/RegistryPair.svelte";
import { withEffectRoot } from "../helpers/effect-root.svelte.js";
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
    const { value: registry, destroy } = withEffectRoot(() => new LayerRegistry());
    const a = registry.register(desc("point", "a"));
    const b = registry.register(desc("line", "b"));
    const c = registry.register(desc("col", "c"));
    expect(registry.layers.map((layer) => layer.params?.tag)).toEqual(["a", "b", "c"]);

    registry.unregister(b);
    expect(registry.layers.map((layer) => layer.params?.tag)).toEqual(["a", "c"]);

    const d = registry.register(desc("area", "d"));
    expect(registry.layers.map((layer) => layer.params?.tag)).toEqual(["a", "c", "d"]);

    registry.unregister(a);
    registry.unregister(c);
    registry.unregister(d);
    expect(registry.layers).toEqual([]);
    destroy();
  });

  it("bumps the version counter so layers reads are reactive", () => {
    const { value: registry, destroy: destroyRegistry } = withEffectRoot(() => new LayerRegistry());
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
    destroyRegistry();
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
    expect(host!.layers.map((layer) => layer.params?.tag)).toEqual(["a", "b", "c"]);
    expect(host!.layers.map((layer) => layer.geom)).toEqual(["point", "line", "col"]);
  });

  it("unregisters on child destroy when descriptors shrink", async () => {
    let host: LayerRegistry | undefined;
    const view = render(RegistryPair, {
      descriptors: [desc("point", "a"), desc("line", "b")],
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    expect(host!.layers).toHaveLength(2);

    await view.rerender({
      descriptors: [desc("point", "a")],
      capture: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    flushSync();
    expect(host!.layers.map((layer) => layer.params?.tag)).toEqual(["a"]);
  });

  it("is inert without a provideRegistry ancestor", () => {
    // Orphan child: getContext is undefined → registerLayer no-ops (no throw).
    expect(() => {
      render(RegistryLayerChild, { descriptor: desc("point", "orphan") });
    }).not.toThrow();
  });
});
