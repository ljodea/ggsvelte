/**
 * Loader bridge between the generated manifest (ids + metadata) and the
 * example modules themselves. Vite's import.meta.glob provides lazy module
 * access plus ?raw sources for the code triptych (spec JSON / builder /
 * Svelte — plan: "docs triptychs").
 */
import type { PortableSpec } from "@ggsvelte/spec";
import type { Component } from "svelte";

export { EXAMPLES } from "$examples/manifest";
export type { ExampleManifestEntry } from "$examples/manifest";

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

function pick<T>(table: Record<string, () => Promise<T>>, suffix: string): () => Promise<T> {
  const key = Object.keys(table).find((k) => k.endsWith(suffix));
  if (key === undefined) {
    throw new Error(`example module not found: *${suffix} (manifest out of sync with the tree?)`);
  }
  return table[key];
}

export interface LoadedExample {
  component: Component;
  spec: PortableSpec;
  specSource: string;
  svelteSource: string;
}

/** Load one example's live component, canonical spec, and raw sources. */
export async function loadExample(id: string): Promise<LoadedExample> {
  const [component, spec, specSource, svelteSource] = await Promise.all([
    pick(components, `/${id}/Example.svelte`)(),
    pick(specs, `/${id}/spec.ts`)(),
    pick(specSources, `/${id}/spec.ts`)(),
    pick(svelteSources, `/${id}/Example.svelte`)(),
  ]);
  return {
    component: component.default,
    spec: spec.default,
    specSource,
    svelteSource,
  };
}
