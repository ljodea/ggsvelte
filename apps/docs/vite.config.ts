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
