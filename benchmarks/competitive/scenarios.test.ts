import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import {
  CASES,
  casesForRun,
  dataForCase,
  LIBS,
  libSupports,
  makeMultiSeries,
  makeScatter,
  makeStackedBars,
} from "./scenarios";

describe("competitive scenario catalog", () => {
  test("has multiple geom families (not just scatter)", () => {
    const scenarios = new Set(CASES.map((c) => c.scenario));
    expect(scenarios.has("scatter-color")).toBe(true);
    expect(scenarios.has("line-multiseries")).toBe(true);
    expect(scenarios.has("area-multiseries")).toBe(true);
    expect(scenarios.has("bars-stacked")).toBe(true);
  });

  test("includes uPlot-scale multi-series case", () => {
    const uplotScale = CASES.find((c) => c.id === "line-3x55k");
    expect(uplotScale).toBeDefined();
    expect(uplotScale!.n).toBe(166_650);
    expect(uplotScale!.defaultBrowser).toBe(false);
  });

  test("default browser matrix is multi-scenario and multi-size", () => {
    const defaults = casesForRun(false);
    const scenarios = new Set(defaults.map((c) => c.scenario));
    expect(scenarios.size).toBeGreaterThanOrEqual(3);
    expect(defaults.length).toBeGreaterThanOrEqual(5);
  });

  test("competitor set includes non-Svelte generalists", () => {
    const ids = new Set(LIBS.map((l) => l.id));
    expect(ids.has("uplot")).toBe(true);
    expect(ids.has("chartjs")).toBe(true);
    expect(ids.has("echarts")).toBe(true);
    expect(ids.has("d3")).toBe(true);
    expect(ids.has("ggsvelte-svg")).toBe(true);
    expect(ids.has("ggsvelte-canvas")).toBe(true);
  });

  test("Svelte peers remain for bundle comparison", () => {
    const ids = new Set(LIBS.map((l) => l.id));
    expect(ids.has("svelteplot")).toBe(true);
    expect(ids.has("layercake")).toBe(true);
  });

  test("data generators are deterministic and sized correctly", () => {
    const a = makeScatter(100);
    const b = makeScatter(100);
    expect(a.x).toEqual(b.x);
    expect(a.x).toHaveLength(100);

    const line = makeMultiSeries(3, 55_550);
    expect(line.x).toHaveLength(166_650);
    expect(new Set(line.series).size).toBe(3);

    const bars = makeStackedBars(50, 4);
    expect(bars.category).toHaveLength(200);
  });

  test("dataForCase covers every catalog entry", () => {
    for (const c of CASES) {
      const data = dataForCase(c);
      if (c.scenario === "scatter-color") {
        expect("cls" in data).toBe(true);
        expect((data as { x: number[] }).x).toHaveLength(c.n);
      } else if (c.scenario === "bars-stacked") {
        expect("stack" in data).toBe(true);
      } else {
        expect("series" in data).toBe(true);
        expect((data as { x: number[] }).x).toHaveLength(c.n);
      }
    }
  });

  test("browser libs support line + scatter at minimum", () => {
    const browser = LIBS.filter((l) => l.browser);
    for (const lib of browser) {
      if (lib.id === "ggsvelte-canvas") {
        expect(libSupports(lib, "scatter-color")).toBe(true);
        expect(libSupports(lib, "line-multiseries")).toBe(true);
        continue;
      }
      expect(libSupports(lib, "scatter-color")).toBe(true);
      expect(libSupports(lib, "line-multiseries")).toBe(true);
    }
  });

  test("area-multiseries ggsvelte adapters force identity position (fair vs competitors) (#1357)", () => {
    // Competitors draw overlaid areas; geomArea defaults to stack.
    const svg = readFileSync(new URL("./adapters/ggsvelte-svg.ts", import.meta.url), "utf8");
    const canvas = readFileSync(new URL("./adapters/ggsvelte-canvas.ts", import.meta.url), "utf8");
    expect(svg).toMatch(/geomArea\(\s*\{\s*position:\s*["']identity["']/);
    expect(canvas).toMatch(/geomArea\(\s*\{[^}]*position:\s*["']identity["']/s);
  });

  test("SSR bench entries exist for ggsvelte + both Svelte peers (server-render matrix cannot collapse)", () => {
    for (const lib of ["ggsvelte", "svelteplot", "layercake"]) {
      for (const scenario of ["scatter-color", "line-multiseries"]) {
        expect(existsSync(new URL(`./entries/ssr__${lib}__${scenario}.ts`, import.meta.url))).toBe(
          true,
        );
      }
    }
  });

  test("SSR bench keeps the empty-shell guard plus the SveltePlot capability record", () => {
    // minMarks: an unexpected empty server render fails loudly (no silent
    // throughput "win"). expectEmptyShell/ssrCapable: SveltePlot's documented
    // client-only mark rendering is recorded as a capability gap, not a 0 bar.
    const src = readFileSync(new URL("./measure-ssr.ts", import.meta.url), "utf8");
    expect(src).toMatch(/minMarks/);
    expect(src).toMatch(/expectEmptyShell/);
    expect(src).toMatch(/ssrCapable/);
  });

  test("browser harness does not re-sample replace as a second mount loop (#1357)", () => {
    // replaceLib is a full remount alias of mountLib; re-running medianMs doubles
    // wall time with no new information until in-place setData exists.
    const harness = readFileSync(new URL("./measure-browser.ts", import.meta.url), "utf8");
    expect(harness).not.toMatch(/competitiveBench\.replace/);
    expect(harness).toMatch(/replaceMedianMs:\s*mountStats\.median|replaceMedianMs:\s*mountStats/);
  });
});
