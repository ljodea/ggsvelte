/**
 * Labs + guides + legend children + prop deprecations (#659 slice 6).
 *
 * These three are the keyed-MERGE families: unlike coord/facet/theme (REPLACE),
 * a second child does not replace the first — it shallow-merges over it, so the
 * only thing lost is the individual key both children set. The suite pins that
 * distinction, the D2 children-win-over-props rule, and the advisory that fires
 * when two children collide on one key.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import type { PortableSpec } from "../../src/lib/index.js";
import type { PlotDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import LabsGuidesLegendPlot from "../fixtures/LabsGuidesLegendPlot.svelte";
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
  render(LabsGuidesLegendPlot, {
    ...props,
    onrender: (_model: unknown, spec: PortableSpec) => {
      assembled = spec;
    },
    ondiagnostic: () => {},
  });
  return waitAssembled(() => assembled);
}

describe("<Labs> child → assembled PortableSpec", () => {
  it("1a: <Labs title subtitle x color/> matches the equivalent labs prop", async () => {
    const fromChild = await assembleWithProps({
      useLabs: true,
      labsTitle: "Sales",
      labsSubtitle: "FY25",
      labsX: "Quarter",
      labsColor: "Region",
    });
    const fromProp = await assembleWithProps({
      labsProp: { title: "Sales", subtitle: "FY25", x: "Quarter", color: "Region" },
    });
    expect(fromChild.labs).toEqual({
      title: "Sales",
      subtitle: "FY25",
      x: "Quarter",
      color: "Region",
    });
    expect(fromChild.labs).toEqual(fromProp.labs);
  });

  it("1b: undefined <Labs> props are stripped, not emitted as undefined keys", async () => {
    const assembled = await assembleWithProps({ useLabs: true, labsTitle: "Only a title" });
    expect(assembled.labs).toEqual({ title: "Only a title" });
    expect(Object.keys(assembled.labs ?? {})).toEqual(["title"]);
  });

  it("1c: labs is a MERGE family — a child keeps prop keys it does not set", async () => {
    const assembled = await assembleWithProps({
      labsProp: { title: "From prop", caption: "kept" },
      useLabs: true,
      labsX: "From child",
    });
    expect(assembled.labs).toEqual({
      title: "From prop",
      caption: "kept",
      x: "From child",
    });
  });

  it("1d: on a shared key the child wins over the prop (D2)", async () => {
    const assembled = await assembleWithProps({
      labsProp: { title: "From prop" },
      useLabs: true,
      labsTitle: "From child",
    });
    expect(assembled.labs?.title).toBe("From child");
  });

  it("1e: two <Labs> children merge across distinct keys — MERGE, not REPLACE", async () => {
    const assembled = await assembleWithProps({
      useLabs: true,
      labsTitle: "First",
      useSecondLabs: true,
      secondLabsY: "Second",
    });
    expect(assembled.labs).toEqual({ title: "First", y: "Second" });
  });

  it("1f: an explicit spec prop short-circuits every child", async () => {
    const assembled = await assembleWithProps({
      useSpec: true,
      useLabs: true,
      labsTitle: "ignored",
    });
    expect(assembled.labs).toEqual({ title: "from spec" });
  });
});

describe("Guide children → assembled PortableSpec", () => {
  it('3a: <GuideLegend channel="color" position="bottom"/> matches guideLegend() under the prop', async () => {
    const fromChild = await assembleWithProps({
      useGuideLegend: true,
      guideChannel: "color",
      guidePosition: "bottom",
    });
    const fromProp = await assembleWithProps({
      guidesProp: { color: { type: "legend", position: "bottom" } },
    });
    expect(fromChild.guides).toEqual({ color: { type: "legend", position: "bottom" } });
    expect(fromChild.guides).toEqual(fromProp.guides);
  });

  it("3b: the channel prop keys the guide — it never leaks into the guide object", async () => {
    const assembled = await assembleWithProps({
      useGuideLegend: true,
      guideChannel: "fill",
      guidePosition: "right",
    });
    expect(assembled.guides).toEqual({ fill: { type: "legend", position: "right" } });
    expect(Object.keys(assembled.guides?.fill ?? {})).not.toContain("channel");
  });

  it("3c: every shell stamps its own guide type", async () => {
    const axis = await assembleWithProps({ useGuideAxis: true, guideChannel: "x" });
    const legend = await assembleWithProps({ useGuideLegend: true, guideChannel: "color" });
    // colorbar/colorsteps need a continuous color scale to survive the
    // pipeline's guide/scale-family compatibility check (see 3i).
    const colorbar = await assembleWithProps({
      useGuideColorbar: true,
      guideChannel: "color",
      continuousColor: true,
    });
    const colorsteps = await assembleWithProps({
      useGuideColorsteps: true,
      guideChannel: "color",
      continuousColor: true,
      colorScaleType: "binned",
    });
    const none = await assembleWithProps({ useGuideNone: true, guideChannel: "size" });
    expect(axis.guides?.x).toEqual({ type: "axis" });
    expect(legend.guides?.color).toEqual({ type: "legend" });
    expect(colorbar.guides?.color).toEqual({ type: "colorbar" });
    expect(colorsteps.guides?.color).toEqual({ type: "colorsteps" });
    expect(none.guides?.size).toEqual({ type: "none" });
  });

  it('3d: <GuideNone channel="size"/> equals guides={{size:{type:"none"}}}', async () => {
    const fromChild = await assembleWithProps({ useGuideNone: true, guideChannel: "size" });
    const fromProp = await assembleWithProps({ guidesProp: { size: { type: "none" } } });
    expect(fromChild.guides).toEqual(fromProp.guides);
  });

  it("3e: <Guides value/> escape hatch matches the equivalent guides prop", async () => {
    const fromChild = await assembleWithProps({
      useGuidesValue: true,
      guidesValue: { color: { type: "none" }, x: { type: "axis", showTicks: false } },
    });
    const fromProp = await assembleWithProps({
      guidesProp: { color: { type: "none" }, x: { type: "axis", showTicks: false } },
    });
    expect(fromChild.guides).toEqual(fromProp.guides);
  });

  it("3f: guides is a MERGE family — a child keeps prop channels it does not set", async () => {
    const assembled = await assembleWithProps({
      guidesProp: { x: { type: "axis", showTicks: false } },
      useGuideLegend: true,
      guideChannel: "color",
    });
    expect(assembled.guides).toEqual({
      x: { type: "axis", showTicks: false },
      color: { type: "legend" },
    });
  });

  it("3g: on a shared channel the child replaces the whole prop guide, not field-by-field", async () => {
    const assembled = await assembleWithProps({
      guidesProp: { color: { type: "legend", position: "right", title: "kept?" } },
      useGuideLegend: true,
      guideChannel: "color",
      guidePosition: "bottom",
    });
    expect(assembled.guides?.color).toEqual({ type: "legend", position: "bottom" });
  });

  it("3h: two guide children on distinct channels merge; neither is dropped", async () => {
    const assembled = await assembleWithProps({
      useGuideLegend: true,
      guideChannel: "color",
      useSecondGuideNone: true,
      secondGuideChannel: "size",
    });
    expect(assembled.guides).toEqual({
      color: { type: "legend" },
      size: { type: "none" },
    });
  });

  it("3i: a guide incompatible with the trained scale fails loudly, not silently", () => {
    // <GuideColorbar channel="color"/> over a DISCRETE color scale. The shell
    // has no scale knowledge and must not guess: the pipeline rejects it.
    // Pinning this so a future "helpful" fallback in the shell is a red test.
    expect(() =>
      render(LabsGuidesLegendPlot, {
        useGuideColorbar: true,
        guideChannel: "color",
        ondiagnostic: () => {},
      }),
    ).toThrow(/colorbar guide is incompatible/);
  });
});

describe("<Legend> child → assembled PortableSpec", () => {
  it('4a: <Legend order="sorted"/> matches legend={{order:"sorted"}}', async () => {
    const fromChild = await assembleWithProps({ useLegend: true, legendOrder: "sorted" });
    const fromProp = await assembleWithProps({ legendProp: { order: "sorted" } });
    expect(fromChild.legend).toEqual({ order: "sorted" });
    expect(fromChild.legend).toEqual(fromProp.legend);
  });

  it("4b: on the shared order key the child wins over the prop (D2)", async () => {
    const assembled = await assembleWithProps({
      legendProp: { order: "stable-domain" },
      useLegend: true,
      legendOrder: "present-first-seen",
    });
    expect(assembled.legend?.order).toBe("present-first-seen");
  });

  it("4d: an undefined order is stripped, never emitted as an undefined key", async () => {
    // <Legend order={undefined}/> is what a caller writing
    // `<Legend order={maybeUndefined}/>` produces. The key must not survive:
    // LegendSpec is additionalProperties:false under exactOptionalPropertyTypes.
    const assembled = await assembleWithProps({ useBareLegend: true });
    expect(assembled.legend ?? {}).not.toHaveProperty("order");
  });

  it("4c: <Legend order> and <GuideLegend order> are unrelated — entry sort vs placement rank", async () => {
    const assembled = await assembleWithProps({
      useLegend: true,
      legendOrder: "sorted",
      useGuideLegend: true,
      guideChannel: "color",
      guideOrder: 7,
    });
    // The enum lands on legend; the integer rank lands on the guide. Neither
    // overwrites the other, and neither is coerced into the other's shape.
    expect(assembled.legend).toEqual({ order: "sorted" });
    expect(assembled.guides?.color).toEqual({ type: "legend", order: 7 });
  });
});

describe("keyed-MERGE duplicate advisories", () => {
  it("5a: two <Labs> children on one key emit one DUPLICATE_MERGE_KEY; the later wins", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "First",
      useSecondLabs: true,
      secondLabsTitle: "Second",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    const advisories = diagnostics.filter((d) => d.code === "DUPLICATE_MERGE_KEY");
    expect(advisories).toHaveLength(1);
    const advisory = advisories[0];
    expect(advisory).toMatchObject({ severity: "advisory", kind: "labs", key: "title" });
    expect(advisory.docUrl).toContain("compose-labs-as-a-child-layer");
    expect(spec.labs?.title).toBe("Second");
  });

  it("5b: two guide children on one channel emit DUPLICATE_MERGE_KEY for guides", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      useGuideLegend: true,
      guideChannel: "color",
      useSecondGuideNone: true,
      secondGuideChannel: "color",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    const advisories = diagnostics.filter((d) => d.code === "DUPLICATE_MERGE_KEY");
    expect(advisories).toHaveLength(1);
    expect(advisories[0]).toMatchObject({ kind: "guides", key: "color" });
    expect(spec.guides?.color).toEqual({ type: "none" });
  });

  it("5c: distinct keys across children fire no advisory at all", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "First",
      useSecondLabs: true,
      secondLabsY: "Second",
      useGuideLegend: true,
      guideChannel: "color",
      useSecondGuideNone: true,
      secondGuideChannel: "size",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_MERGE_KEY")).toHaveLength(0);
  });

  it("5d: a prop plus a child on the same key is a deprecation, never a duplicate", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      labsProp: { title: "From prop" },
      useLabs: true,
      labsTitle: "From child",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_MERGE_KEY")).toHaveLength(0);
    expect(
      diagnostics.filter(
        (d) => d.code === "DEPRECATED_PLOT_PROP" && "prop" in d && d.prop === "labs",
      ),
    ).toHaveLength(1);
  });

  it("5e: the scale-only DUPLICATE_SCALE_CHANNEL code is untouched by the merge-key family", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "First",
      useSecondLabs: true,
      secondLabsTitle: "Second",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL")).toHaveLength(0);
  });
});

describe("ADR 0001 live getters", () => {
  it("7a: a labs prop update changes the assembled spec without re-registration", async () => {
    let assembled: PortableSpec | null = null;
    let host: LayerRegistry | undefined;
    const view = render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "First",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      ondiagnostic: () => {},
    });
    await waitAssembled(() => assembled);
    expect(assembled!.labs).toEqual({ title: "First" });
    expect(host).toBeDefined();
    const countAfterInit = host!.registrationCount;
    expect(countAfterInit).toBeGreaterThan(0);

    assembled = null;
    await view.rerender({
      useLabs: true,
      labsTitle: "Second",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      ondiagnostic: () => {},
    });
    flushSync();
    await waitAssembled(() => assembled);
    expect(assembled!.labs).toEqual({ title: "Second" });
    expect(host!.registrationCount).toBe(countAfterInit);
  });

  it("7b: a guide prop update flows through without re-registration", async () => {
    let assembled: PortableSpec | null = null;
    let host: LayerRegistry | undefined;
    const view = render(LabsGuidesLegendPlot, {
      useGuideLegend: true,
      guideChannel: "color",
      guidePosition: "right",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      ondiagnostic: () => {},
    });
    await waitAssembled(() => assembled);
    expect(assembled!.guides?.color).toEqual({ type: "legend", position: "right" });
    const countAfterInit = host!.registrationCount;

    assembled = null;
    await view.rerender({
      useGuideLegend: true,
      guideChannel: "color",
      guidePosition: "bottom",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      ondiagnostic: () => {},
    });
    flushSync();
    await waitAssembled(() => assembled);
    expect(assembled!.guides?.color).toEqual({ type: "legend", position: "bottom" });
    expect(host!.registrationCount).toBe(countAfterInit);
  });

  it("7c: the duplicate-key advisory fires once per key across repeated updates", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    const view = render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "a",
      useSecondLabs: true,
      secondLabsTitle: "b",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    const onrender = (_model: unknown, spec: PortableSpec): void => {
      assembled = spec;
    };
    for (const title of ["c", "d", "e"]) {
      await view.rerender({
        useLabs: true,
        labsTitle: title,
        useSecondLabs: true,
        secondLabsTitle: "b",
        ondiagnostic,
        onrender,
      });
      flushSync();
    }
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_MERGE_KEY")).toHaveLength(1);
  });
});

describe("scale-local guide vs top-level guide child", () => {
  it("6a: a top-level guide child wins over a scale-local guide on the same channel", async () => {
    // Existing core contract (guide-config.ts effectiveGuide): the top-level
    // guide wins, field-merging only when the two share a type. The child form
    // must not invent a different rule.
    const assembled = await assembleWithProps({
      scaleLocalGuideTitle: "from the scale",
      useGuideLegend: true,
      guideChannel: "color",
      guidePosition: "bottom",
    });
    expect(assembled.guides?.color).toEqual({ type: "legend", position: "bottom" });
    expect(assembled.scales?.color?.guide).toEqual({ type: "legend", title: "from the scale" });
  });
});

describe("labs prop deprecation", () => {
  it("2a: the labs prop emits one DEPRECATED_PLOT_PROP advisory naming the child form", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      labsProp: { title: "x" },
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    const advisories = diagnostics.filter(
      (d) => d.code === "DEPRECATED_PLOT_PROP" && "prop" in d && d.prop === "labs",
    );
    expect(advisories).toHaveLength(1);
    expect(advisories[0].message).toContain("labs");
    expect(advisories[0].docUrl).toContain("compose-labs-as-a-child-layer");
  });

  it("2c: the guides and legend props each emit their own advisory", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      guidesProp: { color: { type: "none" } },
      legendProp: { order: "sorted" },
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    for (const [prop, anchor] of [
      ["guides", "compose-guides-as-child-layers"],
      ["legend", "compose-legend-as-a-child-layer"],
    ] as const) {
      const advisories = diagnostics.filter(
        (d) => d.code === "DEPRECATED_PLOT_PROP" && "prop" in d && d.prop === prop,
      );
      expect(advisories, `expected one advisory for the ${prop} prop`).toHaveLength(1);
      expect(advisories[0].docUrl).toContain(anchor);
    }
  });

  it("2b: no labs prop → no labs deprecation advisory", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "child only",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    expect(diagnostics.filter((d) => "prop" in d && d.prop === "labs")).toHaveLength(0);
  });
});
