import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildWorkloads } from "./workloads";

const SMOKE_CATALOG = [
  { id: "pipeline scatter 1k", group: "1k points", bench: "runPipeline 1k points" },
  { id: "svg render scatter 1k", group: "1k points", bench: "renderToSVGString 1k points" },
  {
    id: "pipeline temporal-line 1k",
    group: "temporal line 1k",
    bench: "runPipeline temporal line 1k",
  },
  {
    id: "temporal guide candidate-selection 300y",
    group: "temporal guide candidate selection",
    bench: "planTemporalAxis 300-year domain",
  },
  {
    id: "temporal guide resize-churn 191y",
    group: "temporal guide responsive planning",
    bench: "planTemporalAxis 191-year resize sequence",
  },
  {
    id: "temporal guide DST-heavy 3y",
    group: "temporal guide zoned calendar planning",
    bench: "planTemporalAxis DST-heavy datetime domain",
  },
  {
    id: "pipeline temporal free-facets 10",
    group: "temporal free facets 10",
    bench: "runPipeline temporal free facets 10",
  },
  {
    id: "pipeline stacked-bars 50x4",
    group: "stacked bars 50x4",
    bench: "runPipeline stacked bars 50x4",
  },
  {
    id: "svg render stacked-bars 50x4",
    group: "stacked bars 50x4",
    bench: "renderToSVGString stacked bars 50x4",
  },
  {
    id: "pipeline line-series 10x1k",
    group: "line series 10x1k",
    bench: "runPipeline line series 10x1k",
  },
  {
    id: "svg render line-series 10x1k",
    group: "line series 10x1k",
    bench: "renderToSVGString line series 10x1k",
  },
  {
    id: "pipeline faceted-bars 50 panels",
    group: "faceted bars 50 panels",
    bench: "runPipeline faceted bars 50 panels",
  },
  {
    id: "svg render faceted-bars 50 panels",
    group: "faceted bars 50 panels",
    bench: "renderToSVGString faceted bars 50 panels",
  },
  {
    id: "canvas cold scatter 1k",
    group: "canvas scatter 1k (stub ctx: JS command cost, no raster)",
    bench: "canvas cold 1k (pipeline + plan + draw + candidate index)",
  },
  {
    id: "canvas redraw scatter 1k",
    group: "canvas scatter 1k (stub ctx: JS command cost, no raster)",
    bench: "canvas redraw 1k (drawStratum only)",
  },
  {
    id: "hit-index build 1k",
    group: "canvas scatter 1k (stub ctx: JS command cost, no raster)",
    bench: "candidate index build 1k points",
  },
  {
    id: "candidate lookup 1k",
    group: "canvas scatter 1k (stub ctx: JS command cost, no raster)",
    bench: "candidate nearest/group/rect 1k",
  },
  {
    id: "pipeline transform-identity 1k",
    group: "position transform identity 1k",
    bench: "runPipeline transform identity 1k",
  },
  {
    id: "pipeline transform-log10 1k",
    group: "position transform log10 1k",
    bench: "runPipeline transform log10 1k",
  },
  {
    id: "pipeline transform-sqrt 1k",
    group: "position transform sqrt 1k",
    bench: "runPipeline transform sqrt 1k",
  },
  {
    id: "pipeline transform-log10 smooth 1k",
    group: "pre-stat log10 smooth 1k",
    bench: "runPipeline log10 smooth 1k",
  },
  {
    id: "pipeline transform-log10 bin 1k",
    group: "pre-stat log10 bin 1k",
    bench: "runPipeline log10 bin 1k",
  },
  {
    id: "pipeline transform-log10 facets-10 1k",
    group: "shared transform cache 10 facets 1k",
    bench: "runPipeline log10 shared facets 1k",
  },
  {
    id: "pipeline binned-64 1k",
    group: "binned 64 boundaries 1k",
    bench: "runPipeline max-boundary binned 1k",
  },
  {
    id: "pipeline coord-identity points 1k",
    group: "post-stat coordinate identity 1k",
    bench: "runPipeline coord identity points 1k",
  },
  {
    id: "pipeline coord-log10 points 1k",
    group: "post-stat coordinate log10 1k",
    bench: "runPipeline coord log10 points 1k",
  },
  {
    id: "pipeline coord-tessellation 1k",
    group: "post-stat coordinate tessellation 1k",
    bench: "runPipeline worst-case coord tessellation 1k",
  },
  {
    id: "pipeline color-log10 1k",
    group: "non-position color log10 1k",
    bench: "runPipeline color log10 1k",
  },
  {
    id: "pipeline color-binned 1k",
    group: "non-position color binned 1k",
    bench: "runPipeline color binned 1k",
  },
  {
    id: "pipeline color-manual 1k",
    group: "non-position color manual 1k",
    bench: "runPipeline color manual 1k",
  },
  {
    id: "pipeline mapped-style 1k",
    group: "mapped style vectors 1k",
    bench: "runPipeline mapped style vectors 1k",
  },
  {
    id: "pipeline responsive-guides resize 1k",
    group: "responsive guide resize 1k",
    bench: "runPipeline responsive guide resize 1k",
  },
  {
    id: "pipeline coord-fixed resize 1k",
    group: "fixed-aspect resize 1k",
    bench: "runPipeline coord_fixed resize 1k",
  },
  { id: "pipeline histogram 1k", group: "histogram 1k", bench: "runPipeline histogram 1k" },
  {
    id: "pipeline loess 500",
    group: "loess smooth 500 rows",
    bench: "runPipeline loess+se 500 rows",
  },
  { id: "pipeline density 1k", group: "density 1k", bench: "runPipeline density 1k" },
] as const;

// Documented full-size catalog ids. Must match budgets.json and
// `buildWorkloads(false)` (verified under WORKLOAD_FULL_CATALOG=1).
// Regenerate:
//   bun -e 'import { buildWorkloads } from "./benchmarks/workloads/index.ts";
//     console.log(JSON.stringify(buildWorkloads(false).map(w => w.id), null, 2))'
const FULL_CATALOG_IDS = [
  "pipeline scatter 1k",
  "svg render scatter 1k",
  "pipeline scatter 10k",
  "svg render scatter 10k",
  "pipeline scatter 100k",
  "svg render scatter 100k",
  "pipeline temporal-line 100k",
  "temporal guide candidate-selection 300y",
  "temporal guide resize-churn 191y",
  "temporal guide DST-heavy 3y",
  "pipeline temporal free-facets 100",
  "pipeline stacked-bars 50x4",
  "svg render stacked-bars 50x4",
  "pipeline line-series 10x10k",
  "svg render line-series 10x10k",
  "pipeline faceted-bars 50 panels",
  "svg render faceted-bars 50 panels",
  "canvas cold scatter 100k",
  "canvas redraw scatter 100k",
  "hit-index build 100k",
  "candidate lookup 100k",
  "pipeline transform-identity 100k",
  "pipeline transform-log10 100k",
  "pipeline transform-sqrt 100k",
  "pipeline transform-log10 smooth 100k",
  "pipeline transform-log10 bin 100k",
  "pipeline transform-log10 facets-100 100k",
  "pipeline binned-64 100k",
  "pipeline coord-identity points 100k",
  "pipeline coord-log10 points 100k",
  "pipeline coord-tessellation 10k",
  "pipeline color-log10 100k",
  "pipeline color-binned 100k",
  "pipeline color-manual 100k",
  "pipeline mapped-style 100k",
  "pipeline responsive-guides resize 10k",
  "pipeline coord-fixed resize 10k",
  "pipeline histogram 100k",
  "pipeline loess 5k",
  "pipeline density 100k",
] as const;

function catalogMeta(workloads: ReturnType<typeof buildWorkloads>) {
  return workloads.map(({ id, group, bench }) => ({ id, group, bench }));
}

describe("buildWorkloads catalog", () => {
  // Default suite uses smoke only: full catalog eagerly builds many 100k
  // fixtures and runs a 100k canvas pipeline/plan during construction.
  const smoke = buildWorkloads(true);

  it("freezes smoke (id, group, bench) order and labels", () => {
    expect(catalogMeta(smoke)).toEqual([...SMOKE_CATALOG]);
  });

  it("returns runnable workload shape", () => {
    for (const workload of smoke) {
      expect(workload.id.length).toBeGreaterThan(0);
      expect(workload.group.length).toBeGreaterThan(0);
      expect(workload.bench.length).toBeGreaterThan(0);
      expect(typeof workload.fn).toBe("function");
    }
  });

  it("wires each smoke workload fn without throwing", () => {
    // Exercises the registry seam (which factory/opts each id closes over)
    // without paying for full-size fixtures in the default unit-test job.
    for (const workload of smoke) {
      expect(() => workload.fn(), workload.id).not.toThrow();
    }
  });

  it("keeps budgets.json aligned with the documented full catalog", () => {
    const budgetsPath = fileURLToPath(new URL("./budgets.json", import.meta.url));
    const parsed = JSON.parse(readFileSync(budgetsPath, "utf8")) as {
      budgets: Record<string, { budgetMs: number }>;
    };
    const budgetIds = Object.keys(parsed.budgets);
    expect(budgetIds.toSorted()).toEqual([...FULL_CATALOG_IDS].toSorted());
    expect(FULL_CATALOG_IDS).toContain("pipeline scatter 100k");
  });
});

describe("buildWorkloads full catalog", () => {
  const enabled = process.env["WORKLOAD_FULL_CATALOG"] === "1";

  it.skipIf(!enabled)("freezes full (id, group, bench) against live buildWorkloads(false)", () => {
    const full = buildWorkloads(false);
    expect(full.map((w) => w.id)).toEqual([...FULL_CATALOG_IDS]);
    expect(full.some((w) => w.id === "pipeline scatter 100k")).toBe(true);
    for (const workload of full) {
      expect(workload.group.length).toBeGreaterThan(0);
      expect(workload.bench.length).toBeGreaterThan(0);
      expect(typeof workload.fn).toBe("function");
    }
  });
});
