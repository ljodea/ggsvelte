export type CandidateAnchorKeys = {
  readonly x: number;
  readonly y: number;
  readonly keys: readonly PropertyKey[];
};

export type CandidateRowRef = {
  readonly rowIndex: number | null;
};

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
