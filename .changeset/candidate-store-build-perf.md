---
"@ggsvelte/core": patch
---

# Faster candidate-store build

Migration: none. Internal-only performance work in the candidate-store build
path; no public API or behavior changes.

Measured on a loaded x86_64 box (budgets were baselined on Apple Silicon),
min-of-many reps:

- hit-index build 100k: ~289 ms → ~208 ms
- canvas cold scatter 100k: ~1161 ms → ~1150 ms (noisy; CPU profiles show the
  candidate-build share shrinking across every slice)

Slices:

- Coincident stacks derive from traversal-order runs instead of a
  `${panel}|${x}|${y}` string-keyed Map (NaN/±0-aware fallback preserved).
- Per-bucket `Object.freeze` and singleton-lineage `Object.freeze` dropped;
  immutable by convention, matching the coincident-stack precedent.
- Axis-token interning is kind-dispatched (number/string/boolean Maps keyed
  on the raw value) with peek-before-allocate, eliminating per-candidate
  `tokenKey()` strings and token objects on repeat hits.
- Traversal and orderByX permutations use a stable 16-bit-digit LSD radix
  sort over order-preserving float32 keys on the all-finite fast path
  (non-finite scenes keep the historical comparator path verbatim).
- Permutation-sort comparator reads precomputed token ranks and per-candidate
  layer ids — no `compareTokens` dispatch, no `scene.batches[…]` chases.
- Single-batch all-points scenes reuse the main anchor quadtree instead of
  building an identical second tree.
- Singleton lineage interning fast-paths through a direct key→ref Map while
  registering the same membership token as the general path.
- The source-backed datum resolver hoists column arrays, style reads, and
  grouping per (layer, owning table) instead of seven `table.column(field)`
  walks plus cache probes per primitive.
- Per-candidate columns are written into capacity-preallocated final typed
  arrays instead of growable `number[]` buffers plus conversion copies.
