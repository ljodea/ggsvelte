import type { InteractionSource, PointSelection } from "../interaction/interaction.js";

/** Overlay chrome for a presentation anchor. Rect marks use relative de-emphasis, not rings. */
export type PresentationChrome = "ring" | "none";

export type PresentationAnchor = {
  readonly x: number;
  readonly y: number;
  readonly chrome: PresentationChrome;
};

export type CandidateAnchorKeys = {
  readonly x: number;
  readonly y: number;
  readonly keys: readonly PropertyKey[];
  /** Geometry batch kind when known (`rects` suppresses point rings — #386). */
  readonly kind?: string;
};

/** Point-like chrome by default; rect batches use mask de-emphasis only. */
export function presentationChromeForKind(kind: string | null | undefined): PresentationChrome {
  return kind === "rects" ? "none" : "ring";
}

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
 * Uses a Set for O(1) membership so large brushes / lineages stay O(n).
 */
export function uniqueKeysFromRowIndexes(
  rowIndexes: Iterable<number>,
  keyForRow: (rowIndex: number) => PropertyKey | null,
): PropertyKey[] {
  const seen = new Set<PropertyKey>();
  const keys: PropertyKey[] = [];
  for (const rowIndex of rowIndexes) {
    const key = keyForRow(rowIndex);
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/**
 * Point-selection set algebra for toggle-on-click/keyboard.
 * Empty toggled keys leave the current selection unchanged.
 * Membership uses Sets so multi-select of large key sets stays O(n+m).
 */
export function nextPointSelectionKeys(
  current: readonly PropertyKey[],
  toggled: readonly PropertyKey[],
  multiple: boolean,
): PropertyKey[] {
  if (toggled.length === 0) return [...current];
  const currentSet = new Set(current);
  const allSelected = toggled.every((key) => currentSet.has(key));
  if (allSelected) {
    const toggledSet = new Set(toggled);
    return current.filter((key) => !toggledSet.has(key));
  }
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
 * `chrome` prefers `"ring"` when any coincident candidate needs it (e.g. point
 * overlaid on a rect at the same pixel), so the first-seen rect does not hide
 * point chrome (#386).
 */
export function anchorsFromCandidateKeys(
  candidates: Iterable<CandidateAnchorKeys>,
  selectedKeys: readonly PropertyKey[],
): PresentationAnchor[] {
  if (selectedKeys.length === 0) return [];
  const keySet = new Set(selectedKeys);
  const anchors: PresentationAnchor[] = [];
  const indexByIdentity = new Map<string, number>();
  for (const candidate of candidates) {
    let selected = false;
    for (const key of candidate.keys) {
      if (!keySet.has(key)) continue;
      selected = true;
      break;
    }
    if (!selected) continue;
    const identity = `${String(candidate.x)}:${String(candidate.y)}`;
    const chrome = presentationChromeForKind(candidate.kind);
    const existing = indexByIdentity.get(identity);
    if (existing === undefined) {
      indexByIdentity.set(identity, anchors.length);
      anchors.push({ x: candidate.x, y: candidate.y, chrome });
      continue;
    }
    // Upgrade none → ring if a later coincident candidate needs point chrome.
    if (chrome === "ring" && anchors[existing]?.chrome === "none") {
      anchors[existing] = { x: candidate.x, y: candidate.y, chrome: "ring" };
    }
  }
  return anchors;
}

/** Inspection focus fields needed for interaction-mask presentation keys. */
export type PresentationInspectionFocus = {
  readonly sourceKeys: readonly PropertyKey[];
  readonly key: PropertyKey | null;
  /** Geometry kind of the inspection seed when known. */
  readonly kind?: string | null;
  /**
   * Renderer primitives for the inspection seed (and later, group members).
   * Used for keyless rect de-emphasis when sourceKeys are empty (#386).
   */
  readonly primitives?: readonly {
    readonly batchIndex: number;
    readonly primitiveIndex: number;
  }[];
};

/**
 * Keys used for interaction mask presentation.
 * - Legend emphasis alone: return emphasis (same reference when inspection null).
 * - Legend emphasis + inspection: freeze Set-union (emphasis → sourceKeys → key).
 * - Inspection of rect marks with empty emphasis: freeze inspection keys so
 *   bar/col hover can de-emphasize siblings without a point ring (#386).
 * - Other inspection-only cases: return empty emphasis (point chrome keeps rings).
 */
export function mergePresentationFocusKeys(
  emphasisKeys: readonly PropertyKey[],
  inspection: PresentationInspectionFocus | null,
): readonly PropertyKey[] {
  if (inspection === null) return emphasisKeys;
  if (emphasisKeys.length === 0) {
    if (inspection.kind !== "rects") return emphasisKeys;
    const keys = [...inspection.sourceKeys, ...(inspection.key === null ? [] : [inspection.key])];
    if (keys.length === 0) return emphasisKeys;
    return Object.freeze([...new Set(keys)]);
  }
  return Object.freeze([
    ...new Set([
      ...emphasisKeys,
      ...inspection.sourceKeys,
      ...(inspection.key === null ? [] : [inspection.key]),
    ]),
  ]);
}
