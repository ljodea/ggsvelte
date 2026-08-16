/**
 * Vite tree-shaken client graphs for the competitive lean ggsvelte entries
 * (SVG + canvas) must not include the interaction candidate-store graph
 * (#1421): build-candidates, candidate-store(+indexes/spatial), hit geometry
 * and candidate construction are full-entry-only. `candidate-geometry.ts`
 * (primitive counts, segment distance) legitimately stays — the lean render
 * path uses it.
 */
import { describe, expect, it } from "bun:test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";

const root = import.meta.dir;

const LEAN_BANNED = /candidate-store|candidate-hit-|build-candidates|candidate-construction/;
const SCATTER_BANNED =
  /geometry-(?:paths-line|paths-area|ribbon|rects|edge-rects|segments|segment-finite|glyphs)/;
const AUTHORING_BANNED = /(?:portable-)?builder(?:-|\.)/;
const THEME_CATALOG_BANNED = /theme-builtins/;

async function buildEntry(entryName: string): Promise<{ moduleIds: string[]; rawBytes: number }> {
  const outDir = path.join(root, "results", "bundles", `_lean-candidates-test-${entryName}`);
  mkdirSync(outDir, { recursive: true });

  const result = await build({
    configFile: false,
    logLevel: "error",
    build: {
      lib: {
        entry: path.join(root, "entries", entryName),
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

  const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output ?? []);
  const chunk = outputs.find((item) => item.type === "chunk");
  expect(chunk?.type).toBe("chunk");
  if (chunk?.type !== "chunk") throw new Error("expected a chunk output");

  const raw = readFileSync(path.join(outDir, "bundle.js"));
  return { moduleIds: Object.keys(chunk.modules), rawBytes: raw.byteLength };
}

function expectCandidateFree(
  { moduleIds, rawBytes }: { moduleIds: string[]; rawBytes: number },
  maxRawBytes: number,
): void {
  expect(moduleIds.filter((id) => LEAN_BANNED.test(id))).toEqual([]);
  // Granular headless registration keeps scatter entries free of unrelated
  // basic geom renderers while the candidate-store graph stays full-entry-only.
  expect(rawBytes).toBeGreaterThan(50_000);
  expect(rawBytes).toBeLessThan(maxRawBytes);
}

describe("lean competitive SVG graph", () => {
  it("excludes the candidate-store graph after minify", async () => {
    const built = await buildEntry("ggsvelte-svg__scatter-color.ts");
    expectCandidateFree(built, 500_000);
    expect(built.moduleIds.filter((id) => SCATTER_BANNED.test(id))).toEqual([]);
    expect(built.moduleIds.filter((id) => AUTHORING_BANNED.test(id))).toEqual([]);
    expect(built.moduleIds.filter((id) => THEME_CATALOG_BANNED.test(id))).toEqual([]);
  }, 120_000);
});

describe("lean competitive canvas graph", () => {
  it("excludes the candidate-store graph after minify", async () => {
    const built = await buildEntry("ggsvelte-canvas__scatter-color.ts");
    expectCandidateFree(built, 475_000);
    expect(built.moduleIds.filter((id) => SCATTER_BANNED.test(id))).toEqual([]);
    expect(built.moduleIds.filter((id) => AUTHORING_BANNED.test(id))).toEqual([]);
    expect(built.moduleIds.filter((id) => THEME_CATALOG_BANNED.test(id))).toEqual([]);
  }, 120_000);
});
