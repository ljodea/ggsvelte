import { describe, expect, it } from "bun:test";

import { float32SortKey, radixSortByWords } from "../src/radix-sort.ts";

/** Order-preserving reference: ascending by each word in turn, stable on ties. */
function referenceSort(words: readonly Uint32Array[], n: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => {
    for (let w = words.length - 1; w >= 0; w--) {
      const d = words[w]![a]! - words[w]![b]!;
      if (d !== 0) return d;
    }
    return a - b;
  });
  return indices;
}

function randomWord(rng: () => number, cardinality: number): Uint32Array {
  return Uint32Array.from({ length: 2000 }, () => Math.floor(rng() * cardinality));
}

// Deterministic xorshift so failures reproduce.
function xorshift(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

describe("radixSortByWords", () => {
  it("matches the comparator reference for one word with heavy duplicates", () => {
    const words = [randomWord(xorshift(42), 7)];
    expect([...radixSortByWords(words, words[0]!.length)]).toEqual(
      referenceSort(words, words[0]!.length),
    );
  });

  it("matches the comparator reference for three full-range words", () => {
    const rng = xorshift(1337);
    const words = [
      randomWord(rng, 0xffffffff),
      randomWord(rng, 0xffffffff),
      randomWord(rng, 0xffffffff),
    ];
    expect([...radixSortByWords(words, 2000)]).toEqual(referenceSort(words, 2000));
  });

  it("is stable on all-equal keys", () => {
    const words = [new Uint32Array(500)];
    expect([...radixSortByWords(words, 500)]).toEqual(Array.from({ length: 500 }, (_, i) => i));
  });

  it("handles empty and singleton inputs", () => {
    expect([...radixSortByWords([new Uint32Array(0)], 0)]).toEqual([]);
    expect([...radixSortByWords([Uint32Array.of(9)], 1)]).toEqual([0]);
  });
});

describe("float32SortKey", () => {
  it("orders finite float32 values ascending", () => {
    const values = [-Infinity, -1e30, -1.5, -1, -0, 0, 1e-9, 0.5, 1, 42.25, 1e30, Infinity];
    const keys = values.map((v) => float32SortKey(v));
    for (let i = 1; i < keys.length; i++) expect(keys[i]!).toBeGreaterThan(keys[i - 1]!);
  });

  it("is monotonic over random float32 pairs", () => {
    const rng = xorshift(7);
    for (let i = 0; i < 10_000; i++) {
      const a = (rng() - 0.5) * 1e6;
      const b = (rng() - 0.5) * 1e6;
      const ka = float32SortKey(a);
      const kb = float32SortKey(b);
      if (a < b) expect(ka).toBeLessThan(kb);
      else if (a > b) expect(ka).toBeGreaterThan(kb);
      else expect(ka).toBe(kb);
    }
  });
});
