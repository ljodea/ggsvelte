/**
 * Lean `@ggsvelte/core/render` + `@ggsvelte/spec/portable` must not ship the
 * Temporal polyfill (or jsbi) for identity numeric charts.
 *
 * Uses published package exports (dist/). Vite lives under
 * benchmarks/competitive (devDependency of that package).
 */
import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const renderEntry = path.join(repoRoot, "packages/core/dist/render-entry.js");
const portableEntry = path.join(repoRoot, "packages/spec/dist/portable-entry.js");
const competitiveRequire = createRequire(
  path.join(repoRoot, "benchmarks/competitive/package.json"),
);

const LEAN_ENTRY = `
import { renderToSVGString } from "@ggsvelte/core/render";
import { aes, gg } from "@ggsvelte/spec/portable";

const data = {
  x: [1, 2, 3, 4],
  y: [1, 3, 2, 4],
  cls: ["a", "a", "b", "b"],
};
const spec = gg(data, aes({ x: "x", y: "y", color: "cls" }))
  .geomPoint({ size: 1.5, alpha: 0.7 })
  .toPortable();
export const out = renderToSVGString(spec, { width: 400, height: 300 });
`;

describe("lean render bundle graph", () => {
  it("excludes @js-temporal/polyfill and jsbi from the client graph", async () => {
    if (!existsSync(renderEntry) || !existsSync(portableEntry)) {
      // Local/CI without a prior tsc build: skip rather than false red.
      // Source gate in packages/spec/tests/temporal-source-gate.test.ts still runs.
      expect(existsSync(renderEntry) || existsSync(portableEntry)).toBe(false);
      return;
    }

    let build: typeof import("vite").build;
    try {
      ({ build } = competitiveRequire("vite") as typeof import("vite"));
    } catch {
      expect("vite").toBe("available under benchmarks/competitive");
      return;
    }

    const outDir = path.join(here, ".tmp-lean-bundle");
    mkdirSync(outDir, { recursive: true });
    const entry = path.join(outDir, "entry.ts");
    await Bun.write(entry, LEAN_ENTRY);

    const result = await build({
      configFile: false,
      logLevel: "error",
      build: {
        lib: {
          entry,
          formats: ["es"],
          fileName: () => "bundle.js",
        },
        outDir: path.join(outDir, "dist"),
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

    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output ?? []);
    const chunk = outputs.find((o) => o.type === "chunk");
    expect(chunk && chunk.type === "chunk").toBe(true);
    if (!chunk || chunk.type !== "chunk") return;

    const moduleIds = Object.keys(chunk.modules);
    const polyfill = moduleIds.filter((id) => id.includes("@js-temporal/polyfill"));
    const jsbi = moduleIds.filter((id) => /[/\\]jsbi[/\\]/.test(id) || id.includes("jsbi-umd"));
    expect(polyfill).toEqual([]);
    expect(jsbi).toEqual([]);

    // Sanity: real chart code, not an empty stub; under pre-fix polyfill-inflated size.
    expect(chunk.code.length).toBeGreaterThan(50_000);
    expect(chunk.code.length).toBeLessThan(700_000);
  }, 120_000);
});
