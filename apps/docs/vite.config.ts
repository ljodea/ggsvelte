import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  // The example corpus, shared doc generators (scripts/), and lifecycle.json
  // live outside the app root at the repo level.
  server: { fs: { allow: ["../.."] } },
});
