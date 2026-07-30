/**
 * <Inspect> declaration-only host capability child.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { PlotDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import { normalizeInteractionConfig } from "../../src/lib/interaction/interaction.js";
import { resolveInspectCapability } from "../../src/lib/interaction/resolve-inspect-capability.js";
import InspectChildPlot from "../fixtures/InspectChildPlot.svelte";
import { render } from "../helpers/render.js";

describe("<Inspect> capability child", () => {
  it("registers an inspect capability on the plot registry", () => {
    let registry: LayerRegistry | undefined;
    render(InspectChildPlot, {
      useInspect: true,
      inspectMode: "xy",
      captureRegistry: (r: LayerRegistry) => {
        registry = r;
      },
    });
    expect(registry).toBeDefined();
    expect(registry!.capabilities("inspect")).toEqual([{ mode: "xy" }]);
    // Host-only: never a grammar Layer kind
    expect(registry!.layers.map((l) => l.kind)).not.toContain("inspect");
  });

  it("enables inspect config from child alone (no GGPlot inspect prop)", () => {
    let registry: LayerRegistry | undefined;
    render(InspectChildPlot, {
      useInspect: true,
      inspectMode: "exact",
      captureRegistry: (r: LayerRegistry) => {
        registry = r;
      },
    });
    const resolved = resolveInspectCapability({
      children: registry!.capabilities("inspect"),
    });
    expect(resolved.input).toEqual({ mode: "exact" });
    const config = normalizeInteractionConfig({ inspect: resolved.input });
    expect(config.inspect).not.toBeNull();
    expect(config.inspect?.mode).toBe("exact");
    expect(config.availableTools).toContain("inspect");
  });

  it("child options override the inspect prop whole bag", () => {
    let registry: LayerRegistry | undefined;
    render(InspectChildPlot, {
      useInspect: true,
      inspectMode: "xy",
      propInspect: { mode: "x" },
      captureRegistry: (r: LayerRegistry) => {
        registry = r;
      },
    });
    const resolved = resolveInspectCapability({
      prop: { mode: "x" },
      children: registry!.capabilities("inspect"),
    });
    expect(resolved.input).toEqual({ mode: "xy" });
    expect(resolved.multiChild).toBe(false);
  });

  it("emits multi-Inspect advisory when two children register", async () => {
    const diagnostics: PlotDiagnostic[] = [];
    render(InspectChildPlot, {
      useInspect: true,
      inspectMode: "x",
      useSecondInspect: true,
      secondInspectMode: "y",
      ondiagnostic: (d: PlotDiagnostic) => {
        diagnostics.push(d);
      },
    });
    await expect
      .poll(() => diagnostics.some((d) => d.code === "INTERACTION_DUPLICATE_INSPECT_CAPABILITY"))
      .toBe(true);
  });

  it("oninspect with child-only inspect does not emit HANDLER_WITHOUT_CAPABILITY", async () => {
    const diagnostics: PlotDiagnostic[] = [];
    render(InspectChildPlot, {
      useInspect: true,
      oninspect: () => {},
      ondiagnostic: (d: PlotDiagnostic) => {
        diagnostics.push(d);
      },
    });
    flushSync();
    // Wiring effect runs after children register (ADR 0001 order).
    await new Promise((r) => setTimeout(r, 50));
    expect(diagnostics.some((d) => d.code === "INTERACTION_HANDLER_WITHOUT_CAPABILITY")).toBe(
      false,
    );
  });
});
