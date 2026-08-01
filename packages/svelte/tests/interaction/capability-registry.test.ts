/**
 * Host capability registry on LayerRegistry (inspect children, not Layer union).
 */
import { describe, expect, it } from "vitest";

import { LayerRegistry, registerHostCapability } from "../../src/lib/geoms/registry.svelte.js";
import { resolveInspectCapability } from "../../src/lib/interaction/resolve-inspect-capability.js";

describe("LayerRegistry capabilities", () => {
  it("exports registerHostCapability for declaration children (ADR 0001 helper)", () => {
    expect(typeof registerHostCapability).toBe("function");
  });

  it("keeps inspect capabilities across mark register/unregister", () => {
    // capabilities() uses #capabilityVersion only — mark churn must not drop
    // host capability entries (interactionConfig must not re-deliver diagnostics).
    const registry = new LayerRegistry();
    registry.registerCapability("inspect", () => ({ mode: "xy" as const }));
    const markId = registry.register({ geom: "point" });
    expect(registry.capabilities("inspect")).toEqual([{ mode: "xy" }]);
    registry.unregister(markId);
    expect(registry.capabilities("inspect")).toEqual([{ mode: "xy" }]);
    expect(registry.markLayers).toEqual([]);
  });

  it("returns inspect values in registration order", () => {
    const registry = new LayerRegistry();
    const id1 = registry.registerCapability("inspect", () => ({ mode: "x" as const }));
    const id2 = registry.registerCapability("inspect", () => ({ mode: "xy" as const }));
    expect(registry.capabilities("inspect")).toEqual([{ mode: "x" }, { mode: "xy" }]);
    registry.unregister(id1);
    expect(registry.capabilities("inspect")).toEqual([{ mode: "xy" }]);
    registry.unregister(id2);
    expect(registry.capabilities("inspect")).toEqual([]);
  });

  it("does not put capabilities on layers / markLayers", () => {
    const registry = new LayerRegistry();
    registry.registerCapability("inspect", () => ({}));
    expect(registry.layers).toEqual([]);
    expect(registry.markLayers).toEqual([]);
  });

  it("live getters re-read on each capabilities() call", () => {
    const registry = new LayerRegistry();
    let mode: "x" | "y" = "x";
    registry.registerCapability("inspect", () => ({ mode }));
    expect(registry.capabilities("inspect")[0]).toEqual({ mode: "x" });
    mode = "y";
    expect(registry.capabilities("inspect")[0]).toEqual({ mode: "y" });
  });

  it("resolveInspectCapability last-wins over multi registration", () => {
    const registry = new LayerRegistry();
    registry.registerCapability("inspect", () => ({ mode: "x" as const }));
    registry.registerCapability("inspect", () => ({ mode: "y" as const }));
    const resolved = resolveInspectCapability({
      prop: { mode: "xy" },
      children: registry.capabilities("inspect"),
    });
    expect(resolved).toEqual({
      input: { mode: "y" },
      multiChild: true,
      identity: undefined,
      droppedPropIdentity: false,
    });
  });
});
