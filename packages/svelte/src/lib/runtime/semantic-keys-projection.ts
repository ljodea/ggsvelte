/**
 * Epoch-local cache for projecting candidates into semantic key bags.
 * Smooth eval-grid marks share one lineage of L rows across C candidates —
 * membership is computed once per (lineage, extra-row) bag, not once per mark.
 */
import { uniqueKeysFromRowIndexes } from "../selection/selection.js";

export type CandidateKeysProjectionCache = {
  /** Repeat lookup for the same candidate id. */
  readonly byCandidate: Map<number, PropertyKey[]>;
  /** Expanded lineage membership (rows + Set) once per lineage id. */
  readonly lineageRows: Map<number, { rows: readonly number[]; set: ReadonlySet<number> }>;
  /** Key bag for a membership identity string. */
  readonly byMembership: Map<string, PropertyKey[]>;
};

export function createCandidateKeysProjectionCache(): CandidateKeysProjectionCache {
  return {
    byCandidate: new Map(),
    lineageRows: new Map(),
    byMembership: new Map(),
  };
}

export type CandidateKeysMembershipRef = {
  readonly id: number;
  readonly lineage: number;
  readonly rowIndex: number | null;
};

/**
 * Resolve semantic keys for one candidate via the epoch cache.
 * `lineageKeys` is invoked at most once per distinct lineage id in the cache.
 */
export function candidateSemanticKeysFromCache(
  candidate: CandidateKeysMembershipRef,
  cache: CandidateKeysProjectionCache,
  lineageKeys: (lineageId: number) => Iterable<number>,
  keyForRow: (rowIndex: number) => PropertyKey | null,
): PropertyKey[] {
  const hit = cache.byCandidate.get(candidate.id);
  if (hit !== undefined) return hit;

  let bag = cache.lineageRows.get(candidate.lineage);
  if (bag === undefined) {
    const rows = [...lineageKeys(candidate.lineage)];
    bag = { rows, set: new Set(rows) };
    cache.lineageRows.set(candidate.lineage, bag);
  }

  const rowIndex = candidate.rowIndex;
  const membershipKey =
    rowIndex === null || bag.set.has(rowIndex)
      ? `L${String(candidate.lineage)}`
      : `L${String(candidate.lineage)}+${String(rowIndex)}`;

  let keys = cache.byMembership.get(membershipKey);
  if (keys === undefined) {
    const rowList = rowIndex === null || bag.set.has(rowIndex) ? bag.rows : [...bag.rows, rowIndex];
    keys = uniqueKeysFromRowIndexes(rowList, keyForRow);
    cache.byMembership.set(membershipKey, keys);
  }

  cache.byCandidate.set(candidate.id, keys);
  return keys;
}
