/**
 * Direct createGeomLayer coverage: descriptor construction and prop →
 * LayerInput mapping via toLayerInput (live getters over the $props proxy).
 * Param whitelist comes from GEOM_PARAM_KEYS (#1039).
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
    expect(registry!.markLayers).toHaveLength(1);
    const layer = toLayerInput(registry!.markLayers[0]!);
    expect(layer.geom).toBe("point");
    expect(layer.aes).toEqual({ color: "cls" });
    expect(layer.position).toBe("jitter");
    expect(layer.positionParams).toEqual({ seed: 7, width: 0.1 });
    expect(layer.render).toBe("svg");
    expect(layer.params).toEqual({ alpha: 0.5, size: 4 });
  });

  it("whitelists schema param keys into params (undefined keys omitted)", () => {
    let registry: LayerRegistry | undefined;
    render(FactoryUnderHost, {
      geom: "line",
      linewidth: 2,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    const layer = toLayerInput(registry!.markLayers[0]!);
    expect(layer.params).toEqual({ linewidth: 2 });
  });

  it("drops props that are not in GEOM_PARAM_KEYS for the geom", () => {
    let registry: LayerRegistry | undefined;
    render(FactoryUnderHost, {
      geom: "line",
      linewidth: 2,
      // not a LineParams key — must not appear in layer.params
      notALineParam: 99,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    const layer = toLayerInput(registry!.markLayers[0]!);
    expect(layer.params).toEqual({ linewidth: 2 });
    expect(layer.params).not.toHaveProperty("notALineParam");
  });

  it("returns undefined params when every paramKey is unset", () => {
    let registry: LayerRegistry | undefined;
    render(FactoryUnderHost, {
      geom: "area",
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    const layer = toLayerInput(registry!.markLayers[0]!);
    expect(layer.params).toBeUndefined();
  });

  it("reads live prop updates through descriptor getters without re-register", async () => {
    let registry: LayerRegistry | undefined;
    const view = render(FactoryUnderHost, {
      geom: "point",
      size: 3,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    expect(registry!.markLayers).toHaveLength(1);
    const descriptor = registry!.markLayers[0]!;
    expect(toLayerInput(descriptor).params).toEqual({ size: 3 });

    await view.rerender({
      geom: "point",
      size: 9,
      alpha: 0.25,
      capture: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry!.markLayers).toHaveLength(1);
    // Same descriptor instance when host is stable; getters see new props.
    expect(registry!.markLayers[0]).toBe(descriptor);
    expect(toLayerInput(registry!.markLayers[0]!).params).toEqual({ size: 9, alpha: 0.25 });
  });
});
