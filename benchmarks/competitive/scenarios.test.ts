import { describe, expect, test } from "bun:test";

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
});
