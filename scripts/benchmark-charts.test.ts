/**
 * Homepage bench cards: band domain is always speed order, and the tab
 * list stays Area → Bars → Line → Line 100k → Scatter → Scatter 10k.
 */
import { describe, expect, it } from "bun:test";

import { benchmarkChartSpec } from "../apps/docs/src/lib/benchmarks/charts.ts";
import { BENCHMARK_CHART_CARDS } from "../apps/docs/src/lib/generated/benchmark-charts.ts";

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
});
