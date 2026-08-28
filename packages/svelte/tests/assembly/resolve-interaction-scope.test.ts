import { describe, expect, it } from "vitest";

import { assemblePortableSpec, resolveInteractionScope } from "../../src/lib/assembly/assemble.js";

describe("resolveInteractionScope", () => {
  const assembled = assemblePortableSpec({
    data: [{ foo: 1, bar: 2 }],
    aes: { x: "foo", y: "bar" },
    layers: [{ geom: "point" }],
  });

  it("throws when interaction is set without interactionScope", () => {
    expect(() =>
      resolveInteractionScope({
        interaction: {},
        interactionScope: undefined,
        zoom: false,
        datumKey: "id",
        assembled,
      }),
    ).toThrow(
      /GGPlot requires interactionScope when interaction is supplied so unrelated charts cannot share semantic keys or domains accidentally/,
    );
  });

  it("requires x scope for controlled x zoom (including xy and zoom:true)", () => {
    expect(() =>
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id", y: "y" },
        zoom: true,
        assembled,
      }),
    ).toThrow(
      /Controlled x zoom requires interactionScope\.x; controlled plots never infer domain scopes/,
    );
    expect(() =>
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id", y: "y" },
        zoom: { mode: "x" },
        assembled,
      }),
    ).toThrow(/Controlled x zoom requires interactionScope\.x/);
    expect(() =>
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id", y: "y" },
        zoom: { mode: "xy" },
        assembled,
      }),
    ).toThrow(/Controlled x zoom requires interactionScope\.x/);
  });

  it("does not require domain scopes for faceted zoom (unsupported → diagnostic/no-op)", () => {
    // Faceted interval/zoom is cleared by normalizeInteractionConfig; scope
    // resolution must not turn that path into a hard render failure.
    expect(
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id" },
        zoom: true,
        faceted: true,
        assembled,
      }),
    ).toEqual({ keys: "id" });
    expect(
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id" },
        zoom: { mode: "xy" },
        faceted: true,
        assembled,
      }),
    ).toEqual({ keys: "id" });
    // Hosts must pass faceted via isFacetedPlotIntent (raw prop OR assembled.facet)
    // so declaration-only children and spec-embedded facets both take this path.
    expect(
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id" },
        zoom: true,
        faceted: true,
        assembled: null,
      }),
    ).toEqual({ keys: "id" });
  });

  it("requires y scope for controlled y zoom", () => {
    expect(() =>
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id", x: "x" },
        zoom: { mode: "y" },
        assembled,
      }),
    ).toThrow(
      /Controlled y zoom requires interactionScope\.y; controlled plots never infer domain scopes/,
    );
  });

  it("returns a shallow-frozen controlled scope without inferring missing channels when zoom is off", () => {
    const scope = resolveInteractionScope({
      interaction: {},
      interactionScope: { keys: "id" },
      zoom: false,
      assembled,
    });
    expect(scope).toEqual({ keys: "id" });
    expect(Object.isFrozen(scope)).toBe(true);
  });

  it("preserves an explicit controlled interval namespace", () => {
    expect(
      resolveInteractionScope({
        interaction: {},
        interactionScope: { keys: "id", intervals: "facet-intervals" },
        zoom: false,
        assembled,
      }),
    ).toEqual({ keys: "id", intervals: "facet-intervals" });
  });

  it("accepts empty-string x/y scopes as defined (does not throw)", () => {
    const scope = resolveInteractionScope({
      interaction: {},
      interactionScope: { keys: "id", x: "", y: "" },
      zoom: true,
      assembled,
    });
    expect(scope).toEqual({ keys: "id", x: "", y: "" });
  });

  it("infers uncontrolled scopes from string key and aes fields", () => {
    expect(
      resolveInteractionScope({
        interaction: undefined,
        datumKey: "id",
        zoom: false,
        assembled,
      }),
    ).toEqual({ keys: "id", x: "foo", y: "bar" });
  });

  it("uses keys default when datumKey is a function or absent", () => {
    expect(
      resolveInteractionScope({
        interaction: undefined,
        datumKey: (row: { id: number }) => row.id,
        zoom: false,
        assembled,
      }),
    ).toEqual({ keys: "default", x: "foo", y: "bar" });
    expect(
      resolveInteractionScope({
        interaction: undefined,
        zoom: false,
        assembled: null,
      }),
    ).toEqual({ keys: "default", x: "x", y: "y" });
  });
});
