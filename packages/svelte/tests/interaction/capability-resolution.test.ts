import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { Layer } from "../../src/lib/layers/types.js";
import { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import { createCapabilityResolution } from "../../src/lib/interaction/capability-resolution.svelte.js";
import type { EnginePlotProps } from "../../src/lib/plot-props.js";
import { resolveCapabilities } from "../../src/lib/plot-props.js";
import { withFlushedEffectRoot } from "../helpers/effect-root.svelte.js";

function makeProps(overrides: Record<string, unknown> = {}): EnginePlotProps {
  return overrides;
}

function focusLayer(channel: string): Layer {
  return { kind: "legendFocus", value: { channel, input: true } } as unknown as Layer;
}

describe("createCapabilityResolution", () => {
  it("inspect: capability children override the prop; last child wins", () => {
    const registry = new LayerRegistry();
    const { value: resolution, destroy } = withFlushedEffectRoot(() =>
      createCapabilityResolution({ registry, props: makeProps({ inspect: false }) }),
    );
    expect(resolution.inspect().input).toBe(false);
    registry.registerCapability("inspect", () => ({}));
    registry.registerCapability("inspect", () => ({ mode: "x" as const }));
    flushSync();
    expect(resolution.inspect().input).toEqual({ mode: "x" });
    expect(resolution.inspect().multiChild).toBe(true);
    destroy();
  });

  it("mark/grammar layer churn does not re-run inspect resolve (registry contract)", () => {
    const registry = new LayerRegistry();
    const { value: resolution, destroy } = withFlushedEffectRoot(() =>
      createCapabilityResolution({ registry, props: makeProps({ inspect: true }) }),
    );
    const before = resolution.inspect();
    const id = registry.registerPlotLayer(focusLayer("color"));
    flushSync();
    // Same cached object — the inspect derived depends on capabilityVersion only.
    expect(resolution.inspect()).toBe(before);
    registry.unregister(id);
    flushSync();
    expect(resolution.inspect()).toBe(before);
    destroy();
  });

  it("capability churn does not disturb the legend resolves", () => {
    const registry = new LayerRegistry();
    registry.registerPlotLayer(focusLayer("color"));
    const { value: resolution, destroy } = withFlushedEffectRoot(() =>
      createCapabilityResolution({ registry, props: makeProps() }),
    );
    const before = resolution.legendFocus();
    expect(before.channels).toEqual(new Set(["color"]));
    registry.registerCapability("inspect", () => ({}));
    flushSync();
    expect(resolution.legendFocus()).toBe(before);
    destroy();
  });

  it("legend focus and filter read their registry layer kinds", () => {
    const registry = new LayerRegistry();
    const { value: resolution, destroy } = withFlushedEffectRoot(() =>
      createCapabilityResolution({ registry, props: makeProps() }),
    );
    expect(resolution.legendFocus().requested).toBe(false);
    registry.registerPlotLayer(focusLayer("shape"));
    registry.registerPlotLayer({
      kind: "legendFilter",
      value: { channel: "color", input: { mode: "include" as const } },
    } as unknown as Layer);
    flushSync();
    expect(resolution.legendFocus().channels).toEqual(new Set(["shape"]));
    expect(resolution.legendFilter().configInput).toEqual({ mode: "include" });
    destroy();
  });

  it("caps() folds all five capabilities through resolveCapabilities", () => {
    const registry = new LayerRegistry();
    registry.registerCapability("inspect", () => ({}));
    const { value: resolution, destroy } = withFlushedEffectRoot(() =>
      createCapabilityResolution({
        registry,
        props: makeProps({ select: { type: "point" as const } }),
      }),
    );
    expect(resolution.caps()).toEqual(
      resolveCapabilities({
        inspect: true,
        legendFocus: false,
        legendFilter: false,
        select: { type: "point" },
      }),
    );
    destroy();
  });
});
