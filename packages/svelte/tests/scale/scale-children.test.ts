/**
 * Scale children + scales-prop deprecation (#659 slice 3).
 * Covers registration/fold, child-wins precedence, live getters,
 * deprecation + composition advisories, and color-fill export parity.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import { SCALE_CAPABILITIES, scaleXLog10, type PortableSpec } from "../../src/lib/index.js";
import * as SveltePkg from "../../src/lib/index.js";
import type { PlotDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import { isDeprecationDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import {
  isCompositionDiagnostic,
  isDuplicateScaleChannelDiagnostic,
} from "../../src/lib/diagnostics/composition.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import ScaleChildrenPlot from "../fixtures/ScaleChildrenPlot.svelte";
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

describe("Scale children → assembled PortableSpec", () => {
  it('1: <ScaleColorDiscrete scheme="colorblind"/> → color ordinal scheme', async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.color).toEqual({ type: "ordinal", scheme: "colorblind" });
  });

  it("2: <Scale value={scaleXLog10()}/> → x.transform log10", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useGenericScale: true,
      scaleValue: scaleXLog10(),
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.x?.transform).toBe("log10");
  });

  it("3: <ScaleColorDiscrete/> + <ScaleFillContinuous/> → both keys present", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleFillContinuous: true,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.color).toBeDefined();
    expect(spec.scales?.fill).toBeDefined();
    expect(spec.scales?.color?.type).toBe("ordinal");
    expect(spec.scales?.fill?.type).toBe("sequential");
  });

  it("4: scales prop + child, disjoint keys → both present", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      scalesProp: { size: { type: "sequential" } },
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      ondiagnostic: () => {},
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.size).toEqual({ type: "sequential" });
    expect(spec.scales?.color).toEqual({ type: "ordinal", scheme: "colorblind" });
  });

  it("5a: scales prop + child, same key → child wins", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      scalesProp: { color: { type: "sequential", scheme: "viridis" } },
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      ondiagnostic: () => {},
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.color).toEqual({ type: "ordinal", scheme: "colorblind" });
  });

  it("5b: prop + child emits exactly one DEPRECATED_PLOT_PROP", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    const view = render(ScaleChildrenPlot, {
      scalesProp: { color: { type: "sequential", scheme: "viridis" } },
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP"))
      .toHaveLength(1);
    // Shared dedup Set: re-renders with scales still set must not re-advise.
    const capture = (_model: unknown, spec: PortableSpec): void => {
      assembled = spec;
    };
    for (const scheme of ["viridis", "plasma", "inferno"] as const) {
      await view.rerender({
        scalesProp: { color: { type: "sequential", scheme } },
        useScaleColorDiscrete: true,
        colorScheme: "colorblind",
        ondiagnostic,
        onrender: capture,
      });
      flushSync();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }
    expect(diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP")).toHaveLength(1);
  });

  it("6: spec prop + scale child → spec wins, child ignored", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useSpec: true,
      useScaleColorDiscrete: true,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.color).toEqual({ type: "ordinal", scheme: "tableau10" });
  });

  it("7: layers prop + scale child → layers wins for marks, scale child still applies", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useLayersProp: true,
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    // layers prop supplies the mark; scale child still folds in.
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.geom).toBe("point");
    expect(spec.scales?.color).toEqual({ type: "ordinal", scheme: "colorblind" });
  });

  it("8: reactive <ScaleColorDiscrete scheme={x}/> updates spec, registrationCount unchanged", async () => {
    let assembled: PortableSpec | null = null;
    let host: LayerRegistry | undefined;
    const view = render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    expect(assembled!.scales?.color?.scheme).toBe("colorblind");
    expect(host).toBeDefined();
    const countAfterInit = host!.registrationCount;
    expect(countAfterInit).toBeGreaterThan(0);

    assembled = null;
    await view.rerender({
      useScaleColorDiscrete: true,
      colorScheme: "tableau10",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    flushSync();
    await waitAssembled(() => assembled);
    expect(assembled!.scales?.color?.scheme).toBe("tableau10");
    // ADR 0001: prop updates must not re-register.
    expect(host!.registrationCount).toBe(countAfterInit);
  });
});

describe("scales prop deprecation advisories", () => {
  it("10: scales advisory shape: since/removeIn/prop/docUrl/suggestions", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(ScaleChildrenPlot, {
      scalesProp: { color: { scheme: "colorblind" } },
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((diag) => diag.code === "DEPRECATED_PLOT_PROP"))
      .toHaveLength(1);
    const advisory = diagnostics.find((diag) => diag.code === "DEPRECATED_PLOT_PROP")!;
    expect(isDeprecationDiagnostic(advisory)).toBe(true);
    if (!isDeprecationDiagnostic(advisory)) throw new Error("expected deprecation");
    expect(advisory.severity).toBe("advisory");
    expect(advisory.prop).toBe("scales");
    expect(advisory.since).toBe("0.11.0");
    expect(advisory.removeIn).toBe("0.13.0");
    expect(advisory.docUrl).toContain("https://ggsvelte.sh/guide/upgrading#");
    expect(advisory.docUrl).toContain("compose-scales-as-child-layers");
    expect(advisory.suggestions.length).toBeGreaterThan(0);
    // Slice 4: every family has a shell; suggestions name representative ones
    // plus the <Scale value={…}/> escape hatch for raw/computed fragments.
    const joined = advisory.suggestions.join(" ");
    expect(joined).toMatch(/ScaleColorDiscrete/);
    expect(joined).toMatch(/ScaleXContinuous|ScaleSizeContinuous|ScaleShapeDiscrete/);
    expect(joined).toMatch(/Scale value/);
    expect(joined).not.toMatch(/families without shells yet/);
    expect(joined).not.toMatch(/later slice/);
  });

  it("11: dev console.warn fallback with no handler; silent under production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      /* swallow */
    });
    try {
      vi.stubGlobal("process", { env: { NODE_ENV: "development" } });
      render(ScaleChildrenPlot, { scalesProp: { color: { scheme: "colorblind" } } });
      await expect
        .poll(() =>
          warn.mock.calls.some((call) => String(call[0]).includes("DEPRECATED_PLOT_PROP")),
        )
        .toBe(true);

      warn.mockClear();
      vi.stubGlobal("process", { env: { NODE_ENV: "production" } });
      render(ScaleChildrenPlot, { scalesProp: { color: { scheme: "tableau10" } } });
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

  it("12: child-only plot fires no DEPRECATED_PLOT_PROP", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
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
});

describe("Scale* export parity with all SCALE_CAPABILITIES families", () => {
  it("13: exported Scale* set === all families ∪ {Scale} ∪ Colour aliases", () => {
    const expectedFromHelpers: string[] = [];
    for (const cap of SCALE_CAPABILITIES) {
      for (const h of cap.helpers) {
        if (h.includes("_")) continue;
        // scaleFoo → ScaleFoo (includes Colour aliases and every family)
        expectedFromHelpers.push("S" + h.slice(1));
      }
    }
    // ScaleSizeOrdinal is a manifest-only alias of ScaleSizeDiscrete (#830);
    // camel helper scaleSizeOrdinal is snake-exported only, not in this ledger.
    const expectedExports = new Set(["Scale", "ScaleSizeOrdinal", ...expectedFromHelpers]);

    const pkg = SveltePkg as Record<string, unknown>;
    const actualScaleExports = Object.keys(pkg).filter(
      (key) =>
        key === "Scale" ||
        (key.startsWith("Scale") && key[5] !== undefined && key[5] === key[5].toUpperCase()),
    );

    for (const name of expectedExports) {
      expect(pkg[name], `missing export ${name}`).toBeTypeOf("function");
    }
    expect(new Set(actualScaleExports)).toEqual(expectedExports);
    // 80 shells + 15 Colour aliases + ScaleSizeOrdinal + hand-written Scale
    expect(expectedExports.size).toBe(80 + 15 + 1 + 1);
  });
});

describe("definedProps + composition diagnostics", () => {
  it("14: scheme={undefined} produces no scheme key", async () => {
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      // colorScheme omitted → undefined prop value path
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.scales?.color).toEqual({ type: "ordinal" });
    expect(spec.scales?.color).not.toHaveProperty("scheme");
  });

  it("15: <ScaleColorDiscrete/> + <ScaleColourContinuous/> → one DUPLICATE_SCALE_CHANNEL; last wins", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleColourContinuous: true,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    // Last child is ScaleColourContinuous → sequential color scale.
    expect(spec.scales?.color?.type).toBe("sequential");
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL"))
      .toHaveLength(1);
    const advisory = diagnostics.find((d) => d.code === "DUPLICATE_SCALE_CHANNEL")!;
    expect(isCompositionDiagnostic(advisory)).toBe(true);
    if (!isCompositionDiagnostic(advisory)) throw new Error("expected composition");
    expect(isDuplicateScaleChannelDiagnostic(advisory)).toBe(true);
    if (!isDuplicateScaleChannelDiagnostic(advisory)) throw new Error("expected scale variant");
    expect(advisory.channel).toBe("color");
    expect(advisory.kind).toBe("scale");
    expect(advisory.severity).toBe("advisory");
    // Parity with the sibling PlotDiagnostic variants: a consumer rendering
    // docUrl/suggestions over the union must not hit undefined here.
    expect(advisory.docUrl).toBe(
      "https://ggsvelte.sh/guide/upgrading#compose-scales-as-child-layers",
    );
    expect(advisory.suggestions.length).toBeGreaterThan(0);
  });

  it("16: distinct channels (color + fill) fire no DUPLICATE_SCALE_CHANNEL", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleFillContinuous: true,
      ondiagnostic,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL")).toHaveLength(0);
  });

  it("17: DUPLICATE_SCALE_CHANNEL fires once per channel across N reactive updates", async () => {
    const { diagnostics, ondiagnostic } = collect();
    const view = render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleColourContinuous: true,
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL").length)
      .toBe(1);

    for (const next of ["tableau10", "observable10", "ipsum", "flexoki"] as const) {
      await view.rerender({
        useScaleColorDiscrete: true,
        colorScheme: next,
        useScaleColourContinuous: true,
        ondiagnostic,
      });
      flushSync();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL")).toHaveLength(1);
  });
});
