/**
 * Minimal reactive holder for unit tests. Plain `let` bindings in a .test.ts
 * file are invisible to `$derived` inside a factory under test; state must be
 * `$state` so `set` invalidates consumers.
 */
export type ReactiveBox<T> = {
  readonly value: T;
  set(next: T): void;
};

export function reactiveBox<T>(initial: T): ReactiveBox<T> {
  let value = $state.raw(initial);
  return {
    get value() {
      return value;
    },
    set(next: T) {
      value = next;
    },
  };
}

/**
 * Rune-backed memo for `.test.ts` files (runes are unavailable there).
 * Mirrors a host `$derived` boundary: `fn` re-runs only when its reactive
 * inputs change, regardless of how often `.value` is read.
 */
export function derivedBox<T>(fn: () => T): { readonly value: T } {
  const value = $derived.by(fn);
  return {
    get value() {
      return value;
    },
  };
}
