/**
 * Pure wiring-advisory collection (extracted from plot assembly).
 * Node lane — no browser/GGPlot.
 */
import { describe, expect, it } from "vitest";

import {
  collectWiringDiagnostics,
  type WiringDiagnosticInput,
} from "../../src/lib/interaction/wiring-advisories.js";

const emptyHandlers: WiringDiagnosticInput["handlers"] = {
  oninspect: undefined,
  onselect: undefined,
  onzoom: undefined,
  onlegendfocus: undefined,
  onlegendfilter: undefined,
};

const emptyCapabilities: WiringDiagnosticInput["capabilities"] = {
  inspect: undefined,
  select: undefined,
  zoom: undefined,
  legendFocus: undefined,
  legendFilter: undefined,
};

function snapshot(
  partial: Partial<WiringDiagnosticInput> & {
    handlers?: Partial<WiringDiagnosticInput["handlers"]>;
    capabilities?: Partial<WiringDiagnosticInput["capabilities"]>;
  } = {},
): WiringDiagnosticInput {
  return {
    interactionScope: partial.interactionScope,
    interaction: partial.interaction,
    handlers: { ...emptyHandlers, ...partial.handlers },
    capabilities: { ...emptyCapabilities, ...partial.capabilities },
  };
}

describe("collectWiringDiagnostics", () => {
  it("returns empty when nothing is miswired", () => {
    expect(collectWiringDiagnostics(snapshot())).toEqual([]);
  });

  it("advises when interactionScope is set without a controller", () => {
    const list = collectWiringDiagnostics(
      snapshot({ interactionScope: { keys: "row-id" }, interaction: undefined }),
    );
    expect(list).toEqual([
      expect.objectContaining({
        code: "INTERACTION_SCOPE_WITHOUT_CONTROLLER",
        severity: "advisory",
        prop: "interactionScope",
      }),
    ]);
  });

  it("stays silent when scope accompanies a controller", () => {
    const list = collectWiringDiagnostics(
      snapshot({
        interactionScope: { keys: "row-id" },
        interaction: { id: "controller" },
      }),
    );
    expect(list.map((d) => d.code)).not.toContain("INTERACTION_SCOPE_WITHOUT_CONTROLLER");
  });

  it("advises per dead handler, naming the capability prop", () => {
    const list = collectWiringDiagnostics(
      snapshot({
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
      }),
    );
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
    const list = collectWiringDiagnostics(
      snapshot({
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
      }),
    );
    expect(list.map((d) => d.code)).not.toContain("INTERACTION_HANDLER_WITHOUT_CAPABILITY");
  });

  it("recomputes for a late-added handler (characterization of pure snapshot input)", () => {
    const base = snapshot({
      handlers: { onselect: undefined },
      capabilities: { select: undefined },
    });
    expect(collectWiringDiagnostics(base)).toEqual([]);
    const after = collectWiringDiagnostics(
      snapshot({
        handlers: { onselect: () => {} },
        capabilities: { select: undefined },
      }),
    );
    expect(after).toEqual([
      expect.objectContaining({
        code: "INTERACTION_HANDLER_WITHOUT_CAPABILITY",
        prop: "onselect",
        actual: "select",
      }),
    ]);
  });
});
