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
