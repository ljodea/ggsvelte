/**
 * Pure wiring-advisory collection (extracted from plot assembly).
 * Node lane — no browser/GGPlot.
 */
import { describe, expect, it } from "vitest";

import { collectWiringDiagnostics } from "../../src/lib/interaction/wiring-advisories.js";

describe("collectWiringDiagnostics", () => {
  it("returns empty when nothing is miswired", () => {
    expect(
      collectWiringDiagnostics({
        interactionScope: undefined,
        interaction: undefined,
        handlers: {
          oninspect: undefined,
          onselect: undefined,
          onzoom: undefined,
          onlegendfocus: undefined,
          onlegendfilter: undefined,
        },
        capabilities: {
          inspect: undefined,
          select: undefined,
          zoom: undefined,
          legendFocus: undefined,
          legendFilter: undefined,
        },
      }),
    ).toEqual([]);
  });

  it("advises when interactionScope is set without a controller", () => {
    const list = collectWiringDiagnostics({
      interactionScope: { keys: "row-id" },
      interaction: undefined,
      handlers: {},
      capabilities: {},
    });
    expect(list).toEqual([
      expect.objectContaining({
        code: "INTERACTION_SCOPE_WITHOUT_CONTROLLER",
        severity: "advisory",
        prop: "interactionScope",
      }),
    ]);
  });

  it("stays silent when scope accompanies a controller", () => {
    const list = collectWiringDiagnostics({
      interactionScope: { keys: "row-id" },
      interaction: { id: "controller" },
      handlers: {},
      capabilities: {},
    });
    expect(list.map((d) => d.code)).not.toContain("INTERACTION_SCOPE_WITHOUT_CONTROLLER");
  });

  it("advises per dead handler, naming the capability prop", () => {
    const list = collectWiringDiagnostics({
      interactionScope: undefined,
      interaction: undefined,
      handlers: {
        onselect: () => {},
        onzoom: () => {},
        oninspect: undefined,
      },
      capabilities: {
        select: undefined,
        zoom: false,
        inspect: true,
      },
    });
    expect(
      list
        .filter((d) => d.code === "INTERACTION_HANDLER_WITHOUT_CAPABILITY")
        .map((d) => [d.prop, d.actual]),
    ).toEqual([
      ["onselect", "select"],
      ["onzoom", "zoom"],
    ]);
  });

  it("does not advise when the matching capability is requested", () => {
    const list = collectWiringDiagnostics({
      interactionScope: undefined,
      interaction: undefined,
      handlers: {
        onselect: () => {},
        onzoom: () => {},
        oninspect: () => {},
        onlegendfocus: () => {},
        onlegendfilter: () => {},
      },
      capabilities: {
        select: "point",
        zoom: true,
        inspect: true,
        legendFocus: true,
        legendFilter: true,
      },
    });
    expect(list.map((d) => d.code)).not.toContain("INTERACTION_HANDLER_WITHOUT_CAPABILITY");
  });

  it("recomputes for a late-added handler (characterization of pure snapshot input)", () => {
    const base = {
      interactionScope: undefined as undefined,
      interaction: undefined as undefined,
      handlers: {
        onselect: undefined as (() => void) | undefined,
      },
      capabilities: {
        select: undefined as undefined,
      },
    };
    expect(collectWiringDiagnostics(base)).toEqual([]);
    const after = collectWiringDiagnostics({
      ...base,
      handlers: { onselect: () => {} },
    });
    expect(after).toEqual([
      expect.objectContaining({
        code: "INTERACTION_HANDLER_WITHOUT_CAPABILITY",
        prop: "onselect",
        actual: "select",
      }),
    ]);
  });
});
