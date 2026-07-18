/**
 * Pure legend emphasis helpers: pressed-identity, preview decisions, and
 * effective emphasis key precedence (preview / controller / local).
 *
 * Identity/roving: `focus.ts`. Host `$effect` plans: `focus-plans.ts`.
 */
import type { InteractionSource } from "../interaction/interaction.js";
import {
  keysForLegendEntry,
  legendInteractionSource,
  samePropertyKeySet,
  type InteractiveLegendEntry,
  type LegendEntryIdentity,
  type LegendInteractionSource,
} from "./focus.js";

export type FindLegendPressedIdentityInput = {
  readonly keys: readonly PropertyKey[];
  readonly entries: readonly InteractiveLegendEntry[];
  readonly keyIndex: ReadonlyMap<string, readonly PropertyKey[]>;
  readonly committed: {
    readonly identity: LegendEntryIdentity;
    readonly keys: readonly PropertyKey[];
  } | null;
};

/**
 * Whether a first-seen-unique key array matches a Set's membership.
 * Used by pressed-identity resolution so entry compares stay O(K) without
 * allocating a Set per legend entry. Entry-key index values and committed
 * keys are frozen unique arrays from `buildLegendEntryKeyIndex`.
 */
function uniqueKeysMatchSet(
  keys: readonly PropertyKey[],
  keySet: ReadonlySet<PropertyKey>,
): boolean {
  if (keys.length !== keySet.size) return false;
  for (const key of keys) if (!keySet.has(key)) return false;
  return true;
}

/**
 * Resolve which legend entry should appear pressed.
 * Committed identity wins when its key set still matches (even if multiple
 * entries share the same keys). Otherwise require exactly one matching entry.
 *
 * Complexity: O(K + E) — one Set for the emphasis keys, then per-entry size
 * short-circuit + membership (no Set rebuild per entry). Multi-match returns
 * null as soon as a second hit is found. Empty keys, or empty entries with no
 * committed identity, return before allocating the Set.
 */
export function findLegendPressedIdentity(
  input: FindLegendPressedIdentityInput,
): LegendEntryIdentity | null {
  if (input.keys.length === 0) return null;
  // Ramp-only / no discrete legends and no commit: nothing to match (issue #209).
  if (input.entries.length === 0 && input.committed === null) return null;
  const inputSet = new Set(input.keys);
  if (input.committed !== null && uniqueKeysMatchSet(input.committed.keys, inputSet))
    return input.committed.identity;
  let match: LegendEntryIdentity | null = null;
  for (const entry of input.entries) {
    const entryKeys = keysForLegendEntry(input.keyIndex, entry.identity);
    if (!uniqueKeysMatchSet(entryKeys, inputSet)) continue;
    if (match !== null) return null;
    match = entry.identity;
  }
  return match;
}

/**
 * Decide what a legend preview attempt should do with resolved keys.
 * Empty key sets clear any active preview (empty domain entry / stale target)
 * rather than leaving the previous entry highlighted.
 *
 * Non-empty `set` carries mapped InteractionSource via `legendInteractionSource`
 * so the host does not re-map `action.source` after the pure decision.
 */
export function resolveLegendPreviewKeysDecision(input: {
  readonly keys: readonly PropertyKey[];
  /** Host: `action.source` (legend entry interaction source). */
  readonly entrySource: LegendInteractionSource;
}):
  | { readonly type: "clear" }
  | {
      readonly type: "set";
      readonly keys: readonly PropertyKey[];
      readonly source: InteractionSource;
    } {
  if (input.keys.length === 0) return { type: "clear" };
  return {
    type: "set",
    keys: input.keys,
    source: legendInteractionSource(input.entrySource),
  };
}

/**
 * Emphasis keys shown while legend focus is enabled vs disabled.
 * When disabled, chart-local preview and local commits must not mute the plot
 * (controls are gone). Controller emphasis still flows through when present.
 */
export function resolveLegendEmphasisKeys(input: {
  readonly legendFocusEnabled: boolean;
  readonly previewKeys: readonly PropertyKey[] | null;
  readonly controllerKeys: readonly PropertyKey[] | null;
  readonly localKeys: readonly PropertyKey[];
}): readonly PropertyKey[] {
  if (!input.legendFocusEnabled) return input.controllerKeys ?? [];
  return input.previewKeys ?? input.controllerKeys ?? input.localKeys;
}

export type LegendPreviewState = {
  readonly identity: LegendEntryIdentity;
  readonly keys: readonly PropertyKey[];
};

/**
 * Reconcile a transient preview against the current entry list / key index.
 * Clears when the identity disappears or its keys empty; refreshes keys when
 * membership changes for the same identity.
 */
export function reconcileLegendPreview(input: {
  readonly preview: LegendPreviewState | null;
  readonly entries: readonly InteractiveLegendEntry[];
  readonly keyIndex: ReadonlyMap<string, readonly PropertyKey[]>;
}): LegendPreviewState | null {
  if (input.preview === null) return null;
  const current = input.entries.find(
    ({ identity }) =>
      identity.scale === input.preview!.identity.scale &&
      identity.entryIndex === input.preview!.identity.entryIndex,
  );
  if (current === undefined) return null;
  const keys = keysForLegendEntry(input.keyIndex, current.identity);
  if (keys.length === 0) return null;
  if (samePropertyKeySet(keys, input.preview.keys)) return input.preview;
  return { identity: current.identity, keys };
}
