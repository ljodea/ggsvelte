import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  resolve: { dedupe: ["svelte"] },
  test: {
    name: "ssr",
    environment: "node",
    include: ["tests/**/*.ssr.test.ts"],
  },
});
