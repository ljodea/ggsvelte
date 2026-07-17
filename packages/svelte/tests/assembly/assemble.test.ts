import { describe, expect, it } from "vitest";

import {
  assemblePortableSpec,
  isFacetedPlotIntent,
  mappedChannelField,
  resolveInteractionScope,
  toLayerInput,
} from "../../src/lib/assembly/assemble.js";

describe("toLayerInput", () => {
  it("copies geom and omits undefined optional fields", () => {
    expect(toLayerInput({ geom: "point" })).toEqual({ geom: "point" });
  });

  it("reads live getters on every invocation (registry contract)", () => {
    let geom: "point" | "line" = "point";
    let aes: { x: string } | undefined = { x: "a" };
    const descriptor = {
      get geom() {
        return geom;
      },
      get aes() {
        return aes;
      },
    };
    expect(toLayerInput(descriptor)).toEqual({
      geom: "point",
      aes: { x: "a" },
    });
    geom = "line";
    aes = undefined;
    expect(toLayerInput(descriptor)).toEqual({ geom: "line" });
  });

  it("forwards all optional descriptor fields when present", () => {
    expect(
      toLayerInput({
        geom: "smooth",
        stat: "smooth",
        position: "identity",
        positionParams: { width: 0.5 },
        render: "canvas",
        aes: { x: "x", y: "y" },
        params: { method: "lm" },
      }),
    ).toEqual({
      geom: "smooth",
      stat: "smooth",
      position: "identity",
      positionParams: { width: 0.5 },
      render: "canvas",
      aes: { x: "x", y: "y" },
      params: { method: "lm" },
    });
  });
});

describe("assemblePortableSpec", () => {
  const rows = [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ];

  it("returns normalize(spec) when an explicit spec is provided", () => {
    const assembled = assemblePortableSpec({
      spec: {
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
      },
      layers: [],
    });
    expect(assembled).not.toBeNull();
    expect(assembled!.layers).toHaveLength(1);
    expect(assembled!.layers[0].geom).toBe("point");
  });

  it("ignores sibling inputs when an explicit spec is provided", () => {
    const assembled = assemblePortableSpec({
      spec: {
        data: { values: rows },
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
        labs: { title: "from-spec" },
      },
      data: [{ x: 9, y: 9 }],
      aes: { x: "nope", y: "nope" },
      layers: [{ geom: "line", aes: { x: "x", y: "y" } }],
      labs: { title: "ignored" },
    });
    expect(assembled!.labs?.title).toBe("from-spec");
    expect(assembled!.layers).toHaveLength(1);
    expect(assembled!.layers[0].geom).toBe("point");
  });

  it("returns null when there are no layers", () => {
    expect(
      assemblePortableSpec({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [],
      }),
    ).toBeNull();
  });

  it("builds from data/aes/layers without a top-level spec", () => {
    const assembled = assemblePortableSpec({
      data: rows,
      aes: { x: "x", y: "y" },
      layers: [{ geom: "point" }],
      theme: "light",
      labs: { title: "T" },
      a11y: "force-svg",
      scales: { x: { type: "linear" } },
      legend: { order: "stable-domain" },
      facet: { wrap: "g" },
      coord: "flip",
    });
    expect(assembled).not.toBeNull();
    expect(assembled!.labs?.title).toBe("T");
    expect(assembled!.a11y).toBe("force-svg");
    expect(assembled!.coord?.type).toBe("flip");
    expect(assembled!.facet).toBeDefined();
    expect(assembled!.scales?.x).toBeDefined();
    expect(assembled!.legend?.order).toBe("stable-domain");
  });

  it("lets empty layers array win over hypothetical registry content", () => {
    // Caller converts registry → LayerInput[] before assemble; empty wins.
    expect(
      assemblePortableSpec({
        data: rows,
        aes: { x: "x", y: "y" },
        layers: [],
      }),
    ).toBeNull();
  });
});

describe("mappedChannelField", () => {
  it("prefers plot-level aes field when present on the portable spec", () => {
    // normalize/builder usually merge plot aes into layers; the plot-level
    // branch still wins when aes remains on the assembled object.
    const assembled = {
      aes: { x: { field: "a" }, y: { field: "b" } },
      layers: [
        {
          geom: "point" as const,
          aes: { x: { field: "c" }, y: { field: "b" } },
        },
      ],
    };
    expect(mappedChannelField(assembled as never, "x")).toBe("a");
    expect(mappedChannelField(assembled as never, "y")).toBe("b");
  });

  it("falls through to the first layer with a non-null channel field", () => {
    const assembled = assemblePortableSpec({
      data: [{ a: 1, b: 2 }],
      layers: [
        { geom: "point", aes: { x: null } },
        { geom: "point", aes: { x: "a", y: "b" } },
      ],
    })!;
    expect(mappedChannelField(assembled, "x")).toBe("a");
  });

  it("returns the channel name when mapping is a constant value or absent", () => {
    const assembled = assemblePortableSpec({
      data: [{ x: 1, y: 2 }],
      layers: [{ geom: "point", aes: { x: { value: 1 }, y: "y" } }],
    })!;
    expect(mappedChannelField(assembled, "x")).toBe("x");
    expect(mappedChannelField(assembled, "y")).toBe("y");
  });

  it("returns the channel name when assembled is null", () => {
    expect(mappedChannelField(null, "x")).toBe("x");
    expect(mappedChannelField(null, "y")).toBe("y");
  });
});

describe("isFacetedPlotIntent", () => {
  it("is true from the raw facet prop before layers assemble (declaration-only children)", () => {
    // Hosts must treat a raw facet prop as intent even when assembled is still
    // null — declaration-only children register on a later flush.
    expect(
      isFacetedPlotIntent({
        facet: { rows: "g" },
        assembled: null,
      }),
    ).toBe(true);
  });

  it("is true from assembled.facet when the plot is driven by a portable spec", () => {
    // Spec-based plots put facet on the normalized spec, not a separate prop.
    const assembled = assemblePortableSpec({
      spec: {
        data: [{ x: 1, y: 2, g: "a" }],
        layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
        facet: { rows: "g" },
      },
      layers: [],
    });
    expect(assembled?.facet).toBeDefined();
    expect(
      isFacetedPlotIntent({
        assembled,
      }),
    ).toBe(true);
  });

  it("is false when neither the prop nor the assembled spec is faceted", () => {
    const assembled = assemblePortableSpec({
      data: [{ x: 1, y: 2 }],
      layers: [{ geom: "point", aes: { x: "x", y: "y" } }],
    });
    expect(
      isFacetedPlotIntent({
        assembled,
      }),
    ).toBe(false);
    expect(isFacetedPlotIntent({ assembled: null })).toBe(false);
  });
});

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
