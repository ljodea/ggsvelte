/**
 * Browser paint competitive bench (Playwright Chromium).
 *
 * Matrix: browser-enabled libs × scenario cases (default subset, or COMPETITIVE_FULL=1).
 * Metrics per cell: cold mount median ms (includes double-rAF) and full remount median ms.
 *
 *   bun run measure-browser.ts
 *   COMPETITIVE_FULL=1 bun run measure-browser.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { createServer } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import { CASES, casesForRun, LIBS, libSupports, type LibMeta } from "./scenarios";

const root = import.meta.dirname;
const resultsDir = path.join(root, "results");
mkdirSync(resultsDir, { recursive: true });

const full = Boolean(process.env["COMPETITIVE_FULL"]);
const cases = casesForRun(full);
const browserLibs = LIBS.filter((l) => l.browser);

type BenchApi = {
  mount: (lib: string, caseId: string) => Promise<{ ms: number; markHint: number }>;
  replace: (lib: string, caseId: string) => Promise<{ ms: number }>;
  list: () => {
    libs: { id: string; browser: boolean }[];
    cases: { id: string }[];
  };
};

async function medianMs(
  fn: () => Promise<number>,
  { warmup = 2, samples = 11 } = {},
): Promise<{ median: number; mean: number; p95: number; samples: number[] }> {
  for (let i = 0; i < warmup; i++) await fn();
  const times: number[] = [];
  for (let i = 0; i < samples; i++) times.push(await fn());
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))]!;
  return {
    median: +median.toFixed(3),
    mean: +mean.toFixed(3),
    p95: +p95.toFixed(3),
    samples: times.map((t) => +t.toFixed(3)),
  };
}

function pairs(): { lib: LibMeta; caseId: string; scenario: string; n: number }[] {
  const out: { lib: LibMeta; caseId: string; scenario: string; n: number }[] = [];
  for (const lib of browserLibs) {
    for (const c of cases) {
      if (!libSupports(lib, c.scenario)) continue;
      out.push({ lib, caseId: c.id, scenario: c.scenario, n: c.n });
    }
  }
  return out;
}

const server = await createServer({
  configFile: false,
  root: path.join(root, "fixtures"),
  server: { port: 5199, strictPort: true },
  plugins: [svelte({ compilerOptions: { css: "injected" }, emitCss: false })],
  resolve: {
    conditions: ["svelte", "browser", "import", "module", "default"],
  },
  optimizeDeps: {
    include: [
      "@ggsvelte/core",
      "@ggsvelte/core/render",
      "@ggsvelte/core/dom",
      "@ggsvelte/spec/portable",
      "d3-scale",
      "d3-selection",
      "d3-array",
      "d3-axis",
      "d3-shape",
      "uplot",
      "chart.js",
      "echarts/core",
      "echarts/charts",
      "echarts/components",
      "echarts/renderers",
    ],
  },
});
await server.listen();

const browser = await chromium.launch();
let page = await browser.newPage();
page.setDefaultTimeout(120_000);

const results: Record<string, unknown>[] = [];
const matrix = pairs();
process.stderr.write(
  `competitive browser: ${matrix.length} cells (full=${full ? "yes" : "no"}, cases=${cases.length}, libs=${browserLibs.length})\n`,
);

async function waitForBenchApi(): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as unknown as { competitiveBench?: BenchApi };
    return w.competitiveBench !== undefined;
  });
}

async function recoverPage(): Promise<void> {
  try {
    await page.reload();
    await waitForBenchApi();
  } catch {
    try {
      await page.close();
    } catch {
      // already closed
    }
    page = await browser.newPage();
    page.setDefaultTimeout(120_000);
    await page.goto("http://127.0.0.1:5199/");
    await waitForBenchApi();
  }
}

await page.goto("http://127.0.0.1:5199/");
await waitForBenchApi();

for (const cell of matrix) {
  const label = `${cell.lib.id} ${cell.caseId}`;
  process.stderr.write(`bench mount ${label}...\n`);
  try {
    const mountStats = await medianMs(async () => {
      const r = await page.evaluate(
        async ({ library, caseId }) => {
          const w = window as unknown as { competitiveBench: BenchApi };
          return w.competitiveBench.mount(library, caseId);
        },
        { library: cell.lib.id, caseId: cell.caseId },
      );
      return r.ms;
    });
    process.stderr.write(`bench replace ${label}...\n`);
    const replaceStats = await medianMs(async () => {
      const r = await page.evaluate(
        async ({ library, caseId }) => {
          const w = window as unknown as { competitiveBench: BenchApi };
          return w.competitiveBench.replace(library, caseId);
        },
        { library: cell.lib.id, caseId: cell.caseId },
      );
      return r.ms;
    });
    results.push({
      lib: cell.lib.id,
      caseId: cell.caseId,
      scenario: cell.scenario,
      n: cell.n,
      ok: true,
      mountMedianMs: mountStats.median,
      mountMeanMs: mountStats.mean,
      mountP95Ms: mountStats.p95,
      replaceMedianMs: replaceStats.median,
      replaceMeanMs: replaceStats.mean,
      replaceP95Ms: replaceStats.p95,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`FAIL ${label}: ${message}\n`);
    results.push({
      lib: cell.lib.id,
      caseId: cell.caseId,
      scenario: cell.scenario,
      n: cell.n,
      ok: false,
      error: message,
    });
    // Recover page if a lib crashed the tab; rebind `page` so later cells run.
    await recoverPage();
  }
}

console.log("\n=== Competitive browser mount / replace (Chromium, median) ===\n");
console.log("lib".padEnd(18), "case".padEnd(22), "mount".padStart(10), "replace".padStart(10));
console.log("-".repeat(62));
for (const r of results) {
  if (!r["ok"]) {
    console.log(String(r["lib"]).padEnd(18), String(r["caseId"]).padEnd(22), "FAIL");
    continue;
  }
  console.log(
    String(r["lib"]).padEnd(18),
    String(r["caseId"]).padEnd(22),
    `${r["mountMedianMs"]}ms`.padStart(10),
    `${r["replaceMedianMs"]}ms`.padStart(10),
  );
}

const payload = {
  generatedAt: new Date().toISOString(),
  full,
  caseCatalog: CASES,
  libs: LIBS,
  results,
};
writeFileSync(path.join(resultsDir, "browser.json"), JSON.stringify(payload, null, 2));
console.log("\nWrote results/browser.json");

await browser.close();
await server.close();
