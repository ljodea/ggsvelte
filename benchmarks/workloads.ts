/// <reference lib="dom" />
/**
 * Shared workload table for the benchmark suite. ONE source of truth for
 * three consumers:
 *
 * - `pipeline.bench.ts` (mitata full suite + BENCH_SMOKE) — groups/benches
 *   are rebuilt from this table with the exact pre-M3 labels.
 * - `bench-json.ts` (M3) — runs the full-size workloads with a bounded
 *   deterministic-ish loop and emits `bench-results.json` (repo root) in
 *   github-action-benchmark customSmallerIsBetter format.
 * - `check-budgets.ts` (M3) — gates those results against
 *   `budgets.json`; `Workload.id` is the stable identifier both files key on.
 *
 * Data is generated from a seeded PRNG so runs are comparable.
 */
import {
  buildCandidateStore,
  FONT_METRICS,
  MetricsTableMeasurer,
  planStrata,
  planTemporalAxis,
  renderToSVGString,
  runPipeline,
} from "@ggsvelte/core";
import { drawStratum } from "@ggsvelte/core/dom";
import { aes, gg, MAX_BINNED_BREAKS, scaleXBinned, scaleXContinuous } from "@ggsvelte/spec";
import type { PortableSpec } from "@ggsvelte/spec";

export interface Workload {
  /** Stable identifier for bench-results.json / budgets.json (M3 gating). */
  id: string;
  /** mitata group label (kept byte-identical to the pre-M3 suite). */
  group: string;
  /** mitata bench label (kept byte-identical to the pre-M3 suite). */
  bench: string;
  fn: () => unknown;
}

// Mulberry32 — deterministic data across runs/machines.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function temporalLineSpec(n: number): PortableSpec {
  const start = Date.UTC(1800, 0, 1);
  const date = Array.from<string>({ length: n });
  const value = Array.from<number>({ length: n });
  for (let index = 0; index < n; index++) {
    date[index] = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
    value[index] = 50 + Math.sin(index / 30) * 10;
  }
  return gg({ date, value }, aes({ x: "date", y: "value" }))
    .geomLine()
    .spec();
}

function temporalFreeFacetSpec(panelCount: number): PortableSpec {
  const panel = Array.from<string>({ length: panelCount * 2 });
  const date = Array.from<string>({ length: panelCount * 2 });
  const value = Array.from<number>({ length: panelCount * 2 });
  for (let index = 0; index < panelCount; index++) {
    const first = index * 2;
    panel[first] = `panel-${String(index).padStart(3, "0")}`;
    panel[first + 1] = panel[first]!;
    date[first] = `${String(1800 + (index % 100))}-01-01`;
    date[first + 1] = `${String(1925 + (index % 100))}-01-01`;
    value[first] = index;
    value[first + 1] = index + 1;
  }
  return gg({ panel, date, value }, aes({ x: "date", y: "value" }))
    .geomLine()
    .facet({ wrap: "panel", ncol: 10, scales: "free_x" })
    .spec();
}

function scatterSpec(n: number, render?: "svg" | "canvas"): PortableSpec {
  const rnd = mulberry32(0xbadc0de ^ n);
  const x = Array.from<number>({ length: n });
  const y = Array.from<number>({ length: n });
  const cls = Array.from<string>({ length: n });
  for (let i = 0; i < n; i++) {
    x[i] = rnd() * 100;
    y[i] = rnd() * 100;
    cls[i] = `series-${i % 5}`;
  }
  return gg({ x, y, cls }, aes({ x: "x", y: "y", color: "cls" }))
    .geomPoint({ size: 1.5, alpha: 0.7, ...(render !== undefined && { render }) })
    .spec();
}

/** PR 3 transform workload: positive data shared by identity/log10/sqrt. */
function transformedScatterSpec(n: number, transform: "identity" | "log10" | "sqrt"): PortableSpec {
  const x = Array.from<number>({ length: n });
  const y = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) {
    x[i] = 1 + (i % 10_000);
    y[i] = 1 + ((i * 17) % 10_000);
  }
  return gg({ x, y }, aes({ x: "x", y: "y" }))
    .geomPoint({ render: "canvas" })
    .scales(scaleXContinuous({ transform }))
    .spec();
}

function transformedStatsSpec(n: number, stat: "smooth" | "bin"): PortableSpec {
  const x = Array.from<number>({ length: n });
  const y = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) {
    x[i] = 1 + (i % 10_000);
    y[i] = 5 + Math.log10(x[i]!) * 3 + (i % 7) / 10;
  }
  if (stat === "smooth") {
    return gg({ x, y }, aes({ x: "x", y: "y" }))
      .geomSmooth({ method: "lm", se: false, n: 80 })
      .scales(scaleXContinuous({ transform: "log10" }))
      .spec();
  }
  return gg({ x }, aes({ x: "x" }))
    .geomHistogram({ binwidth: 0.25, boundary: 0 })
    .scales(scaleXContinuous({ transform: "log10" }))
    .spec();
}

function transformedFacetSpec(n: number, panels: number): PortableSpec {
  const x = Array.from<number>({ length: n });
  const y = Array.from<number>({ length: n });
  const panel = Array.from<string>({ length: n });
  for (let i = 0; i < n; i++) {
    x[i] = 1 + (i % 10_000);
    y[i] = 1 + ((i * 13) % 1_000);
    panel[i] = `panel-${i % panels}`;
  }
  return gg({ x, y, panel }, aes({ x: "x", y: "y" }))
    .geomPoint({ render: "canvas" })
    .facet({ wrap: "panel", ncol: 10 })
    .scales(scaleXContinuous({ transform: "log10" }))
    .spec();
}

function maxBoundaryBinnedSpec(n: number): PortableSpec {
  const x = Array.from<number>({ length: n }, (_, i) => (i % MAX_BINNED_BREAKS) + 0.5);
  const y = Array.from<number>({ length: n }, () => 1);
  const breaks = Array.from<number>({ length: MAX_BINNED_BREAKS + 1 }, (_, i) => i);
  return gg({ x, y }, aes({ x: "x", y: "y" }))
    .geomPoint({ render: "canvas" })
    .scales(scaleXBinned({ breaks }))
    .spec();
}

/** M2 workload: faceted bars, 50 panels (plan workload) — per-panel counts,
 *  stacks, and the facet grid layout all exercise the partitioned path. */
function facetedBarsSpec(): PortableSpec {
  const rnd = mulberry32(0xfa2e7);
  const n = 50 * 40;
  const cat = Array.from<string>({ length: n });
  const panel = Array.from<string>({ length: n });
  for (let p = 0; p < 50; p++) {
    for (let i = 0; i < 40; i++) {
      const j = p * 40 + i;
      panel[j] = `panel-${String(p).padStart(2, "0")}`;
      cat[j] = `c${Math.floor(rnd() * 5)}`;
    }
  }
  return gg({ cat, panel }, aes({ x: "cat" }))
    .geomBar()
    .facet({ wrap: "panel", ncol: 10 })
    .spec();
}

/**
 * Stub CanvasRenderingContext2D: measures the CANVAS COMMAND-GENERATION cost
 * of the batch renderers (JS-side), not rasterization — bun has no canvas.
 * Real paint cost is browser-side (component tests exercise it).
 */
function stubContext(): CanvasRenderingContext2D {
  const noop = (): void => {
    /* raster cost lives in the browser; this stub measures JS command cost */
  };
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "round",
    lineCap: "round",
    globalAlpha: 1,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    rect: noop,
    clip: noop,
    translate: noop,
    clearRect: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    setTransform: noop,
  } as unknown as CanvasRenderingContext2D;
}

/** M1 workload: stacked bars, 50 categories x 4 series (plan workload). */
function stackedBarSpec(): PortableSpec {
  const rnd = mulberry32(0x5eed);
  const category = Array.from<string>({ length: 200 });
  const series = Array.from<string>({ length: 200 });
  const value = Array.from<number>({ length: 200 });
  for (let c = 0; c < 50; c++) {
    for (let s = 0; s < 4; s++) {
      const i = c * 4 + s;
      category[i] = `cat-${String(c).padStart(2, "0")}`;
      series[i] = `series-${s}`;
      value[i] = rnd() * 100;
    }
  }
  return gg({ category, series, value }, aes({ x: "category", y: "value", fill: "series" }))
    .geomCol()
    .spec();
}

/** M1 workload: 10 line series x 10k points each (plan workload). */
function lineSeriesSpec(pointsPerSeries: number): PortableSpec {
  const rnd = mulberry32(0x11e5);
  const n = 10 * pointsPerSeries;
  const x = Array.from<number>({ length: n });
  const y = Array.from<number>({ length: n });
  const series = Array.from<string>({ length: n });
  for (let s = 0; s < 10; s++) {
    let level = rnd() * 100;
    for (let i = 0; i < pointsPerSeries; i++) {
      const j = s * pointsPerSeries + i;
      x[j] = i;
      level += rnd() - 0.5;
      y[j] = level;
      series[j] = `series-${s}`;
    }
  }
  return gg({ x, y, series }, aes({ x: "x", y: "y", color: "series" }))
    .geomLine()
    .spec();
}

/** M2 workload: histogram over n rows (stat bin dominates). */
function histogramSpec(n: number): PortableSpec {
  const rnd = mulberry32(0xb111 ^ n);
  const v = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) v[i] = (rnd() + rnd() + rnd() + rnd()) * 25;
  return gg({ v }, aes({ x: "v" }))
    .geomHistogram({ binwidth: 2, boundary: 0 })
    .spec();
}

/** M2 workload: loess smooth (+ se band) over n scatter rows.
 *  Documented cost: O(n·q) local fits for the exact statistics, q = span·n —
 *  quadratic in n; the 5k workload is the practical envelope (decision 0010). */
function loessSpec(n: number): PortableSpec {
  const rnd = mulberry32(0x10e55 ^ n);
  const x = Array.from<number>({ length: n });
  const y = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) {
    x[i] = rnd() * 100;
    y[i] = 20 + 0.8 * x[i]! - 0.006 * x[i]! * x[i]! + (rnd() - 0.5) * 8;
  }
  return gg({ x, y }, aes({ x: "x", y: "y" }))
    .geomSmooth({ method: "loess", span: 0.75 })
    .spec();
}

/** M2 workload: gaussian KDE over n rows (direct summation: 512·n kernel
 *  evaluations — exact, no FFT binning; decision 0010). */
function densitySpec(n: number): PortableSpec {
  const rnd = mulberry32(0xd317 ^ n);
  const v = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) v[i] = (rnd() + rnd() + rnd()) * 33;
  return gg({ v }, aes({ x: "v" }))
    .geomDensity()
    .spec();
}

/** "1000" -> "1k"; sub-1k counts (smoke loess) stay plain. */
function fmtK(n: number): string {
  return n >= 1000 ? `${n / 1000}k` : `${n}`;
}

const opts = { width: 800, height: 500, maxMarks: 200_000 };

/**
 * Build the workload list. `smoke` shrinks sizes (the CI bench-smoke job);
 * the JSON/budget path always uses `smoke = false` so ids are stable.
 * Order and labels mirror the pre-M3 mitata suite exactly.
 */
export function buildWorkloads(smoke: boolean): Workload[] {
  const workloads: Workload[] = [];
  const sizes = smoke ? [1_000] : [1_000, 10_000, 100_000];

  for (const n of sizes) {
    const spec = scatterSpec(n);
    const label = `${fmtK(n)} points`;
    workloads.push(
      {
        id: `pipeline scatter ${fmtK(n)}`,
        group: label,
        bench: `runPipeline ${label}`,
        fn: () => runPipeline(spec, opts),
      },
      {
        id: `svg render scatter ${fmtK(n)}`,
        group: label,
        bench: `renderToSVGString ${label}`,
        fn: () => renderToSVGString(spec, opts),
      },
    );
  }

  {
    const n = smoke ? 1_000 : 100_000;
    const spec = temporalLineSpec(n);
    workloads.push({
      id: `pipeline temporal-line ${fmtK(n)}`,
      group: `temporal line ${fmtK(n)}`,
      bench: `runPipeline temporal line ${fmtK(n)}`,
      fn: () => runPipeline(spec, opts),
    });
  }

  {
    const measurer = new MetricsTableMeasurer(FONT_METRICS);
    const input = {
      aesthetic: "x" as const,
      panelIndex: 0,
      domain: [Date.UTC(1800, 0, 1), Date.UTC(2100, 0, 1)] as const,
      kind: "date" as const,
      orient: "horizontal" as const,
      extentPx: 800,
      reverse: false,
      measurer,
      fontSize: 11.5,
      marginCapPx: 92,
      config: {},
    };
    const resizeInput = {
      ...input,
      domain: [Date.UTC(1835, 0, 1), Date.UTC(2025, 0, 1)] as const,
    };
    workloads.push(
      {
        id: "temporal guide candidate-selection 300y",
        group: "temporal guide candidate selection",
        bench: "planTemporalAxis 300-year domain",
        fn: () => planTemporalAxis(input),
      },
      {
        id: "temporal guide resize-churn 191y",
        group: "temporal guide responsive planning",
        bench: "planTemporalAxis 191-year resize sequence",
        fn: () => {
          let previousInterval: string | null | undefined;
          let result;
          for (const extentPx of [320, 640, 1_200, 640, 320]) {
            result = planTemporalAxis({
              ...resizeInput,
              extentPx,
              ...(previousInterval !== undefined && { previousInterval }),
            });
            previousInterval = result.interval;
          }
          return result;
        },
      },
      {
        id: "temporal guide DST-heavy 3y",
        group: "temporal guide zoned calendar planning",
        bench: "planTemporalAxis DST-heavy datetime domain",
        fn: () =>
          planTemporalAxis({
            ...input,
            domain: [Date.UTC(2022, 0, 1), Date.UTC(2025, 0, 1)],
            kind: "datetime",
            config: { timezone: "America/New_York", dateBreaks: "1 month" },
          }),
      },
    );
  }

  {
    const spec = temporalFreeFacetSpec(smoke ? 10 : 100);
    workloads.push({
      id: `pipeline temporal free-facets ${smoke ? "10" : "100"}`,
      group: `temporal free facets ${smoke ? "10" : "100"}`,
      bench: `runPipeline temporal free facets ${smoke ? "10" : "100"}`,
      fn: () => runPipeline(spec, { ...opts, width: 1_200, height: 900 }),
    });
  }

  {
    const spec = stackedBarSpec();
    workloads.push(
      {
        id: "pipeline stacked-bars 50x4",
        group: "stacked bars 50x4",
        bench: "runPipeline stacked bars 50x4",
        fn: () => runPipeline(spec, opts),
      },
      {
        id: "svg render stacked-bars 50x4",
        group: "stacked bars 50x4",
        bench: "renderToSVGString stacked bars 50x4",
        fn: () => renderToSVGString(spec, opts),
      },
    );
  }

  {
    const perSeries = smoke ? 1_000 : 10_000;
    const spec = lineSeriesSpec(perSeries);
    const label = `line series 10x${fmtK(perSeries)}`;
    workloads.push(
      {
        id: `pipeline line-series 10x${fmtK(perSeries)}`,
        group: label,
        bench: `runPipeline ${label}`,
        fn: () => runPipeline(spec, opts),
      },
      {
        id: `svg render line-series 10x${fmtK(perSeries)}`,
        group: label,
        bench: `renderToSVGString ${label}`,
        fn: () => renderToSVGString(spec, opts),
      },
    );
  }

  // --- M2 facet + canvas workloads ------------------------------------------
  {
    const spec = facetedBarsSpec();
    workloads.push(
      {
        id: "pipeline faceted-bars 50 panels",
        group: "faceted bars 50 panels",
        bench: "runPipeline faceted bars 50 panels",
        fn: () => runPipeline(spec, opts),
      },
      {
        id: "svg render faceted-bars 50 panels",
        group: "faceted bars 50 panels",
        bench: "renderToSVGString faceted bars 50 panels",
        fn: () => renderToSVGString(spec, opts),
      },
    );
  }

  {
    const n = smoke ? 1_000 : 100_000;
    const spec = scatterSpec(n, "canvas");
    const model = runPipeline(spec, opts);
    const strata = planStrata(model.scene, model.layerBackends);
    const canvasStratum = strata.find((s) => s.backend === "canvas");
    if (canvasStratum === undefined) throw new Error("expected a canvas stratum");
    const canvasBatches = canvasStratum.batches;
    const ctx = stubContext();
    const resolve = (c: string) => c;
    const label = fmtK(n);
    const groupLabel = `canvas scatter ${label} (stub ctx: JS command cost, no raster)`;
    workloads.push(
      {
        id: `canvas cold scatter ${label}`,
        group: groupLabel,
        bench: `canvas cold ${label} (pipeline + plan + draw + candidate index)`,
        fn: () => {
          const m = runPipeline(spec, opts);
          const plan = planStrata(m.scene, m.layerBackends);
          for (const stratum of plan) {
            if (stratum.backend === "canvas") drawStratum(ctx, m.scene, stratum.batches, resolve);
          }
          m.candidates.hitTest(400, 250);
        },
      },
      {
        id: `canvas redraw scatter ${label}`,
        group: groupLabel,
        bench: `canvas redraw ${label} (drawStratum only)`,
        fn: () => {
          drawStratum(ctx, model.scene, canvasBatches, resolve);
        },
      },
      {
        id: `hit-index build ${label}`,
        group: groupLabel,
        bench: `candidate index build ${label} points`,
        fn: () => buildCandidateStore(model.scene).hitTest(400, 250),
      },
      {
        id: `candidate lookup ${label}`,
        group: groupLabel,
        bench: `candidate nearest/group/rect ${label}`,
        fn: () => {
          const match = model.candidates.nearest(400, 250, { mode: "xy", maxDistance: 32 });
          if (match !== null && match.xToken !== null) model.candidates.group(match.id, "x");
          model.candidates.queryRect(200, 125, 600, 375);
        },
      },
    );
  }

  // --- PR 3 pre-stat transform and binned-family workloads ------------------
  {
    const n = smoke ? 1_000 : 100_000;
    for (const transform of ["identity", "log10", "sqrt"] as const) {
      const spec = transformedScatterSpec(n, transform);
      workloads.push({
        id: `pipeline transform-${transform} ${fmtK(n)}`,
        group: `position transform ${transform} ${fmtK(n)}`,
        bench: `runPipeline transform ${transform} ${fmtK(n)}`,
        fn: () => runPipeline(spec, opts),
      });
    }
    for (const stat of ["smooth", "bin"] as const) {
      const spec = transformedStatsSpec(n, stat);
      workloads.push({
        id: `pipeline transform-log10 ${stat} ${fmtK(n)}`,
        group: `pre-stat log10 ${stat} ${fmtK(n)}`,
        bench: `runPipeline log10 ${stat} ${fmtK(n)}`,
        fn: () => runPipeline(spec, opts),
      });
    }
    const facets = transformedFacetSpec(n, smoke ? 10 : 100);
    workloads.push({
      id: `pipeline transform-log10 facets-${smoke ? "10" : "100"} ${fmtK(n)}`,
      group: `shared transform cache ${smoke ? "10" : "100"} facets ${fmtK(n)}`,
      bench: `runPipeline log10 shared facets ${fmtK(n)}`,
      fn: () => runPipeline(facets, { ...opts, width: 1_200, height: 900 }),
    });
    const binned = maxBoundaryBinnedSpec(n);
    workloads.push({
      id: `pipeline binned-${MAX_BINNED_BREAKS} ${fmtK(n)}`,
      group: `binned ${MAX_BINNED_BREAKS} boundaries ${fmtK(n)}`,
      bench: `runPipeline max-boundary binned ${fmtK(n)}`,
      fn: () => runPipeline(binned, opts),
    });
  }

  // --- M2 statistical workloads (plan: bin 100k, loess 5k, density 100k) ----
  {
    const n = smoke ? 1_000 : 100_000;
    const spec = histogramSpec(n);
    workloads.push({
      id: `pipeline histogram ${fmtK(n)}`,
      group: `histogram ${fmtK(n)}`,
      bench: `runPipeline histogram ${fmtK(n)}`,
      fn: () => runPipeline(spec, opts),
    });
  }

  {
    const n = smoke ? 500 : 5_000;
    const spec = loessSpec(n);
    workloads.push({
      id: `pipeline loess ${fmtK(n)}`,
      group: `loess smooth ${n} rows`,
      bench: `runPipeline loess+se ${n} rows`,
      fn: () => runPipeline(spec, opts),
    });
  }

  {
    const n = smoke ? 1_000 : 100_000;
    const spec = densitySpec(n);
    workloads.push({
      id: `pipeline density ${fmtK(n)}`,
      group: `density ${fmtK(n)}`,
      bench: `runPipeline density ${fmtK(n)}`,
      fn: () => runPipeline(spec, opts),
    });
  }

  return workloads;
}
