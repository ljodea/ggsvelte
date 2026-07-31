/**
 * Client bundle sizes for a colored scatter across libraries.
 * Vite library mode, esbuild minify, gzip -9.
 */
import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = import.meta.dirname;
const outRoot = path.join(root, "results", "bundles");
if (existsSync(outRoot)) rmSync(outRoot, { recursive: true });
mkdirSync(outRoot, { recursive: true });

const suites = [
  {
    id: "ggsvelte-lean-scatter",
    entry: path.join(root, "entries/ggsvelte-lean.ts"),
    svelte: false,
    note: "@ggsvelte/core/render + @ggsvelte/spec/portable",
  },
  {
    id: "ggsvelte-full-scatter",
    entry: path.join(root, "entries/ggsvelte-full.ts"),
    svelte: false,
    note: "@ggsvelte/core + @ggsvelte/spec builder.spec()",
  },
  {
    id: "svelteplot-scatter",
    entry: path.join(root, "entries/svelteplot.ts"),
    svelte: true,
    note: "Plot + Dot + axes",
  },
  {
    id: "layercake-scatter",
    entry: path.join(root, "entries/layercake.ts"),
    svelte: true,
    note: "LayerCake shell + d3-scale",
  },
  {
    id: "d3-raw-scatter",
    entry: path.join(root, "entries/d3-raw.ts"),
    svelte: false,
    note: "d3-scale + d3-axis + d3-selection + d3-array",
  },
] as const;

function kb(n: number): number {
  return Math.round((n / 1024) * 10) / 10;
}

const results: Record<string, unknown>[] = [];

for (const suite of suites) {
  const outDir = path.join(outRoot, suite.id);
  process.stderr.write(`building ${suite.id}...\n`);
  try {
    await build({
      configFile: false,
      logLevel: "error",
      plugins: suite.svelte
        ? [svelte({ compilerOptions: { css: "injected" }, emitCss: false })]
        : [],
      build: {
        lib: {
          entry: suite.entry,
          formats: ["es"],
          fileName: () => "bundle.js",
        },
        outDir,
        emptyOutDir: true,
        minify: "esbuild",
        target: "es2022",
        rollupOptions: { external: [] },
        write: true,
      },
      resolve: {
        conditions: ["svelte", "browser", "import", "module", "default"],
      },
    });
    const raw = readFileSync(path.join(outDir, "bundle.js"));
    const gz = gzipSync(raw, { level: 9 });
    results.push({
      id: suite.id,
      ok: true,
      note: suite.note,
      rawBytes: raw.byteLength,
      gzipBytes: gz.byteLength,
      rawKB: kb(raw.byteLength),
      gzipKB: kb(gz.byteLength),
    });
  } catch (err) {
    results.push({
      id: suite.id,
      ok: false,
      note: suite.note,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

console.log("\n=== Competitive scatter bundles (Vite minify, gzip -9) ===\n");
console.log("id".padEnd(28), "raw KB".padStart(10), "gzip KB".padStart(10));
console.log("-".repeat(50));
for (const r of results) {
  if (!r["ok"]) {
    console.log(String(r["id"]).padEnd(28), "FAIL");
    continue;
  }
  console.log(
    String(r["id"]).padEnd(28),
    String(r["rawKB"]).padStart(10),
    String(r["gzipKB"]).padStart(10),
  );
}

writeFileSync(path.join(root, "results", "bundles.json"), JSON.stringify(results, null, 2));
console.log("\nWrote results/bundles.json");
