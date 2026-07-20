import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

import { resolveDocsBuildConfig } from "./build-mode.ts";

const build = resolveDocsBuildConfig({
  mode: process.env.DOCS_BUILD_MODE,
  basePath: process.env.BASE_PATH,
});

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    paths: { base: build.base },
    prerender: {
      handleMissingId: ({ id, message }) => {
        // Versioned playground fragments are application state, not document
        // anchors. Every ordinary missing heading id remains a build failure.
        if (id.startsWith("play=v1.")) return;
        throw new Error(message);
      },
    },
    alias: {
      // The shared example corpus (plan: "one source, three uses"). The docs
      // site is one consumer; tests/visual and llms-full.txt are the others.
      $examples: "../../examples",
      // Shared doc-content generators (guide markdown + llms surfaces) and
      // the generated lifecycle artifact — single sources, bun-tested at the
      // repo root (scripts/gen-llms.test.ts, scripts/gen-lifecycle.test.ts).
      $scripts: "../../scripts",
      $lifecycle: "../../lifecycle.json",
    },
  },
};
