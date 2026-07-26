/**
 * The repo composes its own charts the way it tells consumers to (#659 slice 8).
 *
 * 0.11.0 deprecated the seven grammar props on `<GGPlot>` (facet, coord,
 * scales, guides, legend, theme, labs) in favour of declaration-only child
 * layers, and shipped `ggsvelte-codemod` to migrate them. Documentation that
 * still passes them is the loudest possible counter-argument, so this asserts
 * the docs app's own Svelte sources — and the getting-started page the guide
 * builds line by line — are already on the child form.
 *
 * The check IS the codemod: a file is migrated when running it over that file
 * rewrites nothing (`changes`) and refuses nothing (`skipped`). Reusing the
 * shipped transform rather than a bespoke regex means the guard cannot drift
 * from what `npx ggsvelte-codemod` would tell a reader to do.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { migratePlotProps } from "../packages/svelte/src/lib/codemod/migrate-plot-props.ts";
import { foldSakura, QUICKSTART_PAGE_FILENAME, SAKURA_STEPS } from "./quickstart.ts";

const ROOT = join(import.meta.dir, "..");

function svelteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : svelteFiles(path);
    return path.endsWith(".svelte") ? [path] : [];
  });
}

/**
 * Every authored `.svelte` in the docs app. `__perf` routes are in scope on
 * purpose: they are read as usage examples as readily as the gallery is.
 */
const DOCS_SVELTE = svelteFiles(join(ROOT, "apps/docs/src"));

describe("the repo's own charts use child layers, not deprecated grammar props", () => {
  it("finds docs Svelte sources to check", () => {
    // A broken walk would make every assertion below vacuously pass.
    expect(DOCS_SVELTE.length).toBeGreaterThan(20);
  });

  for (const path of DOCS_SVELTE) {
    const name = relative(ROOT, path);
    it(`${name} needs no migration`, () => {
      const result = migratePlotProps(readFileSync(path, "utf8"));
      expect({
        rewritable: result.changes.map((c) => `${c.prop} (line ${String(c.line)})`),
        manual: result.skipped.map((s) => `${s.prop} (line ${String(s.line)})`),
      }).toEqual({ rewritable: [], manual: [] });
    });
  }

  // Every fold, not just the first and last: the getting-started page shows
  // one of these per step, and a reader types whichever one is on screen.
  for (let step = 0; step <= SAKURA_STEPS.length; step += 1) {
    it(`the ${QUICKSTART_PAGE_FILENAME} at step ${String(step)} needs no migration`, () => {
      const result = migratePlotProps(foldSakura(step).source);
      expect({
        rewritable: result.changes.map((c) => c.prop),
        manual: result.skipped.map((s) => s.prop),
      }).toEqual({ rewritable: [], manual: [] });
    });
  }
});
