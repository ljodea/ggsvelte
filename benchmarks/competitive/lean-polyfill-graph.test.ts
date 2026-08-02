/**
 * Vite tree-shaken client graph for the competitive ggsvelte-svg scatter entry
 * must not include @js-temporal/polyfill or jsbi.
 */
import { describe, expect, it } from "bun:test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";

const root = import.meta.dir;

describe("lean competitive SVG graph", () => {
  it("excludes Temporal polyfill and jsbi after minify", async () => {
    const outDir = path.join(root, "results", "bundles", "_lean-polyfill-test");
    mkdirSync(outDir, { recursive: true });

    const result = await build({
      configFile: false,
      logLevel: "error",
      build: {
        lib: {
          entry: path.join(root, "entries/ggsvelte-svg__scatter-color.ts"),
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
        conditions: ["import", "module", "default"],
      },
    });

    const outputs = (Array.isArray(result) ? result : [result]).flatMap(
      (item) => item.output ?? [],
    );
    const chunk = outputs.find((item) => item.type === "chunk");
    expect(chunk?.type).toBe("chunk");
    if (chunk?.type !== "chunk") return;

    const moduleIds = Object.keys(chunk.modules);
    expect(moduleIds.filter((id) => id.includes("@js-temporal/polyfill"))).toEqual([]);
    expect(
      moduleIds.filter(
        (id) => id.includes(`${path.sep}jsbi${path.sep}`) || id.includes("jsbi-umd"),
      ),
    ).toEqual([]);

    const raw = readFileSync(path.join(outDir, "bundle.js"));
    // Pre-fix lean SVG was ~827KB raw with polyfill; stay under that floor.
    expect(raw.byteLength).toBeGreaterThan(50_000);
    expect(raw.byteLength).toBeLessThan(700_000);
  }, 120_000);
});
