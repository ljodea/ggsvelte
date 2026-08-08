/**
 * Browser paint competitive bench (Playwright Chromium).
 *
 * Matrix: browser-enabled libs × scenario cases (default subset, or COMPETITIVE_FULL=1).
 * Metrics per cell: cold mount median ms (includes double-rAF) plus IN-PLACE
 * update median ms (same medianMs helper, warmup 2 / samples 11, alternating
 * perturbed data). replace* columns mirror mount until a distinct remount
 * metric is wanted (full remount is not re-sampled).
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
// Optional focus filters for debugging contested cells:
//   COMPETITIVE_LIBS=ggsvelte-svg,layercake COMPETITIVE_CASES=line-3x10k bun run measure-browser.ts
const onlyLibs = process.env["COMPETITIVE_LIBS"]
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const onlyCases = process.env["COMPETITIVE_CASES"]
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const cases = casesForRun(full).filter((c) => !onlyCases || onlyCases.includes(c.id));
const browserLibs = LIBS.filter((l) => l.browser && (!onlyLibs || onlyLibs.includes(l.id)));

type BenchApi = {
  mount: (lib: string, caseId: string) => Promise<{ ms: number; markHint: number }>;
  replace: (lib: string, caseId: string) => Promise<{ ms: number }>;
  update: (lib: string, caseId: string) => Promise<{ ms: number }>;
  endUpdate: () => void;
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
  // Case-outer so peer and ggsvelte cells for the same chart share warm
  // Chromium/canvas state — lib-outer cold-started the first lib on each
  // dense cell and inflated the relative gate (#1468).
  for (const c of cases) {
    for (const lib of browserLibs) {
      if (!libSupports(lib, c.scenario)) continue;
      out.push({ lib, caseId: c.id, scenario: c.scenario, n: c.n });
    }
  }
  return out;
}

const server = await createServer({
  configFile: false,
  root: path.join(root, "fixtures"),
  server: { host: "127.0.0.1", port: 5199, strictPort: true },
  plugins: [svelte({ compilerOptions: { css: "injected" }, emitCss: false })],
  resolve: {
    conditions: ["svelte", "browser", "import", "module", "default"],
    dedupe: ["svelte"],
  },
  optimizeDeps: {
    // Svelte component libs must share one svelte runtime with the fixture
    // components (context + flushSync break across duplicated runtimes).
    exclude: ["svelte", "svelteplot", "layercake", "@unovis/svelte"],
    include: [
      "@ggsvelte/core",
      "@ggsvelte/core/render",
      "@ggsvelte/core/dom",
      "@ggsvelte/spec/portable",
      "@unovis/ts",
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

// Warm the vite transform graph BEFORE launching Chromium: on a cold
// node_modules/.vite the first page load compiles the whole import graph
// (fixture + all lib adapters) and can blow the 120s page timeout.
// warmupRequest crawls the import graph from the entry module.
await server.warmupRequest("/main.ts");

// Paint-inclusive timing uses a double-rAF; a vsync-locked compositor floors
// every cell at ~2 frames (~32 ms @60Hz) and hides real CPU differences.
// Unthrottle frame production so mount time reflects work, not refresh rate.
const browser = await chromium.launch({
  args: ["--disable-frame-rate-limit", "--disable-gpu-vsync"],
});
let page = await browser.newPage();
page.setDefaultTimeout(120_000);

function wirePageDiagnostics(p: Page): void {
  p.on("pageerror", (e) => process.stderr.write(`PAGEERROR: ${String(e).slice(0, 800)}\n`));
  p.on("console", (m) => {
    if (m.type() === "error") {
      process.stderr.write(`CONSOLE-ERR: ${m.text().slice(0, 400)}\n`);
    }
  });
}
wirePageDiagnostics(page);

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

function isTimeout(err: unknown): boolean {
  return err instanceof Error && err.name === "TimeoutError";
}

/** Load the bench page and wait for the API, retrying once on goto timeout
 * (a cold vite dep-optimize can stall the first load past the page timeout). */
async function gotoBenchPage(p: Page): Promise<void> {
  try {
    await p.goto("http://127.0.0.1:5199/");
    await waitForBenchApi();
  } catch (err) {
    if (!isTimeout(err)) throw err;
    process.stderr.write("page load timed out; retrying once...\n");
    await p.goto("http://127.0.0.1:5199/");
    await waitForBenchApi();
  }
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
    wirePageDiagnostics(page);
    await gotoBenchPage(page);
  }
}

await gotoBenchPage(page);

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
    // replaceLib is a full remount alias of mountLib today — re-running the
    // median loop doubles wall time with no new information (#1357). replace*
    // columns below mirror mount stats; update* is the real second axis.
    const updateStats = await medianMs(async () => {
      const r = await page.evaluate(
        async ({ library, caseId }) => {
          const w = window as unknown as { competitiveBench: BenchApi };
          return w.competitiveBench.update(library, caseId);
        },
        { library: cell.lib.id, caseId: cell.caseId },
      );
      return r.ms;
    });
    // Teardown the live update handle for this cell (also automatic on the
    // next cell's first update call — belt and braces, no leaks across cells).
    await page.evaluate(() => {
      const w = window as unknown as { competitiveBench: BenchApi };
      w.competitiveBench.endUpdate();
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
      replaceMedianMs: mountStats.median,
      replaceMeanMs: mountStats.mean,
      replaceP95Ms: mountStats.p95,
      updateMedianMs: updateStats.median,
      updateMeanMs: updateStats.mean,
      updateP95Ms: updateStats.p95,
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

console.log("\n=== Competitive browser mount / replace / update (Chromium, median) ===\n");
console.log(
  "lib".padEnd(18),
  "case".padEnd(22),
  "mount".padStart(10),
  "replace".padStart(10),
  "update".padStart(10),
);
console.log("-".repeat(72));
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
    `${r["updateMedianMs"]}ms`.padStart(10),
  );
}

const payload = {
  generatedAt: new Date().toISOString(),
  full,
  measuresUpdate: true,
  caseCatalog: CASES,
  libs: LIBS,
  results,
};
writeFileSync(path.join(resultsDir, "browser.json"), JSON.stringify(payload, null, 2));
console.log("\nWrote results/browser.json");

await browser.close();
await server.close();
