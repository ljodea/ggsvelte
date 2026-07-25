/**
 * Coord + facet children + prop deprecations (#659 slice 5).
 * Covers parity, REPLACE precedence, live getters, deprecation + composition
 * advisories, spec short-circuit, and bare Facet validation.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import { coordFixed, coordTransform, type PortableSpec } from "../../src/lib/index.js";
import type { PlotDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import { isDeprecationDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import {
  isCompositionDiagnostic,
  isDuplicatePlotLayerDiagnostic,
} from "../../src/lib/diagnostics/composition.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import CoordFacetChildrenPlot from "../fixtures/CoordFacetChildrenPlot.svelte";
import { render } from "../helpers/render.js";

function collect(): {
  diagnostics: PlotDiagnostic[];
  ondiagnostic: (diagnostic: PlotDiagnostic) => void;
} {
  const diagnostics: PlotDiagnostic[] = [];
  return {
    diagnostics,
    ondiagnostic: (diagnostic) => {
      diagnostics.push(diagnostic);
    },
  };
}

async function waitAssembled(get: () => PortableSpec | null): Promise<PortableSpec> {
  await expect.poll(() => get() !== null).toBe(true);
  return get()!;
}

function assembleWithProps(props: Record<string, unknown>): Promise<PortableSpec> {
  let assembled: PortableSpec | null = null;
  render(CoordFacetChildrenPlot, {
    ...props,
    onrender: (_model: unknown, spec: PortableSpec) => {
      assembled = spec;
    },
    ondiagnostic: () => {},
  });
  return waitAssembled(() => assembled);
}

describe("Coord/Facet children → assembled PortableSpec", () => {
  it('1a: <CoordFlip/> assembles same coord as coord="flip" and coord={{type:"flip"}}', async () => {
    const fromChild = await assembleWithProps({ useCoordFlip: true });
    const fromString = await assembleWithProps({ coordProp: "flip" });
    const fromObject = await assembleWithProps({ coordProp: { type: "flip" } });
    expect(fromChild.coord).toEqual({ type: "flip" });
    expect(fromChild.coord).toEqual(fromString.coord);
    expect(fromChild.coord).toEqual(fromObject.coord);
  });

  it("1b: <CoordFixed ratio={2}/> matches coord={coordFixed({ratio:2})}", async () => {
    const fromChild = await assembleWithProps({ useCoordFixed: true, fixedRatio: 2 });
    const fromProp = await assembleWithProps({
      coordProp: coordFixed({ ratio: 2 }),
    });
    expect(fromChild.coord).toEqual({ type: "fixed", ratio: 2 });
    expect(fromChild.coord).toEqual(fromProp.coord);
  });

  it('1c: <CoordTransform x="log10"/> matches coord={coordTransform({x:"log10"})}', async () => {
    const fromChild = await assembleWithProps({
      useCoordTransform: true,
      transformX: "log10",
    });
    const fromProp = await assembleWithProps({
      coordProp: coordTransform({ x: "log10" }),
    });
    expect(fromChild.coord).toEqual(fromProp.coord);
    expect(fromChild.coord?.type).toBe("transform");
  });

  it('1d: <FacetWrap field="g"/> matches facet={{wrap:"g"}}', async () => {
    const fromChild = await assembleWithProps({ useFacetWrap: true, facetField: "g" });
    const fromProp = await assembleWithProps({ facetProp: { wrap: "g" } });
    expect(fromChild.facet).toEqual(fromProp.facet);
    expect(fromChild.facet?.wrap).toEqual({ field: "g" });
  });

  it('1e: <FacetGrid rows="a" cols="b"/> matches facet={{rows:"a",cols:"b"}}', async () => {
    const fromChild = await assembleWithProps({
      useFacetGrid: true,
      facetRows: "a",
      facetCols: "b",
    });
    const fromProp = await assembleWithProps({
      facetProp: { rows: "a", cols: "b" },
    });
    expect(fromChild.facet).toEqual(fromProp.facet);
    expect(fromChild.facet?.rows).toEqual({ field: "a" });
    expect(fromChild.facet?.cols).toEqual({ field: "b" });
  });

  it("1f: <Coord value/> escape hatch matches the equivalent coord prop", async () => {
    const fromChild = await assembleWithProps({
      useCoordValue: true,
      coordValue: { type: "fixed", ratio: 3 },
    });
    const fromProp = await assembleWithProps({
      coordProp: coordFixed({ ratio: 3 }),
    });
    expect(fromChild.coord).toEqual({ type: "fixed", ratio: 3 });
    expect(fromChild.coord).toEqual(fromProp.coord);
  });

  it('1g: <Coord value="flip"/> canonicalises the bare string like <CoordFlip/>', async () => {
    const fromValue = await assembleWithProps({
      useCoordValue: true,
      coordValue: "flip",
    });
    const fromShell = await assembleWithProps({ useCoordFlip: true });
    expect(fromValue.coord).toEqual({ type: "flip" });
    expect(fromValue.coord).toEqual(fromShell.coord);
  });

  it("1h: <FacetWrap ncol/scales/strip> forwards every optional prop", async () => {
    const fromChild = await assembleWithProps({
      useFacetWrap: true,
      facetField: "g",
      facetNcol: 2,
      facetScales: "free_y",
      facetStrip: { position: "bottom", show: true },
    });
    const fromProp = await assembleWithProps({
      facetProp: {
        wrap: "g",
        ncol: 2,
        scales: "free_y",
        strip: { position: "bottom", show: true },
      },
    });
    expect(fromChild.facet).toEqual(fromProp.facet);
    expect(fromChild.facet?.ncol).toBe(2);
    expect(fromChild.facet?.scales).toBe("free_y");
    // strip stays NESTED — it is not flattened onto the facet root.
    expect(fromChild.facet?.strip).toEqual({ position: "bottom", show: true });
  });

  it("1i: <FacetGrid scales/strip> forwards every optional prop", async () => {
    const fromChild = await assembleWithProps({
      useFacetGrid: true,
      facetRows: "a",
      facetCols: "b",
      facetScales: "free",
      facetStrip: { position: "top", show: false },
    });
    const fromProp = await assembleWithProps({
      facetProp: {
        rows: "a",
        cols: "b",
        scales: "free",
        strip: { position: "top", show: false },
      },
    });
    expect(fromChild.facet).toEqual(fromProp.facet);
    expect(fromChild.facet?.scales).toBe("free");
    expect(fromChild.facet?.strip).toEqual({ position: "top", show: false });
  });

  it("1j: facet fields accept the object form, not just a bare string", async () => {
    const fromObject = await assembleWithProps({
      useFacetWrap: true,
      facetField: { field: "g" },
    });
    const fromString = await assembleWithProps({
      useFacetWrap: true,
      facetField: "g",
    });
    expect(fromObject.facet?.wrap).toEqual({ field: "g" });
    expect(fromObject.facet).toEqual(fromString.facet);
  });

  it("2: <CoordCartesian/> → assembled coord is ABSENT", async () => {
    const spec = await assembleWithProps({ useCoordCartesian: true });
    expect(spec.coord).toBeUndefined();
  });

  it("3a: children win over prop (REPLACE): coord=flip + <CoordFixed/> → fixed only", async () => {
    const spec = await assembleWithProps({
      coordProp: "flip",
      useCoordFixed: true,
      fixedRatio: 2,
    });
    expect(spec.coord).toEqual({ type: "fixed", ratio: 2 });
    expect(spec.coord?.type).not.toBe("flip");
  });

  it("3b: children win over prop (REPLACE): facet wrap + <FacetGrid/> → grid only", async () => {
    const spec = await assembleWithProps({
      facetProp: { wrap: "g" },
      useFacetGrid: true,
      facetRows: "a",
      facetCols: "b",
    });
    expect(spec.facet?.rows).toEqual({ field: "a" });
    expect(spec.facet?.cols).toEqual({ field: "b" });
    expect(spec.facet?.wrap).toBeUndefined();
  });

  it("4: prop + child emits DEPRECATION only — NOT composition", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(CoordFacetChildrenPlot, {
      coordProp: "flip",
      useCoordFixed: true,
      fixedRatio: 2,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP"))
      .toHaveLength(1);
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_PLOT_LAYER")).toHaveLength(0);
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL")).toHaveLength(0);
  });

  it("5: spec prop short-circuits with coord/facet children present", async () => {
    const spec = await assembleWithProps({
      useSpec: true,
      useCoordFlip: true,
      useFacetWrap: true,
    });
    // Spec embeds fixed ratio 3 and wrap g — children ignored.
    expect(spec.coord).toEqual({ type: "fixed", ratio: 3 });
    expect(spec.facet?.wrap).toEqual({ field: "g" });
  });

  it("6: layers prop + coord/facet child: marks from prop, non-mark children fold", async () => {
    const spec = await assembleWithProps({
      useLayersProp: true,
      useCoordFlip: true,
      useFacetWrap: true,
      facetField: "g",
    });
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.geom).toBe("point");
    expect(spec.coord).toEqual({ type: "flip" });
    expect(spec.facet?.wrap).toEqual({ field: "g" });
  });

  it("7a: two coord children → one DUPLICATE_PLOT_LAYER (kind coord); last wins", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(CoordFacetChildrenPlot, {
      useCoordFlip: true,
      useCoordFixed: true,
      fixedRatio: 2,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    // Last registered is CoordFixed (after CoordFlip in the fixture).
    expect(spec.coord).toEqual({ type: "fixed", ratio: 2 });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_PLOT_LAYER"))
      .toHaveLength(1);
    const advisory = diagnostics.find((d) => d.code === "DUPLICATE_PLOT_LAYER")!;
    expect(isCompositionDiagnostic(advisory)).toBe(true);
    expect(isDuplicatePlotLayerDiagnostic(advisory)).toBe(true);
    if (!isDuplicatePlotLayerDiagnostic(advisory)) throw new Error("expected plot layer");
    expect(advisory.kind).toBe("coord");
    expect(advisory.severity).toBe("advisory");
    expect(advisory.docUrl).toContain("compose-coord-as-a-child-layer");
    expect(advisory.suggestions.length).toBeGreaterThan(0);
    // Scale-only field must not exist on the plot-layer variant.
    expect("channel" in advisory).toBe(false);
  });

  it("7b: FacetWrap + FacetGrid → one DUPLICATE_PLOT_LAYER (kind facet); last wins", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(CoordFacetChildrenPlot, {
      useFacetWrap: true,
      useFacetGrid: true,
      facetField: "g",
      facetRows: "a",
      facetCols: "b",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    // FacetGrid is last → grid only.
    expect(spec.facet?.rows).toEqual({ field: "a" });
    expect(spec.facet?.wrap).toBeUndefined();
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_PLOT_LAYER"))
      .toHaveLength(1);
    const advisory = diagnostics.find((d) => d.code === "DUPLICATE_PLOT_LAYER")!;
    if (!isDuplicatePlotLayerDiagnostic(advisory)) throw new Error("expected plot layer");
    expect(advisory.kind).toBe("facet");
  });

  it("7c: two theme children → one DUPLICATE_PLOT_LAYER (kind theme)", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(CoordFacetChildrenPlot, {
      useThemeDark: true,
      useThemeLight: true,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    // Theme light is last in the fixture.
    expect(spec.theme).toBe("light");
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_PLOT_LAYER"))
      .toHaveLength(1);
    const advisory = diagnostics.find((d) => d.code === "DUPLICATE_PLOT_LAYER")!;
    if (!isDuplicatePlotLayerDiagnostic(advisory)) throw new Error("expected plot layer");
    expect(advisory.kind).toBe("theme");
  });

  it("7d: coord dup AND facet dup → TWO advisories (dedup key is kind)", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(CoordFacetChildrenPlot, {
      useCoordFlip: true,
      useCoordFixed: true,
      fixedRatio: 2,
      useFacetWrap: true,
      useFacetGrid: true,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_PLOT_LAYER").length)
      .toBe(2);
    const kinds = diagnostics
      .filter((d) => d.code === "DUPLICATE_PLOT_LAYER")
      .map((d) => (isDuplicatePlotLayerDiagnostic(d) ? d.kind : null));
    // Set comparison rather than sort(): the repo's lint config wants
    // Array#toSorted, which this TS lib target does not declare.
    expect(new Set(kinds)).toEqual(new Set(["coord", "facet"]));
  });

  it("8: live prop update changes assembled spec without re-registration", async () => {
    let assembled: PortableSpec | null = null;
    let host: LayerRegistry | undefined;
    const view = render(CoordFacetChildrenPlot, {
      useCoordFixed: true,
      fixedRatio: 1,
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    // ratio 1 normalizes away from the object.
    expect(assembled!.coord).toEqual({ type: "fixed" });
    expect(host).toBeDefined();
    const countAfterInit = host!.registrationCount;
    expect(countAfterInit).toBeGreaterThan(0);

    assembled = null;
    await view.rerender({
      useCoordFixed: true,
      fixedRatio: 2,
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    flushSync();
    await waitAssembled(() => assembled);
    expect(assembled!.coord).toEqual({ type: "fixed", ratio: 2 });
    expect(host!.registrationCount).toBe(countAfterInit);
  });

  it("9: bare <Facet/> fails loudly at validate (facet-form-missing)", () => {
    expect(() =>
      render(CoordFacetChildrenPlot, {
        useBareFacet: true,
      }),
    ).toThrow(/neither wrap nor rows\/cols|facet-form-missing/);
  });
});

describe("coord/facet prop deprecation advisories", () => {
  it("10a: coord prop advisory shape: since/removeIn/prop/docUrl/suggestions", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(CoordFacetChildrenPlot, {
      coordProp: "flip",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP"))
      .toHaveLength(1);
    const advisory = diagnostics.find((d) => d.code === "DEPRECATED_PLOT_PROP")!;
    expect(isDeprecationDiagnostic(advisory)).toBe(true);
    if (!isDeprecationDiagnostic(advisory)) throw new Error("expected deprecation");
    expect(advisory.prop).toBe("coord");
    expect(advisory.since).toBe("0.11.0");
    expect(advisory.removeIn).toBe("0.13.0");
    expect(advisory.docUrl).toContain("compose-coord-as-a-child-layer");
    expect(advisory.suggestions.length).toBeGreaterThan(0);
  });

  it("10b: facet prop advisory shape: since/removeIn/prop/docUrl/suggestions", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(CoordFacetChildrenPlot, {
      facetProp: { wrap: "g" },
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP"))
      .toHaveLength(1);
    const advisory = diagnostics.find((d) => d.code === "DEPRECATED_PLOT_PROP")!;
    expect(isDeprecationDiagnostic(advisory)).toBe(true);
    if (!isDeprecationDiagnostic(advisory)) throw new Error("expected deprecation");
    expect(advisory.prop).toBe("facet");
    expect(advisory.since).toBe("0.11.0");
    expect(advisory.removeIn).toBe("0.13.0");
    expect(advisory.docUrl).toContain("compose-facet-as-a-child-layer");
    expect(advisory.suggestions.length).toBeGreaterThan(0);
  });

  it("10c: child-only plot fires no DEPRECATED_PLOT_PROP", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(CoordFacetChildrenPlot, {
      useCoordFlip: true,
      useFacetWrap: true,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP")).toHaveLength(0);
  });

  it("10d: dev console.warn fallback with no handler; silent under production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      /* swallow */
    });
    try {
      vi.stubGlobal("process", { env: { NODE_ENV: "development" } });
      render(CoordFacetChildrenPlot, { coordProp: "flip" });
      await expect
        .poll(() =>
          warn.mock.calls.some((call) => String(call[0]).includes("DEPRECATED_PLOT_PROP")),
        )
        .toBe(true);

      warn.mockClear();
      vi.stubGlobal("process", { env: { NODE_ENV: "production" } });
      render(CoordFacetChildrenPlot, { facetProp: { wrap: "g" } });
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      expect(warn.mock.calls.some((call) => String(call[0]).includes("DEPRECATED_PLOT_PROP"))).toBe(
        false,
      );
    } finally {
      warn.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
