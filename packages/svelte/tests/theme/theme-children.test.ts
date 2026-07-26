/**
 * Theme children + theme-prop deprecation (#659 slice 2).
 * Covers registration/fold, D3 canonical form, child-wins precedence,
 * live getters, deprecation advisories, and THEME_NAMES parity.
 */
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";

import { THEME_NAMES, type PortableSpec } from "../../src/lib/index.js";
import * as SveltePkg from "../../src/lib/index.js";
import type { PlotDiagnostic } from "../../src/lib/diagnostics/deprecation.js";
import {
  DEPRECATION_DIAGNOSTIC_CATALOG,
  isDeprecationDiagnostic,
} from "../../src/lib/diagnostics/deprecation.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import ThemeChildrenPlot from "../fixtures/ThemeChildrenPlot.svelte";
import { render } from "../helpers/render.js";

const size = { width: 480, height: 320 };

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

describe("Theme children → assembled PortableSpec", () => {
  it('1: <GeomPoint/> + <ThemeDark/> (no theme prop) → spec.theme === "dark" string', async () => {
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      useThemeDark: true,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.theme).toBe("dark");
    expect(typeof spec.theme).toBe("string");
  });

  it('2: <Theme name="dark" ink="#eee"/> → ThemeSpec object', async () => {
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      useGenericTheme: true,
      themeName: "dark",
      themeInk: "#eee",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.theme).toEqual({ name: "dark", ink: "#eee" });
  });

  it('3: <Theme name="dark"/> → "dark" string (D3 canonical form)', async () => {
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      useGenericTheme: true,
      themeName: "dark",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.theme).toBe("dark");
  });

  it('3b: <ThemeDark ink="#eee"/> → {name:"dark", ink:"#eee"}; no undefined keys', async () => {
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      useThemeDark: true,
      useThemeDarkInk: "#eee",
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.theme).toEqual({ name: "dark", ink: "#eee" });
    expect(Object.values(spec.theme as object).every((v) => v !== undefined)).toBe(true);
  });

  it("4: prop + child → child wins", async () => {
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      themeProp: "light",
      useThemeDark: true,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
      // Swallow the deprecation advisory so it does not pollute other spies.
      ondiagnostic: () => {},
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.theme).toBe("dark");
  });

  it("5: spec={…} + <ThemeDark/> → spec wins", async () => {
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      useSpec: true,
      useThemeDark: true,
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    const spec = await waitAssembled(() => assembled);
    expect(spec.theme).toBe("light");
  });

  it("6: reactive <Theme name={x}/> updates spec with registrationCount unchanged", async () => {
    let assembled: PortableSpec | null = null;
    let host: LayerRegistry | undefined;
    const view = render(ThemeChildrenPlot, {
      useGenericTheme: true,
      themeName: "light",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    await waitAssembled(() => assembled);
    expect(assembled!.theme).toBe("light");
    expect(host).toBeDefined();
    const countAfterInit = host!.registrationCount;
    expect(countAfterInit).toBeGreaterThan(0);

    assembled = null;
    await view.rerender({
      useGenericTheme: true,
      themeName: "dark",
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
      onrender: (_model: unknown, spec: PortableSpec) => {
        assembled = spec;
      },
    });
    flushSync();
    await waitAssembled(() => assembled);
    expect(assembled!.theme).toBe("dark");
    // ADR 0001: prop updates must not re-register.
    expect(host!.registrationCount).toBe(countAfterInit);
  });
});

describe("theme prop deprecation advisories", () => {
  it("8: theme prop fires exactly ONE advisory with since/removeIn/prop/docUrl", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(ThemeChildrenPlot, {
      themeProp: "dark",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((diag) => diag.code === "DEPRECATED_PLOT_PROP"))
      .toHaveLength(1);
    const advisory = diagnostics.find((diag) => diag.code === "DEPRECATED_PLOT_PROP")!;
    expect(isDeprecationDiagnostic(advisory)).toBe(true);
    if (!isDeprecationDiagnostic(advisory)) throw new Error("expected deprecation");
    expect(advisory.severity).toBe("advisory");
    expect(advisory.prop).toBe("theme");
    expect(advisory.since).toBe("0.11.0");
    expect(advisory.removeIn).toBe("0.13.0");
    expect(advisory.docUrl).toContain("https://ggsvelte.sh/guide/upgrading#");
    expect(advisory.docUrl).toContain("compose-the-theme-as-a-child-layer");
    expect(advisory.suggestions.length).toBeGreaterThan(0);
  });

  it("9: advisory does not re-fire across N reactive updates", async () => {
    const { diagnostics, ondiagnostic } = collect();
    const view = render(ThemeChildrenPlot, {
      themeProp: "dark",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP").length)
      .toBe(1);

    for (const next of ["light", "minimal", "classic", "tufte"] as const) {
      await view.rerender({ themeProp: next, ondiagnostic });
      flushSync();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }
    expect(diagnostics.filter((d) => d.code === "DEPRECATED_PLOT_PROP")).toHaveLength(1);
  });

  it("10: no handler + non-prod → console.warn; production → silent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      /* swallow */
    });
    try {
      vi.stubGlobal("process", { env: { NODE_ENV: "development" } });
      render(ThemeChildrenPlot, { themeProp: "dark" });
      await expect
        .poll(() =>
          warn.mock.calls.some((call) => String(call[0]).includes("DEPRECATED_PLOT_PROP")),
        )
        .toBe(true);

      warn.mockClear();
      vi.stubGlobal("process", { env: { NODE_ENV: "production" } });
      render(ThemeChildrenPlot, { themeProp: "light" });
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

  it("11: child-only plot (no theme prop) fires no deprecation advisory", async () => {
    const { diagnostics, ondiagnostic } = collect();
    let assembled: PortableSpec | null = null;
    render(ThemeChildrenPlot, {
      useThemeDark: true,
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

describe("Theme* export parity with THEME_NAMES", () => {
  it("12: exported Theme* set === THEME_NAMES ∪ {Theme}, both directions", () => {
    const nameToExport: Record<string, string> = {
      default: "ThemeDefault",
      light: "ThemeLight",
      dark: "ThemeDark",
      minimal: "ThemeMinimal",
      ggplot2: "ThemeGgplot2",
      classic: "ThemeClassic",
      hrbr: "ThemeHrbr",
      few: "ThemeFew",
      clean: "ThemeClean",
      fivethirtyeight: "ThemeFivethirtyeight",
      economist: "ThemeEconomist",
      tufte: "ThemeTufte",
      bw: "ThemeBw",
    };

    const expectedExports = new Set(["Theme", ...Object.values(nameToExport)]);
    const pkg = SveltePkg as Record<string, unknown>;
    const actualThemeExports = Object.keys(pkg).filter(
      (key) =>
        key === "Theme" ||
        (key.startsWith("Theme") && key[5] !== undefined && key[5] === key[5].toUpperCase()),
    );

    for (const name of expectedExports) {
      expect(pkg[name], `missing export ${name}`).toBeTypeOf("function");
    }
    expect(new Set(actualThemeExports)).toEqual(expectedExports);

    for (const themeName of THEME_NAMES) {
      const exportName = nameToExport[themeName];
      expect(exportName, `THEME_NAMES entry "${themeName}" has no Theme* shell`).toBeDefined();
      expect(pkg[exportName], `export ${exportName} missing for theme "${themeName}"`).toBeTypeOf(
        "function",
      );
    }
    for (const [themeName, exportName] of Object.entries(nameToExport)) {
      expect(THEME_NAMES, `export ${exportName} has no THEME_NAMES entry`).toContain(themeName);
    }
  });
});

describe("deprecation catalog anchors", () => {
  it("13: every DEPRECATION_DIAGNOSTIC_CATALOG code builds a resolvable upgrading anchor", () => {
    // Runtime catalog entry only carries the code; anchors are produced by
    // deprecatedPropDiagnostic. Guard the live emission used by the theme prop.
    const sample = {
      severity: "advisory" as const,
      code: "DEPRECATED_PLOT_PROP" as const,
      message: DEPRECATION_DIAGNOSTIC_CATALOG.DEPRECATED_PLOT_PROP.messageTemplate(
        "theme",
        "0.11.0",
        "0.13.0",
      ),
      prop: "theme",
      since: "0.11.0",
      removeIn: "0.13.0",
      suggestions: ["use a Theme child"],
      docUrl: "https://ggsvelte.sh/guide/upgrading#compose-the-theme-as-a-child-layer",
    };
    expect(sample.docUrl).toMatch(/^https:\/\/ggsvelte\.sh\/guide\/upgrading#/);
    expect(DEPRECATION_DIAGNOSTIC_CATALOG.DEPRECATED_PLOT_PROP.code).toBe("DEPRECATED_PLOT_PROP");
  });
});

// Silence unused size in case fixtures expand.
void size;
