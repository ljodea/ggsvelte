/**
 * Type shim for .svelte imports inside ssr__* entry modules (the benchmark
 * tsconfig is oxlint-type-aware only, not part of the tsc -b build graph).
 */
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component<Record<string, unknown>>;
  export default component;
}
