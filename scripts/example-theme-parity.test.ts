/**
 * Every example describes itself twice: spec.ts (the PortableSpec the docs
 * "Builder"/"Spec" tabs and the playground seed are built from) and
 * Example.svelte (what the gallery actually renders). Data, aes and labs have
 * always been hand-duplicated that way, but `theme` is the one attribute where
 * drift is visible on two surfaces at once: the gallery would render one theme
 * while "Open in Playground" hands over another, because the seed encodes the
 * normalized spec — theme included (scripts/gen-playground-seeds.ts).
 *
 * So the duplication is allowed, but it is not allowed to disagree. Guard for
 * #656, which is the first change to make theme load-bearing in examples/**.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { PortableSpec } from "@ggsvelte/spec";

import { EXAMPLES } from "../examples/manifest.ts";

const ROOT = join(import.meta.dir, "..");

/** `<GGPlot {spec} …>` — the passthrough form, which cannot drift by design. */
const PASSTHROUGH = /<GGPlot\b[^>]*\{spec\}/g;
const GGPLOT_TAG = /<GGPlot\b/g;
const ANY_THEME_PROP = /\btheme=/g;

function countMatches(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

async function loadSpec(id: string): Promise<PortableSpec> {
  const modulePath = pathToFileURL(join(ROOT, "examples", id, "spec.ts")).href;
  const module = (await import(modulePath)) as { default: PortableSpec };
  return module.default;
}

function svelteSource(id: string): string {
  return readFileSync(join(ROOT, "examples", id, "Example.svelte"), "utf8");
}

describe("example theme parity (spec.ts vs Example.svelte)", () => {
  for (const entry of EXAMPLES) {
    it(`${entry.id} declares the same theme on both surfaces`, async () => {
      const spec = await loadSpec(entry.id);
      const source = svelteSource(entry.id);
      const theme = spec.theme;

      if (theme === undefined) {
        // No theme in the spec means the renderer resolves the built-in
        // default; the component must not quietly assert something else.
        expect(countMatches(source, ANY_THEME_PROP)).toBe(0);
        return;
      }

      const plots = countMatches(source, GGPLOT_TAG);
      const passthrough = countMatches(source, PASSTHROUGH);
      const handWritten = plots - passthrough;

      if (typeof theme !== "string") {
        // Object-form theme overrides are too fiddly to mirror by hand; such an
        // example must render through {spec} so there is only one source.
        expect(handWritten).toBe(0);
        return;
      }

      // Every hand-written <GGPlot> must name the spec's theme, and no plot may
      // carry a theme the spec does not declare.
      expect(countMatches(source, new RegExp(`\\btheme="${theme}"`, "g"))).toBe(handWritten);
      expect(countMatches(source, ANY_THEME_PROP)).toBe(handWritten);
    });
  }
});
