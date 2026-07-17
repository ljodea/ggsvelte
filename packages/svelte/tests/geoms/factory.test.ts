/**
 * Direct createGeomLayer coverage: descriptor construction and prop →
 * LayerInput mapping via toLayerInput (live getters over the $props proxy).
 */
import { describe, expect, it } from "vitest";

import { toLayerInput } from "../../src/lib/assembly/assemble.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import FactoryUnderHost from "../fixtures/FactoryUnderHost.svelte";
import { render } from "../helpers/render.js";

describe("createGeomLayer", () => {
  it("registers a descriptor with geom and live structural fields", () => {
    let registry: LayerRegistry | undefined;
    render(FactoryUnderHost, {
      geom: "point",
      paramKeys: ["alpha", "size", "shape"],
      aes: { color: "cls" },
      position: "jitter",
      positionParams: { seed: 7, width: 0.1 },
      layerRender: "svg",
      size: 4,
      alpha: 0.5,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    expect(registry.layers).toHaveLength(1);
    const layer = toLayerInput(registry.layers[0]);
    expect(layer.geom).toBe("point");
    expect(layer.aes).toEqual({ color: "cls" });
    expect(layer.position).toBe("jitter");
    expect(layer.positionParams).toEqual({ seed: 7, width: 0.1 });
    expect(layer.render).toBe("svg");
    expect(layer.params).toEqual({ alpha: 0.5, size: 4 });
  });

  it("whitelists only paramKeys into params (undefined keys omitted)", () => {
    let registry: LayerRegistry | undefined;
    render(FactoryUnderHost, {
      geom: "line",
      paramKeys: ["alpha", "linewidth", "curve"],
      linewidth: 2,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    const layer = toLayerInput(registry.layers[0]);
    expect(layer.params).toEqual({ linewidth: 2 });
  });

  it("returns undefined params when every paramKey is unset", () => {
    let registry: LayerRegistry | undefined;
    render(FactoryUnderHost, {
      geom: "area",
      paramKeys: ["alpha"],
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    const layer = toLayerInput(registry.layers[0]);
    expect(layer.params).toBeUndefined();
  });

  it("reads live prop updates through descriptor getters without re-register", async () => {
    let registry: LayerRegistry | undefined;
    const view = render(FactoryUnderHost, {
      geom: "point",
      paramKeys: ["alpha", "size"],
      size: 3,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    expect(registry.layers).toHaveLength(1);
    expect(toLayerInput(registry.layers[0]).params).toEqual({ size: 3 });

    await view.rerender({
      geom: "point",
      paramKeys: ["alpha", "size"],
      size: 9,
      alpha: 0.25,
      // Same capture identity so a remount would overwrite; stable host keeps
      // the original registry reference.
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry.layers).toHaveLength(1);
    // Same descriptor instance when host is stable; getters see new props.
    expect(toLayerInput(registry.layers[0]).params).toEqual({ size: 9, alpha: 0.25 });
  });
});
