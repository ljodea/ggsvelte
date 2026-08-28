/** Anchor equality matching the old `${x}` string-key grouping: ±0 equal, NaN ≈ NaN. */
function sameAnchorCoord(u: number, v: number): boolean {
  return u === v || (Number.isNaN(u) && Number.isNaN(v));
}

type CandidateCoincidenceInput = {
  readonly n: number;
  readonly panelIds: Uint32Array;
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  readonly traversal: Uint32Array;
  readonly anyNonFiniteAnchor: boolean;
};

/**
 * Coincident multi-member stacks by (panel, x, y) in paint/source order (ascending id).
 * Singletons are omitted so dense plots do not retain n one-element Uint32Arrays;
 * `cycle` treats a missing stack as identity. Multi-member stacks make cycle O(1).
 */
export function buildCandidateCoincidence(input: CandidateCoincidenceInput): {
  coincidentStack: (Uint32Array | undefined)[];
  coincidentAt: Uint32Array;
} {
  const { n, panelIds, xs, ys, traversal, anyNonFiniteAnchor } = input;
  const coincidentStack: (Uint32Array | undefined)[] = Array.from({ length: n });
  const coincidentAt = new Uint32Array(n);
  {
    const emitCoincidentRun = (ids: Uint32Array, runStart: number, runEnd: number): void => {
      const length = runEnd - runStart;
      if (length < 2) return;
      // Typed arrays are not freezeable in all runtimes; treat as immutable by convention.
      // Members are ascending id (candidate ids are assigned in batch-then-
      // primitive order, the traversal sort's trailing keys), matching the old
      // id-order push sequence.
      const stack = new Uint32Array(length);
      for (let j = 0; j < length; j++) stack[j] = ids[runStart + j]!;
      for (let j = 0; j < length; j++) {
        const id = stack[j]!;
        coincidentStack[id] = stack;
        coincidentAt[id] = j;
      }
    };
    if (anyNonFiniteAnchor) {
      // Non-finite anchors: the traversal comparator's subtraction is unstable
      // on NaN, so group with explicit string-key-equivalent semantics —
      // String() is injective on widened Float32 values, String(-0) === "0"
      // groups ±0, and "NaN" groups NaN anchors with NaN anchors.
      const cmpCoord = (u: number, v: number): number => {
        if (sameAnchorCoord(u, v)) return 0;
        if (Number.isNaN(u)) return -1;
        if (Number.isNaN(v)) return 1;
        return u < v ? -1 : 1;
      };
      const byCoincidence = Uint32Array.from({ length: n }, (_, id) => id);
      byCoincidence.sort(
        (a, b) =>
          panelIds[a]! - panelIds[b]! ||
          cmpCoord(xs[a]!, xs[b]!) ||
          cmpCoord(ys[a]!, ys[b]!) ||
          a - b,
      );
      let runStart = 0;
      for (let i = 1; i <= n; i++) {
        const first = byCoincidence[runStart]!;
        const current = i < n ? byCoincidence[i]! : -1;
        if (
          i < n &&
          panelIds[current] === panelIds[first] &&
          sameAnchorCoord(xs[current]!, xs[first]!) &&
          sameAnchorCoord(ys[current]!, ys[first]!)
        )
          continue;
        emitCoincidentRun(byCoincidence, runStart, i);
        runStart = i;
      }
    } else {
      // Fast path: with all-finite anchors, traversal order (panel, y, x,
      // batch, primitive) makes coincident (panel, x, y) runs contiguous —
      // zero extra sorting. ±0 pairs are equal under the comparator's
      // subtraction, matching the old string-key grouping.
      let runStart = 0;
      for (let i = 1; i <= n; i++) {
        const first = traversal[runStart]!;
        const current = i < n ? traversal[i]! : -1;
        if (
          i < n &&
          panelIds[current] === panelIds[first] &&
          xs[current] === xs[first] &&
          ys[current] === ys[first]
        )
          continue;
        emitCoincidentRun(traversal, runStart, i);
        runStart = i;
      }
    }
  }
  return { coincidentStack, coincidentAt };
}
