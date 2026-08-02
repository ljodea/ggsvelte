/**
 * Lean render must not pull the Temporal polyfill registration into core
 * outside the full install path. Complements:
 * - packages/spec/tests/temporal-source-gate.test.ts (sole polyfill import site)
 * - benchmarks/competitive/lean-polyfill-graph.test.ts (Vite tree-shaken graph)
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const coreSrc = path.resolve(import.meta.dir, "../src");

function sourceFiles(directory: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(directory)) {
    const filePath = path.join(directory, name);
    if (statSync(filePath).isDirectory()) out.push(...sourceFiles(filePath));
    else if (filePath.endsWith(".ts")) out.push(filePath);
  }
  return out;
}

describe("lean render polyfill edges (core source)", () => {
  it("imports ensureTemporalPolyfill only from install-temporal.ts", () => {
    const importPolyfill = /import\s+[^;]*from\s+["']@js-temporal\/polyfill["']/;
    const importEnsure = /import\s+[^;]*ensureTemporalPolyfill/;
    const importPolyfillModule = /from\s+["'][^"']*temporal-polyfill[^"']*["']/;
    const offenders = sourceFiles(coreSrc).filter((filePath) => {
      if (filePath.endsWith(`${path.sep}install-temporal.ts`)) return false;
      const text = readFileSync(filePath, "utf8");
      return (
        importPolyfill.test(text) || importEnsure.test(text) || importPolyfillModule.test(text)
      );
    });
    expect(offenders).toEqual([]);
  });
});
