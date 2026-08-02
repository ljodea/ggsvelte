/**
 * Comparator-free stable multi-key sort for candidate-store build paths.
 *
 * LSD radix sort over 32-bit key words (8-bit digits, four counting passes
 * per word). A comparator sort over n candidates pays ~n log n JS callback
 * invocations with typed-array reads per key; the radix passes are tight
 * numeric loops with no callbacks — a large constant-factor win at 100k.
 *
 * Stability is the contract that makes this a drop-in for the comparator
 * sorts it replaces: input order (ascending candidate id) supplies the
 * trailing (batch, primitive) tie-break keys for free.
 *
 * Package-internal; not exported from the package barrel.
 */

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/**
 * Order-preserving map from float32 values to uint32 sort keys. Negative
 * floats flip all bits; non-negative floats flip the sign bit. Distinct
 * float32 values get distinct keys (−0 and +0 included); NaN payloads sort
 * after +Infinity. Input is read as float32 (the candidate anchor arrays
 * are Float32Array, so the narrowing is exact).
 */
export function float32SortKey(value: number): number {
  f32[0] = value;
  const bits = u32[0]!;
  return (bits & 0x80000000 ? ~bits : bits | 0x80000000) >>> 0;
}

/**
 * Stable-sort indices 0..n-1 by the given key words, LEAST significant word
 * first in the array. Returns a fresh Uint32Array of sorted indices.
 */
export function radixSortByWords(words: readonly Uint32Array[], n: number): Uint32Array {
  let indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  if (n < 2 || words.length === 0) return indices;
  let scratch = new Uint32Array(n);
  // 16-bit digits: two passes per word. The 256KB count table fits L2 and
  // halves the scatter passes versus 8-bit digits — measured faster than
  // both the 8-bit variant and the engine's comparator sort at 100k under
  // JavaScriptCore.
  const count = new Uint32Array(65_536);
  for (const word of words) {
    for (const shift of [0, 16] as const) {
      count.fill(0);
      for (let i = 0; i < n; i++) count[(word[indices[i]!]! >>> shift) & 0xffff]!++;
      // Uniform digit (common for panel words, high float exponent bits):
      // the pass is identity — skip the scatter entirely.
      let uniform = false;
      for (let d = 0; d < 65_536; d++) {
        if (count[d] === n) {
          uniform = true;
          break;
        }
        if (count[d]! > 0) break;
      }
      if (uniform) continue;
      let sum = 0;
      for (let d = 0; d < 65_536; d++) {
        const c = count[d]!;
        count[d] = sum;
        sum += c;
      }
      for (let i = 0; i < n; i++) {
        const id = indices[i]!;
        scratch[count[(word[id]! >>> shift) & 0xffff]!++] = id;
      }
      // Every scatter leaves the fresh order in `indices`, so uniform-skips
      // cannot strand the result in `scratch`.
      const swap = indices;
      indices = scratch;
      scratch = swap;
    }
  }
  return indices;
}
