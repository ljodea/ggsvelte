import type { Component, ComponentProps } from "svelte";
import { hydrate, unmount } from "svelte";

/**
 * Hydrate server-rendered fixture markup and return an async cleanup. Tests
 * intentionally pass the real SSR body: this catches marker/DOM divergence.
 */
export function hydrateSsrFixture<C extends Component<any>>(
  Component: C,
  target: Element,
  props: ComponentProps<C>,
): () => Promise<void> {
  const instance = hydrate(Component, { target, props });
  return () => unmount(instance);
}
