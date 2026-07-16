/**
 * Browser-test harness for factories that own `$effect` registrations.
 * Instantiates under `$effect.root` so effects are owned and destroyable.
 */
import { flushSync } from "svelte";

/**
 * Run `setup` inside a fresh effect root. Returns the value and a destroy
 * function that tears down every effect registered during setup.
 * Does NOT flush — callers that need effects to run should call `flushSync`
 * after construction (or use `withFlushedEffectRoot`).
 */
export function withEffectRoot<T>(setup: () => T): { readonly value: T; destroy(): void } {
  let value!: T;
  const destroy = $effect.root(() => {
    value = setup();
  });
  return { value, destroy };
}

/** Like `withEffectRoot`, then `flushSync` so registered effects run once. */
export function withFlushedEffectRoot<T>(setup: () => T): { readonly value: T; destroy(): void } {
  const handle = withEffectRoot(setup);
  flushSync();
  return handle;
}
