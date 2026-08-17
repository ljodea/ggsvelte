/**
 * Homepage bench cards: band domain is always speed order, and the tab
 * list stays Area → Bars → Line → Line 100k → Scatter → Scatter 10k.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import { benchmarkChartSrc } from "../apps/docs/src/lib/benchmarks/asset-url.ts";
import { benchmarkChartSpec, benchmarkChartSvg } from "../apps/docs/src/lib/benchmarks/charts.ts";
import { BENCHMARK_CHART_CARDS } from "../apps/docs/src/lib/generated/benchmark-charts.ts";

const STATIC_BENCHMARKS = join(import.meta.dir, "..", "apps", "docs", "static", "benchmarks");

/** Tick titles from top to bottom (`translate(0, y)` on `.gg-tick`). */
function tickTitlesTopToBottom(svg: string): readonly string[] {
  return [...svg.matchAll(/transform="translate\(0,([0-9.]+)\)"><title>([^<]*)<\/title>/g)]
    .map((match) => ({ y: Number(match[1]), title: match[2]! }))
    .toSorted((a, b) => a.y - b.y)
    .map((tick) => tick.title);
}

function bandX(spec: ReturnType<typeof benchmarkChartSpec>) {
  const x = spec.scales?.x;
  if (x === undefined) {
    throw new Error("benchmark spec is missing scales.x");
  }
  return x;
}

describe("benchmarkChartSpec band order", () => {
  it("pins the x-band domain by ascending value so the fastest bar is on top after coord flip", () => {
    const spec = benchmarkChartSpec({
      id: "order-test",
      bars: [
        { lib: "LayerCake", value: 54.7, kind: "peer", label: "54.7 ms" },
        { lib: "TanStack", value: 51.2, kind: "peer", label: "51.2 ms" },
        { lib: "ggsvelte", value: 15.8, kind: "ggsvelte", label: "15.8 ms" },
        { lib: "SveltePlot", value: 647.6, kind: "peer", label: "647.6 ms" },
        { lib: "Unovis", value: 173.7, kind: "peer", label: "173.7 ms" },
      ],
      title: "order test",
      subtitle: "Cold-mount milliseconds · lower is better",
      ariaLabel: "order test",
    });
    const x = bandX(spec);
    expect(x.domain).toEqual(["ggsvelte", "TanStack", "LayerCake", "Unovis", "SveltePlot"]);
    expect(x.reverse).toBe(true);
  });

  it("breaks equal values by library name so the domain stays stable", () => {
    const spec = benchmarkChartSpec({
      id: "tie-test",
      bars: [
        { lib: "Zebra", value: 10, kind: "peer", label: "10 ms" },
        { lib: "Alpha", value: 10, kind: "peer", label: "10 ms" },
      ],
      title: "tie",
      subtitle: "s",
      ariaLabel: "a",
    });
    expect(bandX(spec).domain).toEqual(["Alpha", "Zebra"]);
  });

  it("renders those domain values from fastest at the top after coord flip", () => {
    const bars = [
      { lib: "LayerCake", value: 54.7, kind: "peer" as const, label: "54.7 ms" },
      { lib: "TanStack", value: 51.2, kind: "peer" as const, label: "51.2 ms" },
      { lib: "ggsvelte", value: 15.8, kind: "ggsvelte" as const, label: "15.8 ms" },
      { lib: "SveltePlot", value: 647.6, kind: "peer" as const, label: "647.6 ms" },
      { lib: "Unovis", value: 173.7, kind: "peer" as const, label: "173.7 ms" },
    ];
    const svg = benchmarkChartSvg(
      {
        id: "order-render",
        bars,
        title: "order test",
        subtitle: "Cold-mount milliseconds · lower is better",
        ariaLabel: "order test",
      },
      { width: 560, height: 335 },
    );
    expect(tickTitlesTopToBottom(svg)).toEqual([
      "ggsvelte",
      "TanStack",
      "LayerCake",
      "Unovis",
      "SveltePlot",
    ]);
  });
});

describe("committed bench SVGs", () => {
  it("draw the 1,000-point scatter ticks fastest to slowest, top to bottom", () => {
    const svg = readFileSync(join(STATIC_BENCHMARKS, "bench-scatter-1k-mount.svg"), "utf8");
    expect(tickTitlesTopToBottom(svg)).toEqual([
      "ggsvelte",
      "ECharts",
      "LayerCake",
      "TanStack",
      "Unovis",
      "SveltePlot",
    ]);
  });

  it("draw every card's ticks in increasing mount time, top to bottom", () => {
    for (const card of BENCHMARK_CHART_CARDS) {
      const filename = card.path.replace("/benchmarks/", "");
      const svg = readFileSync(join(STATIC_BENCHMARKS, filename), "utf8");
      const titles = tickTitlesTopToBottom(svg);
      expect(titles.length, card.id).toBeGreaterThan(1);
      const values = [...svg.matchAll(/y="([0-9.]+)"[^>]*>(([0-9][0-9.,]*) ms)</g)]
        .map((match) => ({ y: Number(match[1]), value: Number(match[3]!.replaceAll(",", "")) }))
        .toSorted((a, b) => a.y - b.y)
        .map((row) => row.value);
      expect(values.length, card.id).toBe(titles.length);
      expect(values, card.id).toEqual([...values].toSorted((a, b) => a - b));
    }
  });
});

describe("benchmarkChartSrc", () => {
  it("appends the SVG sha so a regen busts the docs-site cache", () => {
    expect(
      benchmarkChartSrc(
        "/benchmarks/bench-scatter-1k-mount.svg",
        "fd2cb838c7c94b785796e5521f4920fb7ac75ecebced390e87789db548ee9df1",
      ),
    ).toBe(
      "/benchmarks/bench-scatter-1k-mount.svg?v=fd2cb838c7c94b785796e5521f4920fb7ac75ecebced390e87789db548ee9df1",
    );
  });
});

describe("homepage bench tabs", () => {
  it("lists Area, Bars, Line, Line 100k, Scatter, Scatter 10k and omits Scatter 100k", () => {
    expect(BENCHMARK_CHART_CARDS.map((card) => card.tab)).toEqual([
      "Area",
      "Bars",
      "Line",
      "Line 100k",
      "Scatter",
      "Scatter 10k",
    ]);
  });

  it("names ECharts on every default-matrix card and keeps it off the Line 100k form-factor card", () => {
    for (const card of BENCHMARK_CHART_CARDS) {
      if (card.id === "line-100k-mount") {
        expect(card.alt).not.toContain("ECharts");
      } else {
        expect(card.alt).toContain("ECharts");
      }
    }
  });

  it("keeps README image alts in lockstep with the default-matrix cards", () => {
    const readme = readFileSync(join(import.meta.dir, "..", "README.md"), "utf8");
    for (const card of BENCHMARK_CHART_CARDS) {
      if (card.id === "line-100k-mount") continue;
      expect(readme).toContain(`![${card.alt}](apps/docs/static/benchmarks/bench-${card.id}.svg)`);
    }
  });
});
