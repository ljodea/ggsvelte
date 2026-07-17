/**
 * Track LayerRegistry.layers length under an effect root so version-counter
 * reactivity can be asserted from plain .test.ts files (runes only work in
 * .svelte / .svelte.ts modules).
 */
import type { LayerRegistry } from "../../src/lib/geoms/registry.svelte.js";

export function trackLayerCount(registry: LayerRegistry): {
  readonly seen: number[];
  destroy: () => void;
} {
  const seen: number[] = [];
  const destroy = $effect.root(() => {
    $effect(() => {
      seen.push(registry.layers.length);
    });
  });
  return { seen, destroy };
}
