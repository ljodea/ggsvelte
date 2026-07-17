import type { InteractionSource, PointSelection } from "../interaction/interaction.js";

export type CandidateAnchorKeys = {
  readonly x: number;
  readonly y: number;
  readonly keys: readonly PropertyKey[];
};

export type CandidateRowRef = {
  readonly rowIndex: number | null;
};

/**
 * Ordered equality for PropertyKey sequences (length + Object.is per index).
 * Distinct Symbols never equal. Does not dedupe — callers normalize first.
 */
export function sameOrderedPropertyKeys(
  left: readonly PropertyKey[],
  right: readonly PropertyKey[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((key, index) => Object.is(key, right[index]));
}

/**
 * Build a frozen point-selection payload.
 * Phase is "clear" when keys is empty. Keys are cloned then frozen.
 */
export function buildPointSelectionEvent(
  keys: readonly PropertyKey[],
  source: InteractionSource,
): PointSelection {
  return Object.freeze({
    type: "select",
    phase: keys.length === 0 ? "clear" : "end",
    mode: "point",
    keys: Object.freeze([...keys]),
    source,
  });
}

/**
 * Union lineage row indexes with the candidate's own rowIndex when set.
 * Lineage order is preserved; the candidate row is appended only if absent.
 */
export function rowIndexesForCandidate(
  candidate: CandidateRowRef,
  lineageRowIndexes: Iterable<number>,
): number[] {
  const rows = [...lineageRowIndexes];
  if (candidate.rowIndex !== null && !rows.includes(candidate.rowIndex))
    rows.push(candidate.rowIndex);
  return rows;
}

/**
 * Map row indexes through a key resolver, keeping first-seen unique non-null keys.
 */
export function uniqueKeysFromRowIndexes(
  rowIndexes: Iterable<number>,
  keyForRow: (rowIndex: number) => PropertyKey | null,
): PropertyKey[] {
  const keys: PropertyKey[] = [];
  for (const rowIndex of rowIndexes) {
    const key = keyForRow(rowIndex);
    if (key !== null && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * Point-selection set algebra for toggle-on-click/keyboard.
 * Empty toggled keys leave the current selection unchanged.
 */
export function nextPointSelectionKeys(
  current: readonly PropertyKey[],
  toggled: readonly PropertyKey[],
  multiple: boolean,
): PropertyKey[] {
  if (toggled.length === 0) return [...current];
  const allSelected = toggled.every((key) => current.includes(key));
  if (allSelected) return current.filter((key) => !toggled.includes(key));
  if (multiple) return [...new Set([...current, ...toggled])];
  return [...toggled];
}

/**
 * Candidate store surface used by presentation walks (size + random-access).
 * Generic so this module stays free of core CandidateFacts coupling.
 */
export type CandidateLookup<T> = {
  readonly size: number;
  candidate(id: number): T | null;
};

/**
 * Yield every non-null candidate in id-ascending order (`0 .. size-1`).
 * Shared walk for anchors, mask projections, legend indexes, and hit match.
 */
export function* iterateCandidates<T>(
  candidates: CandidateLookup<T>,
): Generator<T, void, undefined> {
  for (let id = 0; id < candidates.size; id++) {
    const candidate = candidates.candidate(id);
    if (candidate !== null) yield candidate;
  }
}

/**
 * Project every non-null candidate (id-ascending) into a new array.
 * Hosts supply `project` (may close over model / semantic keys).
 */
export function collectCandidates<T, R>(
  candidates: CandidateLookup<T>,
  project: (candidate: T) => R,
): R[] {
  const out: R[] = [];
  for (const candidate of iterateCandidates(candidates)) {
    out.push(project(candidate));
  }
  return out;
}

/**
 * Collect unique pixel anchors for selected semantic keys.
 * Candidates must already be in id-ascending order; key resolution stays with
 * the caller. Dedup identity is `${String(x)}:${String(y)}`.
 */
export function anchorsFromCandidateKeys(
  candidates: Iterable<CandidateAnchorKeys>,
  selectedKeys: readonly PropertyKey[],
): { x: number; y: number }[] {
  if (selectedKeys.length === 0) return [];
  const keySet = new Set(selectedKeys);
  const anchors: { x: number; y: number }[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    let selected = false;
    for (const key of candidate.keys) {
      if (!keySet.has(key)) continue;
      selected = true;
      break;
    }
    const identity = `${String(candidate.x)}:${String(candidate.y)}`;
    if (selected && !seen.has(identity)) {
      seen.add(identity);
      anchors.push({ x: candidate.x, y: candidate.y });
    }
  }
  return anchors;
}

/** Inspection focus fields needed for interaction-mask presentation keys. */
export type PresentationInspectionFocus = {
  readonly sourceKeys: readonly PropertyKey[];
  readonly key: PropertyKey | null;
};

/**
 * Keys used for interaction mask presentation when emphasis is active.
 * Short-circuit: if emphasis is empty OR inspection is null, return emphasis
 * (same reference). Otherwise freeze the Set-union of emphasis, sourceKeys,
 * and the optional focus key (insertion order: emphasis → sourceKeys → key).
 */
export function mergePresentationFocusKeys(
  emphasisKeys: readonly PropertyKey[],
  inspection: PresentationInspectionFocus | null,
): readonly PropertyKey[] {
  if (emphasisKeys.length === 0 || inspection === null) return emphasisKeys;
  return Object.freeze([
    ...new Set([
      ...emphasisKeys,
      ...inspection.sourceKeys,
      ...(inspection.key === null ? [] : [inspection.key]),
    ]),
  ]);
}
