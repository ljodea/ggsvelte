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
import type { CellValue } from "@ggsvelte/core";

import type { PlotInteractionController } from "../interaction/controller.svelte.js";
import type {
  InteractionSource,
  PlotInteractionEvent,
  PlotInteractionScope,
  PlotSelection,
  ResolvedInteractionConfig,
} from "../interaction/interaction.js";
import { selectionAnnouncement } from "../assembly/labels.js";
import {
  buildPointSelectionEvent,
  nextPointSelectionKeys,
  sameOrderedPropertyKeys,
} from "./selection.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SelectionStateDeps = {
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  resolvedInteractionScope: () => PlotInteractionScope;
  /** Narrow getter over `interactionConfig.select`. */
  selectConfig: () => ResolvedInteractionConfig["select"];
  /** Deferred callback getters (handler-only; never construction). */
  onselect: () => ((event: PlotSelection) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  /** Stable sink; announcer is declared later — handler-only. */
  announce: (message: string) => void;
};

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
export function createSelectionState(deps: SelectionStateDeps): SelectionState {
  let localSelectedKeys = $state<PropertyKey[]>([]);

  const effectiveSelectedKeys: readonly PropertyKey[] = $derived.by(() => {
    // Equivalent dependency to the former host `controllerRevision` derived —
    // read interaction revision directly (S3–S5 pattern).
    void (deps.interaction()?.revision ?? 0);
    return deps.interaction()?.selected(deps.resolvedInteractionScope()) ?? localSelectedKeys;
  });

  /** Private — only clear/toggle call this; no external caller (P2-7). */
  function commitPointSelection(keys: readonly PropertyKey[], source: InteractionSource): void {
    let committed: readonly PropertyKey[];
    const interaction = deps.interaction();
    if (interaction === undefined) {
      const next = [...new Set(keys)];
      if (sameOrderedPropertyKeys(next, localSelectedKeys)) return;
      localSelectedKeys = next;
      committed = localSelectedKeys;
    } else {
      const transition = interaction.setSelection(keys, {
        scope: deps.resolvedInteractionScope(),
        source,
      });
      if (transition === null) return;
      committed =
        transition.snapshot.selections.find(
          (selection) => selection.scope === deps.resolvedInteractionScope().keys,
        )?.keys ?? [];
    }
    emitSelection(buildPointSelectionEvent(committed, source));
  }

  function clearPointSelection(source: InteractionSource): void {
    if (effectiveSelectedKeys.length === 0) return;
    commitPointSelection([], source);
  }

  function emitSelection(event: PlotSelection): void {
    const message = selectionAnnouncement(event);
    if (message !== null) deps.announce(message);
    deps.onselect()?.(event);
    deps.oninteraction()?.(event);
  }

  function togglePointKeys(keys: readonly PropertyKey[], source: InteractionSource): void {
    if (keys.length === 0) return;
    const next = nextPointSelectionKeys(
      effectiveSelectedKeys,
      keys,
      deps.selectConfig()?.multiple ?? false,
    );
    commitPointSelection(next, source);
  }

  return {
    get effectiveSelectedKeys() {
      return effectiveSelectedKeys;
    },
    clearPointSelection,
    togglePointKeys,
    emitSelection,
  };
}
