/**
 * Theme* shell parity: every THEME_NAMES entry has a named <Theme*> export
 * that registers a theme layer whose value is that name (no role overrides).
 *
 * Export-name inventory already lives in theme-children.test.ts. This suite
 * mounts each shell under a registry host so the shell modules and factory
 * path run — export-only checks leave Theme* at 0% coverage.
 */
import type { Component } from "svelte";
import { describe, expect, it } from "vitest";

import { THEME_NAMES, type ThemeName } from "../../src/lib/index.js";
import * as SveltePkg from "../../src/lib/index.js";
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";
import GeomRegistryHost from "../fixtures/GeomRegistryHost.svelte";
import { render } from "../helpers/render.js";

/** THEME_NAMES entry → package export (same map as theme-children export parity). */
const nameToExport: Record<ThemeName, string> = {
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
  stata: "ThemeStata",
  stata_s1color: "ThemeStatas1color",
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
  base: "ThemeBase",
  igray: "ThemeIgray",
  map: "ThemeMap",
  solid: "ThemeSolid",
  grey: "ThemeGrey",
  gray: "ThemeGray",
  test: "ThemeTest",
};

async function waitThemeLayer(get: () => LayerRegistry | undefined): Promise<LayerRegistry> {
  await expect.poll(() => get() !== undefined).toBe(true);
  await expect
    .poll(() => get()?.layers.some((layer) => layer.kind === "theme") ?? false)
    .toBe(true);
  return get()!;
}

describe("theme-child parity (all THEME_NAMES shells)", () => {
  it(`THEME_NAMES has ${String(THEME_NAMES.length)} entries`, () => {
    expect(THEME_NAMES.length).toBeGreaterThan(0);
    expect(Object.keys(nameToExport)).toHaveLength(THEME_NAMES.length);
  });

  for (const themeName of THEME_NAMES) {
    const exportName = nameToExport[themeName];
    it(`${exportName} registers theme value "${themeName}"`, async () => {
      const Shell = (SveltePkg as Record<string, unknown>)[exportName] as Component | undefined;
      expect(Shell, `export ${exportName}`).toBeTypeOf("function");

      let host: LayerRegistry | undefined;
      render(GeomRegistryHost, {
        Shell,
        shellProps: {},
        captureRegistry: (registry: LayerRegistry) => {
          host = registry;
        },
      });

      const registry = await waitThemeLayer(() => host);
      const themeLayers = registry.layers.filter((layer) => layer.kind === "theme");
      expect(themeLayers).toHaveLength(1);
      expect(themeLayers[0]?.value).toBe(themeName);
    });
  }

  it('<Theme ink="#eee"/> registers a ThemeSpec object with only defined keys', async () => {
    const Theme = (SveltePkg as Record<string, unknown>).Theme as Component;
    let host: LayerRegistry | undefined;
    render(GeomRegistryHost, {
      Shell: Theme,
      shellProps: { name: "dark", ink: "#eee" },
      captureRegistry: (registry: LayerRegistry) => {
        host = registry;
      },
    });
    const registry = await waitThemeLayer(() => host);
    const theme = registry.layers.find((layer) => layer.kind === "theme");
    expect(theme?.value).toEqual({ name: "dark", ink: "#eee" });
    expect(Object.values(theme!.value as object).every((v) => v !== undefined)).toBe(true);
  });
});
