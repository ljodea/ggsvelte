/**
 * `LineageStore.internSingleton(key)` is the allocation-free twin of
 * `intern([key])` for the dense-identity hot path: one Map hit per repeat,
 * no per-candidate `[key]` array. It must share the singleton cache AND the
 * token cache with `intern` in BOTH directions so a membership keeps one ref
 * however it is interned.
 */
import { describe, expect, it } from "bun:test";

import { LineageStore } from "../src/identity.ts";

describe("LineageStore.internSingleton", () => {
  it("returns the same ref as intern([key]) and exposes the same keys", () => {
    const store = new LineageStore<number>();
    const viaSingleton = store.internSingleton(7);
    const viaIntern = store.intern([7]);
    expect(viaSingleton).toBe(viaIntern);
    expect(store.keys(viaSingleton)).toEqual([7]);
    expect(store.count(viaSingleton)).toBe(1);
  });

  it("shares the cache when intern([key]) ran first", () => {
    const store = new LineageStore<number>();
    const viaIntern = store.intern([42]);
    const viaSingleton = store.internSingleton(42);
    expect(viaSingleton).toBe(viaIntern);
    expect(store.keys(viaSingleton)).toEqual([42]);
  });

  it("interns distinct keys to distinct refs and repeats to the same ref", () => {
    const store = new LineageStore<number>();
    const a = store.internSingleton(1);
    const b = store.internSingleton(2);
    expect(a).not.toBe(b);
    expect(store.internSingleton(1)).toBe(a);
    expect(store.internSingleton(2)).toBe(b);
  });

  it("agrees with intern on multi-member memberships interned separately", () => {
    const store = new LineageStore<number>();
    const pair = store.intern([1, 2]);
    expect(store.intern([2, 1])).toBe(pair);
    // Singletons interned alongside a pair stay distinct from it.
    expect(store.internSingleton(1)).not.toBe(pair);
    expect(store.intern([1])).toBe(store.internSingleton(1));
  });

  it("does not route through intern (no array tokenization on the hot path)", () => {
    const store = new LineageStore<number>();
    // oxlint-disable-next-line typescript/unbound-method -- re-invoked with .call below
    const original = LineageStore.prototype.intern;
    let calls = 0;
    LineageStore.prototype.intern = function counting(this: LineageStore, keys: Iterable<never>) {
      calls++;
      return original.call(this, keys);
    } as typeof original;
    try {
      store.internSingleton(9);
      store.internSingleton(9);
      expect(calls).toBe(0);
    } finally {
      LineageStore.prototype.intern = original;
    }
  });

  it("keeps the empty lineage untouched", () => {
    const store = new LineageStore<number>();
    store.internSingleton(5);
    expect(store.empty).toBe(0);
    expect(store.keys(store.empty)).toEqual([]);
  });
});
