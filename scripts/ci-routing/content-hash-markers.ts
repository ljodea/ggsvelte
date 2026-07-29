/**
 * Content-hash success markers (serialize / parse / validate / path).
 * Identity: content-hash-types.ts.
 */
import {
  CACHEABLE_EXECUTIONS,
  CONTENT_HASH_SCHEMA,
  formatShardKeyPart,
  parseShard,
  sameShard,
  type CacheableExecution,
  type ExecutionShard,
} from "./content-hash-types";

export type SuccessMarker = {
  schema: number;
  execution: CacheableExecution;
  hash: string;
  /** Present only for legs of a sharded execution. */
  shard?: ExecutionShard;
};

export function serializeSuccessMarker(marker: SuccessMarker): string {
  return `${JSON.stringify(marker)}\n`;
}

export function parseSuccessMarker(body: string): SuccessMarker | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed === null || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj["schema"] !== "number") return null;
    if (typeof obj["execution"] !== "string") return null;
    if (typeof obj["hash"] !== "string" || obj["hash"].length === 0) return null;
    if (!(CACHEABLE_EXECUTIONS as readonly string[]).includes(obj["execution"])) return null;
    const base = {
      schema: obj["schema"],
      execution: obj["execution"] as CacheableExecution,
      hash: obj["hash"],
    };
    if (obj["shard"] === undefined) return base;
    // A shard field that is present but unreadable is a corrupt marker, not an
    // unsharded one — fail closed rather than validating against the wrong leg.
    const shard = parseShard(obj["shard"]);
    if (shard === null) return null;
    return { ...base, shard };
  } catch {
    return null;
  }
}

export function validateSuccessMarker(
  marker: SuccessMarker | null,
  expected: {
    execution: CacheableExecution;
    hash: string;
    schema?: number;
    shard?: ExecutionShard;
  },
): boolean {
  if (marker === null) return false;
  const schema = expected.schema ?? CONTENT_HASH_SCHEMA;
  return (
    marker.schema === schema &&
    marker.execution === expected.execution &&
    marker.hash === expected.hash &&
    sameShard(marker.shard, expected.shard)
  );
}

/** Success-marker path relative to repo root (actions/cache path). */
export function successMarkerPath(execution: CacheableExecution, shard?: ExecutionShard): string {
  // formatShardKeyPart is `shard1of3`; marker files use the `-1of3` suffix.
  const leg = shard === undefined ? "" : `-${formatShardKeyPart(shard).slice("shard".length)}`;
  return `.ci-content-hash/${execution}${leg}.ok`;
}
