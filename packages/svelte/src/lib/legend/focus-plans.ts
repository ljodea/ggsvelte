/**
 * Pure host `$effect` plans for legend focus (committed reconcile, disable
 * clear, roving focus sync). Controllers own DOM / emission side effects.
 *
 * Identity/roving: `focus.ts`. Emphasis/preview: `focus-emphasis.ts`.
 */
import {
  clampLegendRovingIndex,
  keysForLegendEntry,
  samePropertyKeySet,
  type InteractiveLegendEntry,
  type LegendEntryIdentity,
} from "./focus.js";

export type LegendCommittedState = {
  readonly identity: LegendEntryIdentity;
  readonly keys: readonly PropertyKey[];
};

export type LegendCommittedReconcilePlan =
  | { readonly type: "noop" }
  | { readonly type: "clear-committed" }
  | { readonly type: "clear-committed-local-emit" };

/**
 * Pure plan for the committed-legend reconcile effect after data reshuffle.
 *
 * Owns entry lookup + key compare (same shape as `reconcileLegendPreview`).
 * Host on non-noop: always nulls `legendCommitted`. On local-emit also clears
 * chart-local emphasis keys and emits legend-focus clear.
 *
 *   1. no commit → noop
 *   2. live keys still match → noop
 *   3. mismatch + local emphasis active → clear-committed-local-emit
 *   4. mismatch otherwise → clear-committed
 */
export function planLegendCommittedReconcile(input: {
  readonly committed: LegendCommittedState | null;
  readonly entries: readonly InteractiveLegendEntry[];
  readonly keyIndex: ReadonlyMap<string, readonly PropertyKey[]>;
  /** Host: `interaction === undefined`. */
  readonly usesLocalEmphasis: boolean;
  readonly localEmphasisCount: number;
}): LegendCommittedReconcilePlan {
  if (input.committed === null) return { type: "noop" };
  const current = input.entries.find(
    ({ identity }) =>
      identity.scale === input.committed!.identity.scale &&
      identity.entryIndex === input.committed!.identity.entryIndex,
  );
  const currentKeys =
    current === undefined ? [] : keysForLegendEntry(input.keyIndex, current.identity);
  if (samePropertyKeySet(currentKeys, input.committed.keys)) return { type: "noop" };
  if (input.usesLocalEmphasis && input.localEmphasisCount > 0) {
    return { type: "clear-committed-local-emit" };
  }
  return { type: "clear-committed" };
}

export type LegendFocusDisabledClearPlan =
  | { readonly type: "noop" }
  | { readonly type: "clear-host" }
  | { readonly type: "clear-host-local" };

/**
 * Pure plan when legend focus is turned off at runtime.
 *
 *   1. still enabled → noop
 *   2. host legend state already empty → noop
 *   3. chart-local mode → clear preview+committed+localEmphasisKeys
 *   4. controller mode → clear preview+committed only (controller emphasis stays)
 */
export function planLegendFocusDisabledClear(input: {
  readonly legendFocusEnabled: boolean;
  readonly hasPreview: boolean;
  readonly hasCommitted: boolean;
  readonly hasLocalEmphasis: boolean;
  /** Host: `interaction === undefined`. */
  readonly usesLocalEmphasis: boolean;
}): LegendFocusDisabledClearPlan {
  if (input.legendFocusEnabled) return { type: "noop" };
  if (!input.hasPreview && !input.hasCommitted && !input.hasLocalEmphasis) {
    return { type: "noop" };
  }
  return input.usesLocalEmphasis ? { type: "clear-host-local" } : { type: "clear-host" };
}

export type LegendRovingFocusSyncPlan =
  | { readonly type: "noop"; readonly nextIndex: number }
  | { readonly type: "clamp-roving"; readonly nextIndex: number }
  | {
      readonly type: "refocus";
      readonly nextIndex: number;
      readonly returnIndex: number;
    };

/**
 * Pure plan for the legend roving-index `$effect.pre`.
 *
 * Host owns `document.activeElement` / dataset parse for `focusedIndex`.
 * `Number(dataset.index)` yields NaN when missing — pass that through so
 * `clampLegendRovingIndex` maps non-finite → 0 (refocus first entry).
 *
 *   - focusedIndex === null OR entryCount === 0 → no DOM refocus
 *     (clamp-roving when nextIndex differs from current, else noop)
 *   - otherwise → refocus with returnIndex = clamp(focusedIndex, count)
 */
export function planLegendRovingFocusSync(input: {
  readonly currentRoving: number;
  readonly entryCount: number;
  /** null = focus not on a legend target inside root; may be NaN. */
  readonly focusedIndex: number | null;
}): LegendRovingFocusSyncPlan {
  const nextIndex = clampLegendRovingIndex(input.currentRoving, input.entryCount);
  if (input.focusedIndex === null || input.entryCount === 0) {
    return nextIndex === input.currentRoving
      ? { type: "noop", nextIndex }
      : { type: "clamp-roving", nextIndex };
  }
  return {
    type: "refocus",
    nextIndex,
    returnIndex: clampLegendRovingIndex(input.focusedIndex, input.entryCount),
  };
}
