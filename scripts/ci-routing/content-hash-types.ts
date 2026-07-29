/**
 * Content-hash identity vocabulary: schema, execution keys, shard legs.
 * Path tables: content-hash-inputs.ts. Markers: content-hash-markers.ts.
 * Hash/cache/git: content-hash.ts.
 */

// Schema 2: split former monolithic `build` into build / svelte_check / docs_site.
export const CONTENT_HASH_SCHEMA = 2;

/**
 * Physical CI executions that may content-hash short-circuit.
 * Distinct from JobName: component is four shards (svelte chromium, svelte
 * firefox+webkit, spikes, journeys); consumer is matrixed.
 */
export type CacheableExecution =
  | "packages_dist"
  | "unit"
  | "build"
  | "svelte_check"
  | "docs_site"
  | "actions_security"
  | "bench_smoke"
  | "interaction_perf"
  | "component_svelte"
  | "component_svelte_fx"
  | "component_spikes"
  | "component_journeys"
  | "consumer";

export const CACHEABLE_EXECUTIONS: readonly CacheableExecution[] = [
  "packages_dist",
  "unit",
  "build",
  "svelte_check",
  "docs_site",
  "actions_security",
  "bench_smoke",
  "interaction_perf",
  "component_svelte",
  "component_svelte_fx",
  "component_spikes",
  "component_journeys",
  "consumer",
] as const;

/**
 * One leg of a matrixed fan-out (vitest / playwright `--shard=index/total`).
 * 1-based `index`, matching both runners' CLI convention.
 *
 * Shard identity is part of cache identity: the legs hash the same content but
 * execute disjoint test files, so a marker written by one leg must never
 * satisfy another. `total` is included so re-shaping the fan-out (3 → 4 legs)
 * misses every old marker instead of reusing legs that now cover other files.
 */
export type ExecutionShard = {
  index: number;
  total: number;
};

/** `shard1of3` — stable in both cache keys and marker filenames. */
export function formatShardKeyPart(shard: ExecutionShard): string {
  return `shard${shard.index}of${shard.total}`;
}

export function parseShard(value: unknown): ExecutionShard | null {
  if (value === null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const index = obj["index"];
  const total = obj["total"];
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  const i = index as number;
  const t = total as number;
  if (i < 1 || t < 1 || i > t) return null;
  return { index: i, total: t };
}

export function sameShard(a: ExecutionShard | undefined, b: ExecutionShard | undefined): boolean {
  if (a === undefined || b === undefined) return a === undefined && b === undefined;
  return a.index === b.index && a.total === b.total;
}
