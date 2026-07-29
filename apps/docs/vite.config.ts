import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

/**
 * Keep the chart stack out of the root layout's shared chunks.
 *
 * Vite 8 uses Rolldown. Prefer `output.codeSplitting.groups` over deprecated
 * `manualChunks` (which SvelteKit's own codeSplitting config can ignore).
 *
 * Without this, layout chrome co-chunks with `@ggsvelte/core` / GGPlot
 * (~120–340KB decoded on every page). Chart pages still load these groups via
 * their own imports.
 *
 * Named package groups put *every* matching module into one shared chunk. A
 * tiny static import of palette hex tables (`catalog/themes`) or teaching
 * datasets (`@ggsvelte/svelte/data`) then modulepreloads the full ~1MB chart
 * stack on intent-only pages. Higher-priority carve-outs keep pure data in
 * their own small chunks so those pages stay light until live charts load.
 */
export default defineConfig({
  plugins: [sveltekit()],
  // The example corpus, shared doc generators (scripts/), and lifecycle.json
  // live outside the app root at the repo level.
  server: { fs: { allow: ["../.."] } },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Higher priority than ggsvelte groups so Svelte runtime helpers
            // stay out of the chart package chunks. Without this, layout loads
            // ~360KB of ggsvelte-svelte just for attr/escape_html.
            {
              name: "svelte-runtime",
              test: /[\\/]node_modules[\\/]svelte[\\/]/,
              priority: 30,
            },
            // Pure teaching datasets — not the GGPlot runtime.
            {
              name: "ggsvelte-data",
              test: /(?:[\\/]node_modules[\\/]@ggsvelte[\\/]svelte[\\/]data[\\/]|[\\/]packages[\\/]svelte[\\/](?:src[\\/]lib[\\/]|dist[\\/])?data[\\/])/,
              priority: 40,
            },
            // Pure palette / ramp tables — not pipeline, render, or scales engine.
            {
              name: "ggsvelte-palette-tables",
              test: /[\\/](?:categorical-palettes|colorbrewer-palettes|viridis-ramp)\.[cm]?[jt]s$/,
              priority: 40,
            },
            {
              name: "ggsvelte-core",
              test: /(?:[\\/]node_modules[\\/]@ggsvelte[\\/]core[\\/]|[\\/]packages[\\/]core[\\/])/,
              priority: 20,
            },
            {
              name: "ggsvelte-svelte",
              test: /(?:[\\/]node_modules[\\/]@ggsvelte[\\/]svelte[\\/]|[\\/]packages[\\/]svelte[\\/])/,
              priority: 20,
            },
            // TypeBox schema + validate/lint/artifact + schema-derived API
            // catalogs (GEOM_REFERENCE etc.) — agent/LLM / reference-docs path.
            // Higher priority than ggsvelte-spec so chart pages do not pay for
            // schema-declarations or description-rich reference bags.
            {
              name: "ggsvelte-spec-validate",
              // TypeBox schema/validate + schema-derived API catalogs.
              // Excludes validate-structure* (TypeBox-free structuralGate for render).
              // Excludes schema-catalog / schema-names (runtime name lists).
              test: /(?:packages[\\/]spec[\\/](?:src|dist)[\\/]|@ggsvelte[\\/]spec[\\/](?:dist[\\/])?)(?:validate(?:\.[cm]?[jt]s$|-(?:data|map|schema))|schema(?:\.[cm]?[jt]s$|-declarations|-name-schemas)|temporal-(?:parse|interval)-schema|artifact\.|lint(?:\.|-)|geom-reference|stat-reference|position-reference|guide-reference|geom-params)/,
              priority: 40,
            },
            {
              name: "ggsvelte-spec",
              test: /(?:[\\/]node_modules[\\/]@ggsvelte[\\/]spec[\\/]|[\\/]packages[\\/]spec[\\/])/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
