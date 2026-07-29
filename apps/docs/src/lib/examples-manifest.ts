/**
 * Thin re-export of the example corpus metadata.
 *
 * Import this (not `$lib/examples`) from gallery, index, and other pages that
 * only need ids/titles/tags. `$lib/examples` also registers `import.meta.glob`
 * loaders for every Example.svelte; those loaders keep the chart stack on the
 * critical path of any module that imports them.
 */
export { EXAMPLES } from "$examples/manifest";
export type { ExampleManifestEntry } from "$examples/manifest";
