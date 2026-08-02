/**
 * Point-selection controller extracted from GGPlot for S8.
 *
 * Owns local selection state, the construction-time `effectiveSelectedKeys`
 * derived, and commit/clear/toggle/emit handlers. Semantic Candidate
 * projection and presentation shaping belong to the runtime projection module.
 *
 * `commitPointSelection` is PRIVATE (no external caller — toggle/clear only).
 * Public API speaks PropertyKey; PublicKey casts stay at the host boundary.
 */

import type { InteractionContext } from "../interaction/interaction-context.svelte.js";
import type { InteractionSource, PlotSelection } from "../interaction/interaction.js";
import { createScopedStore } from "../interaction/scoped-store.svelte.js";
import { selectionAnnouncement } from "../assembly/labels.js";
import {
  buildPointSelectionEvent,
  nextPointSelectionKeys,
  sameOrderedPropertyKeys,
} from "./selection.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SelectionState = {
  readonly effectiveSelectedKeys: readonly PropertyKey[];
  clearPointSelection(source: InteractionSource): void;
  togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void;
  emitSelection(event: PlotSelection): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the point-selection controller. Construction registers only the
 * `effectiveSelectedKeys` derived over interaction and scope.
 */
export function createSelectionState(context: InteractionContext): SelectionState {
  const selectedKeys = createScopedStore<readonly PropertyKey[]>({
    initial: [],
    controller: context.interaction,
    scope: context.resolvedInteractionScope,
    read: (controller, scope) => controller.selected(scope),
    write: (controller, next, scope, source) => {
      const transition = controller.setSelection(next, { scope, source });
      if (transition === null) return null;
      return {
        value:
          transition.snapshot.selections.find((selection) => selection.scope === scope.keys)
            ?.keys ?? [],
      };
    },
    clearShared: (controller, scope, source) =>
      controller.clearSelection({ scope, source }) !== null,
    same: sameOrderedPropertyKeys,
  });

  /** Private — only clear/toggle call this; no external caller (P2-7). */
  function commitPointSelection(keys: readonly PropertyKey[], source: InteractionSource): void {
    // Dedup for local storage; controller canonicalizes independently.
    const committed = selectedKeys.set([...new Set(keys)], source);
    if (committed === null) return;
    emitSelection(buildPointSelectionEvent(committed.value, source));
  }

  function clearPointSelection(source: InteractionSource): void {
    if (selectedKeys.value.length === 0) return;
    commitPointSelection([], source);
  }

  function emitSelection(event: PlotSelection): void {
    const message = selectionAnnouncement(event);
    if (message !== null) context.announce(message);
    context.onselect()?.(event);
    context.oninteraction()?.(event);
  }

  function togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void {
    if (keys.length === 0) return;
    const next = nextPointSelectionKeys(
      selectedKeys.value,
      keys,
      context.selectConfig()?.multiple ?? false,
    );
    commitPointSelection(next, source);
  }

  return {
    get effectiveSelectedKeys() {
      return selectedKeys.value;
    },
    clearPointSelection,
    togglePointKeys,
    emitSelection,
  };
}
