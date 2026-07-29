/**
 * Theme children (#659 slice 2 / #704).
 * Covers registration/fold, D3 canonical form, live getters, and THEME_NAMES parity.
 * GGPlot `theme` prop removed in 0.13.0 — child layers only.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import { THEME_NAMES, type PortableSpec } from "../../src/lib/index.js";
import * as SveltePkg from "../../src/lib/index.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import ThemeChildrenPlot from "../fixtures/ThemeChildrenPlot.svelte";
import { render } from "../helpers/render.js";

async function waitAssembled(get: () => PortableSpec | null): Promise<PortableSpec> {
  await expect.poll(() => get() !== null).toBe(true);
  return get()!;
}

describe("Theme children → assembled PortableSpec", () => {
  it('1: <GeomPoint/> + <ThemeDark/> → spec.theme === "dark" string', async () => {
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

describe("Theme* export parity with THEME_NAMES", () => {
  it("12: exported Theme* set === THEME_NAMES ∪ {Theme}, both directions", () => {
    const nameToExport: Record<string, string> = {
      default: "ThemeDefault",
      light: "ThemeLight",
      dark: "ThemeDark",
      minimal: "ThemeMinimal",
      ggplot2: "ThemeGgplot2",
      classic: "ThemeClassic",
      bw: "ThemeBw",
      hrbr: "ThemeHrbr",
      few: "ThemeFew",
      clean: "ThemeClean",
      fivethirtyeight: "ThemeFivethirtyeight",
      economist: "ThemeEconomist",
      tufte: "ThemeTufte",
      linedraw: "ThemeLinedraw",
      void: "ThemeVoid",
      solarized: "ThemeSolarized",
      solarizeddark: "ThemeSolarizeddark",
      economist_white: "ThemeEconomistwhite",
      solarized_2: "ThemeSolarized2",
      solarized_2dark: "ThemeSolarized2dark",
      wsj: "ThemeWsj",
      gdocs: "ThemeGdocs",
      hc: "ThemeHc",
      hcdark: "ThemeHcdark",
      pander: "ThemePander",
      grey: "ThemeGrey",
      gray: "ThemeGray",
      test: "ThemeTest",
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
