/**
 * Loader bridge between the generated manifest (ids + metadata) and the
 * example modules themselves. Vite's import.meta.glob provides lazy module
 * access plus ?raw sources for the code triptych (spec JSON / builder /
 * Svelte — plan: "docs triptychs").
 *
 * Metadata-only consumers should import `$lib/examples-manifest` instead so
 * they do not register the Example.svelte globs (and their chart deps).
 */
import type { PortableSpec } from "@ggsvelte/spec";
import type { Component } from "svelte";

import { indexExampleModulesById, requireExampleModule } from "./example-module-index.js";

export { EXAMPLES, type ExampleManifestEntry } from "./examples-manifest.js";

const components = import.meta.glob<{ default: Component }>("$examples/*/*/Example.svelte");
const specs = import.meta.glob<{ default: PortableSpec }>("$examples/*/*/spec.ts");
const specSources = import.meta.glob<string>("$examples/*/*/spec.ts", {
  query: "?raw",
  import: "default",
});
const svelteSources = import.meta.glob<string>("$examples/*/*/Example.svelte", {
  query: "?raw",
  import: "default",
});

// Module-scoped id maps: O(n) once, O(1) per loadExample (was O(n) per pick).
const componentsById = indexExampleModulesById(components, "Example.svelte");
const specsById = indexExampleModulesById(specs, "spec.ts");
const specSourcesById = indexExampleModulesById(specSources, "spec.ts");
const svelteSourcesById = indexExampleModulesById(svelteSources, "Example.svelte");

export interface LoadedExample {
  component: Component;
  spec: PortableSpec;
  specSource: string;
  svelteSource: string;
}

/** Load one example's live component, canonical spec, and raw sources. */
export async function loadExample(id: string): Promise<LoadedExample> {
  const [component, spec, specSource, svelteSource] = await Promise.all([
    requireExampleModule(componentsById, id, "Example.svelte")(),
    requireExampleModule(specsById, id, "spec.ts")(),
    requireExampleModule(specSourcesById, id, "spec.ts")(),
    requireExampleModule(svelteSourcesById, id, "Example.svelte")(),
  ]);
  return {
    component: component.default,
    spec: spec.default,
    specSource,
    svelteSource,
  };
}
