/**
 * Browser paint/update competitive bench (Playwright Chromium).
 *
 * Measures first-mount and data-update for ggsvelte (lean SVG path) vs raw D3
 * at 1k and 10k points. SveltePlot/LayerCake need full component fixtures;
 * this harness focuses on the headless-equivalent SVG cost that FU1–FU3 target.
 */
import { createServer } from "vite";
import { chromium, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = import.meta.dirname;
const resultsDir = path.join(root, "results");
mkdirSync(resultsDir, { recursive: true });

type BenchApi = {
  mount: (
    lib: string,
    n: number,
  ) => Promise<{ ms: number; markCount: number }> | { ms: number; markCount: number };
  update: (lib: string, n: number) => Promise<{ ms: number }> | { ms: number };
};

async function medianMs(
  page: Page,
  fn: () => Promise<number>,
  { warmup = 3, samples = 15 } = {},
): Promise<{ median: number; mean: number; p95: number }> {
  for (let i = 0; i < warmup; i++) await fn();
  const times: number[] = [];
  for (let i = 0; i < samples; i++) times.push(await fn());
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)]!;
  return {
    median: +median.toFixed(3),
    mean: +mean.toFixed(3),
    p95: +p95.toFixed(3),
  };
}

const server = await createServer({
  configFile: false,
  root: path.join(root, "fixtures"),
  server: { port: 5199, strictPort: true },
  resolve: {
    conditions: ["svelte", "browser", "import", "module", "default"],
  },
  optimizeDeps: {
    include: [
      "@ggsvelte/core/render",
      "@ggsvelte/spec/portable",
      "d3-scale",
      "d3-selection",
      "d3-array",
      "d3-axis",
    ],
  },
});
await server.listen();

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5199/");
await page.waitForFunction(() => {
  const w = window as unknown as { competitiveBench?: BenchApi };
  return w.competitiveBench !== undefined;
});

const libs = ["ggsvelte", "d3"] as const;
const sizes = [1_000, 10_000] as const;
const results: Record<string, unknown>[] = [];

for (const libName of libs) {
  for (const size of sizes) {
    const label = `${libName} ${size >= 1000 ? `${size / 1000}k` : size}`;
    process.stderr.write(`bench mount ${label}...\n`);
    const mountStats = await medianMs(page, async () => {
      const r = await page.evaluate(
        ({ library, points }) => {
          const w = window as unknown as { competitiveBench: BenchApi };
          return w.competitiveBench.mount(library, points);
        },
        { library: libName, points: size },
      );
      return (await r).ms;
    });
    process.stderr.write(`bench update ${label}...\n`);
    const updateStats = await medianMs(page, async () => {
      const r = await page.evaluate(
        ({ library, points }) => {
          const w = window as unknown as { competitiveBench: BenchApi };
          return w.competitiveBench.update(library, points);
        },
        { library: libName, points: size },
      );
      return (await r).ms;
    });
    results.push({
      lib: libName,
      n: size,
      mountMedianMs: mountStats.median,
      mountMeanMs: mountStats.mean,
      mountP95Ms: mountStats.p95,
      updateMedianMs: updateStats.median,
      updateMeanMs: updateStats.mean,
      updateP95Ms: updateStats.p95,
    });
  }
}

console.log("\n=== Browser mount / update (Chromium, median of 15) ===\n");
console.log("case".padEnd(22), "mount".padStart(10), "update".padStart(10));
console.log("-".repeat(44));
for (const r of results) {
  const label = `${r["lib"]} ${Number(r["n"]) >= 1000 ? `${Number(r["n"]) / 1000}k` : r["n"]}`;
  console.log(
    label.padEnd(22),
    `${r["mountMedianMs"]}ms`.padStart(10),
    `${r["updateMedianMs"]}ms`.padStart(10),
  );
}

writeFileSync(path.join(resultsDir, "browser.json"), JSON.stringify(results, null, 2));
console.log("\nWrote results/browser.json");

await browser.close();
await server.close();
