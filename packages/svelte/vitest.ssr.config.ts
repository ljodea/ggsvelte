import { svelte } from "@sveltejs/vite-plugin-svelte";
import { coverageBase } from "./vitest.coverage.js";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  resolve: { dedupe: ["svelte"] },
  test: {
    name: "ssr",
    environment: "node",
    include: ["tests/**/*.ssr.test.ts"],
    coverage: {
      ...coverageBase,
      reportsDirectory: "coverage/ssr",
    },
  },
});
