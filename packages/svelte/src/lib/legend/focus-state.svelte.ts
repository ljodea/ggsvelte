/**
 * Legend-focus controller extracted from GGPlot for S3.
 *
 * Owns chart-local emphasis, preview/commit state, roving/touch suppress flags,
 * interaction handlers, and phased reconcile effects. Construction-time
 * deriveds must NOT read model/entryKeys/entries (construction-order DAG).
 * Those are methods/effects registered after the host declares the later
 * bindings.
 */
import type { CellValue, RenderModel } from "@ggsvelte/core";

import type { PlotInteractionController } from "../interaction/controller.svelte.js";
import type {
  InteractionSource,
  LegendFocusEvent,
  PlotInteractionEvent,
  PlotInteractionScope,
} from "../interaction/interaction.js";
import { legendFocusAnnouncement } from "../assembly/labels.js";
import {
  buildInteractiveLegendEntries,
  moveLegendRovingIndex,
  samePropertyKeySet,
} from "./focus.js";
import type { InteractiveLegendEntry, LegendEntryAction, LegendEntryIdentity } from "./focus.js";
import {
  findLegendPressedIdentity,
  reconcileLegendPreview,
  resolveLegendEmphasisKeys,
  resolveLegendPreviewKeysDecision,
} from "./focus-emphasis.js";
import {
  planLegendCommittedReconcile,
  planLegendFocusDisabledClear,
  planLegendRovingFocusSync,
} from "./focus-plans.js";
import type { LegendEntryKeyAccess } from "./entry-key-index.svelte.js";
import {
  resolveLegendClearControlSource,
  resolveLegendClickAction,
  resolveLegendCommitAction,
  resolveLegendKeyAction,
  resolveLegendPointerUpAction,
  resolveLegendPreviewDismissAction,
  shouldClearLegendPreviewOnBlur,
  shouldEmitLegendFocusClear,
} from "./surface.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LegendFocusStateDeps = {
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  resolvedInteractionScope: () => PlotInteractionScope;
  legendFocusEnabled: () => boolean;
  /** Narrow reactive getter over `interactionConfig.legendFocus?.preview`. */
  legendFocusPreviewEnabled: () => boolean;
  root: () => HTMLDivElement | null;
  /**
   * Legend entry → semantic-key access. Accessed only inside methods /
   * effects / handlers (declared after the factory in the host).
   */
  entryKeys: () => LegendEntryKeyAccess;
  /**
   * Component-side interactive entries derived. Read only in effects/handlers.
   */
  entries: () => readonly InteractiveLegendEntry[];
  /**
   * Host's cached `effectiveLegendPressed` derived (computeLegendPressed over
   * the current model). Called only from commit handlers — never at
   * construction — so it may close over a later-declared host binding.
   */
  pressed: () => LegendEntryIdentity | null;
  onlegendfocus: () => ((event: LegendFocusEvent) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  /** Stable announce sink (not a getter). */
  announce: (message: string) => void;
};

export type LegendFocusState = {
  readonly effectiveEmphasisKeys: readonly PropertyKey[];
  readonly previewIdentity: LegendEntryIdentity | null;
  readonly rovingIndex: number;
  computeInteractiveEntries(model: RenderModel | null): InteractiveLegendEntry[];
  computeLegendPressed(model: RenderModel | null): LegendEntryIdentity | null;
  onPreviewIndex(index: number): void;
  onPreviewClear(): void;
  onLegendFocus(index: number): void;
  onLegendKeydown(event: KeyboardEvent, index: number): void;
  onLegendPointerDown(event: PointerEvent, index: number): void;
  onLegendPointerUp(event: PointerEvent, index: number): void;
  onLegendClick(event: MouseEvent, index: number): void;
  onLegendBlur(event: FocusEvent): void;
  clearLegendFromControl(event: MouseEvent): void;
  setTouchIndexCleared(): void;
  setClearPointerType(type: string | null): void;
  /**
   * Install reconcile effects after host `$derived` entry lists exist.
   * Irreducible late hook: entries/pressed close over host-held deriveds that
   * require this factory's compute* methods (#627 — not a sibling-controller cycle).
   */
  installHostDerivedEffects(): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the legend-focus controller. Construction registers
 * `effectiveEmphasisKeys`. Call `installHostDerivedEffects` after the host
 * declares entry/pressed deriveds that this factory's compute* methods feed.
 */
export function createLegendFocusState(deps: LegendFocusStateDeps): LegendFocusState {
  let localEmphasisKeys = $state<PropertyKey[]>([]);
  let legendPreview = $state<{
    action: LegendEntryAction;
    keys: readonly PropertyKey[];
  } | null>(null);
  let legendCommitted = $state<{
    identity: LegendEntryIdentity;
    keys: readonly PropertyKey[];
  } | null>(null);
  let legendRovingIndex = $state(0);
  let legendTouchIndex = -1;
  let legendClearPointerType: string | null = null;
  let suppressLegendClick = false;
  let suppressLegendFocusPreview = false;

  const effectiveEmphasisKeys: readonly PropertyKey[] = $derived.by(() => {
    // Equivalent dependency to the host `controllerRevision` derived —
    // read interaction revision directly (no extra dep).
    void (deps.interaction()?.revision ?? 0);
    return resolveLegendEmphasisKeys({
      legendFocusEnabled: deps.legendFocusEnabled(),
      previewKeys: legendPreview?.keys ?? null,
      controllerKeys:
        deps.interaction() === undefined
          ? null
          : deps.interaction()!.emphasized(deps.resolvedInteractionScope()),
      localKeys: localEmphasisKeys,
    });
  });

  function emitLegendFocus(event: LegendFocusEvent): void {
    deps.announce(legendFocusAnnouncement(event));
    deps.onlegendfocus()?.(event);
    deps.oninteraction()?.(event);
  }

  function previewLegend(action: LegendEntryAction | null): void {
    if (action === null) {
      // Decision table is pure (legend/surface); host owns emit + mutation.
      // Emit gate uses committed emphasis, not effectiveEmphasisKeys (preview).
      // Pure table maps preview source → InteractionSource on non-none actions.
      const dismiss = resolveLegendPreviewDismissAction({
        previewSource: legendPreview?.action.source ?? null,
        committedEmphasisEmpty:
          (deps.interaction()?.emphasized(deps.resolvedInteractionScope()) ?? localEmphasisKeys)
            .length === 0,
      });
      if (dismiss.type === "none") return;
      legendPreview = null;
      if (dismiss.type === "clear-and-emit")
        emitLegendFocus({
          type: "legend-focus",
          phase: "clear",
          source: dismiss.source,
        });
      return;
    }
    const decision = resolveLegendPreviewKeysDecision({
      keys: deps.entryKeys().keysForLegend(action),
      entrySource: action.source,
    });
    if (decision.type === "clear") {
      // Empty domain entry: do not leave the previous entry's preview active.
      previewLegend(null);
      return;
    }
    legendPreview = { action, keys: decision.keys };
    emitLegendFocus({
      type: "legend-focus",
      phase: "change",
      state: "transient",
      source: decision.source,
      scale: action.identity.scale,
      value: action.entry.value as CellValue,
      label: action.entry.label,
      keys: decision.keys,
    });
  }

  function clearLegendFocus(source: InteractionSource): void {
    const emitClear = shouldEmitLegendFocusClear({
      hasPreview: legendPreview !== null,
      hasCommitted: legendCommitted !== null,
      emphasisKeyCount: effectiveEmphasisKeys.length,
    });
    legendPreview = null;
    legendCommitted = null;
    if (deps.interaction() === undefined) localEmphasisKeys = [];
    else
      deps.interaction()!.clearEmphasis({
        scope: deps.resolvedInteractionScope(),
        source,
      });
    if (emitClear) emitLegendFocus({ type: "legend-focus", phase: "clear", source });
  }

  function clearLegendFromControl(event: MouseEvent): void {
    const returnTarget = deps
      .root()
      ?.querySelector<HTMLElement>(".gg-legend-target[aria-pressed='true']");
    const source = resolveLegendClearControlSource({
      detail: event.detail,
      pointerType: legendClearPointerType,
    });
    legendClearPointerType = null;
    clearLegendFocus(source);
    queueMicrotask(() => {
      if (returnTarget === null || returnTarget === undefined) return;
      suppressLegendFocusPreview = true;
      returnTarget.focus();
      suppressLegendFocusPreview = false;
    });
  }

  function computeInteractiveEntries(model: RenderModel | null): InteractiveLegendEntry[] {
    if (model === null || !deps.legendFocusEnabled()) return [];
    return buildInteractiveLegendEntries(model.scene.legends);
  }

  function computeLegendPressed(model: RenderModel | null): LegendEntryIdentity | null {
    const keys =
      deps.interaction()?.emphasized(deps.resolvedInteractionScope()) ?? localEmphasisKeys;
    if (keys.length === 0 || model === null) return null;
    // Match against all discrete scene legends (not only interactive targets).
    return findLegendPressedIdentity({
      keys,
      entries: buildInteractiveLegendEntries(model.scene.legends),
      keyIndex: deps.entryKeys().legendEntryKeyIndex,
      committed: legendCommitted,
    });
  }

  function commitLegend(action: LegendEntryAction): void {
    // Eager key lookup (O(1) Map.get) before pure routing; unused on toggle-clear.
    const keys = deps.entryKeys().keysForLegend(action);
    // Host's cached effectiveLegendPressed derived — the single source of
    // truth shared with aria-pressed, not a per-commit recompute.
    const commit = resolveLegendCommitAction({
      pressed: deps.pressed(),
      identity: action.identity,
      keyCount: keys.length,
      entrySource: action.source,
    });
    switch (commit.type) {
      case "toggle-clear":
        clearLegendFocus(commit.source);
        break;
      case "ignore":
        break;
      case "commit":
        legendPreview = null;
        legendCommitted = { identity: action.identity, keys };
        if (deps.interaction() === undefined) localEmphasisKeys = [...keys];
        else
          deps.interaction()!.setEmphasis(keys, {
            scope: deps.resolvedInteractionScope(),
            source: commit.source,
          });
        emitLegendFocus({
          type: "legend-focus",
          phase: "change",
          state: "committed",
          source: commit.source,
          scale: action.identity.scale,
          value: action.entry.value as CellValue,
          label: action.entry.label,
          keys,
        });
        break;
    }
  }

  function legendAction(
    index: number,
    source: LegendEntryAction["source"],
  ): LegendEntryAction | null {
    const target = deps.entries()[index];
    return target === undefined ? null : { identity: target.identity, entry: target.entry, source };
  }

  function previewLegendIndex(index: number, source: "pointer" | "focus"): void {
    if (!deps.legendFocusPreviewEnabled()) return;
    previewLegend(legendAction(index, source));
  }

  function onLegendFocus(index: number): void {
    if (suppressLegendFocusPreview) return;
    previewLegendIndex(index, "focus");
  }

  function moveLegendFocus(index: number, key: string): void {
    const next = moveLegendRovingIndex(index, key, deps.entries().length);
    legendRovingIndex = next;
    deps
      .root()
      ?.querySelector<HTMLElement>(`[data-gg-legend-target][data-index="${String(next)}"]`)
      ?.focus();
  }

  function onLegendKeydown(event: KeyboardEvent, index: number): void {
    // Decision table is pure (legend/surface); this switch owns side
    // effects only. Roving move, commit, and clear stay host-owned.
    const { action, preventDefault } = resolveLegendKeyAction({
      key: event.key,
    });
    if (preventDefault) event.preventDefault();
    switch (action.type) {
      case "move":
        moveLegendFocus(index, action.key);
        break;
      case "commit": {
        const next = legendAction(index, "keyboard");
        if (next !== null) commitLegend(next);
        break;
      }
      case "clear":
        clearLegendFocus("keyboard");
        break;
      case "none":
        break;
    }
  }

  function onLegendPointerDown(event: PointerEvent, index: number): void {
    if (event.pointerType === "touch") legendTouchIndex = index;
  }

  function onLegendPointerUp(event: PointerEvent, index: number): void {
    // Pure gate: touch + matching legendTouchIndex. Host always clears the
    // index and sets suppressLegendClick on touch-commit (exact-once with the
    // synthetic click). pointercancel clears the index in the template.
    const resolved = resolveLegendPointerUpAction({
      pointerType: event.pointerType,
      index,
      touchIndex: legendTouchIndex,
    });
    switch (resolved.type) {
      case "touch-commit": {
        legendTouchIndex = -1;
        suppressLegendClick = true;
        const next = legendAction(index, "touch");
        if (next !== null) commitLegend(next);
        break;
      }
      case "none":
        break;
    }
  }

  function onLegendClick(event: MouseEvent, index: number): void {
    // Pure priority: suppress (after touch) outranks detail-classified commit.
    // detail === 0 is current source classification (not an a11y guarantee).
    const resolved = resolveLegendClickAction({
      suppressClick: suppressLegendClick,
      detail: event.detail,
    });
    switch (resolved.type) {
      case "suppress":
        suppressLegendClick = false;
        break;
      case "commit": {
        const next = legendAction(index, resolved.source);
        if (next !== null) commitLegend(next);
        break;
      }
    }
  }

  function onLegendBlur(event: FocusEvent): void {
    if (
      !shouldClearLegendPreviewOnBlur({
        relatedTarget: event.relatedTarget,
        root: deps.root(),
      })
    )
      return;
    previewLegend(null);
  }

  function setTouchIndexCleared(): void {
    legendTouchIndex = -1;
  }

  function setClearPointerType(type: string | null): void {
    legendClearPointerType = type;
  }

  function onPreviewIndex(index: number): void {
    previewLegendIndex(index, "pointer");
  }

  function onPreviewClear(): void {
    previewLegend(null);
  }

  function installHostDerivedEffects(): void {
    $effect.pre(() => {
      const count = deps.entries().length;
      const active = document.activeElement;
      // Number(dataset.index) may be NaN — pure plan maps non-finite → 0.
      const focusedIndex =
        active instanceof HTMLElement &&
        active.matches("[data-gg-legend-target]") &&
        (deps.root()?.contains(active) ?? false)
          ? Number(active.dataset["index"])
          : null;
      const plan = planLegendRovingFocusSync({
        currentRoving: legendRovingIndex,
        entryCount: count,
        focusedIndex,
      });
      if (plan.nextIndex !== legendRovingIndex) legendRovingIndex = plan.nextIndex;
      if (plan.type !== "refocus") return;
      const returnIndex = plan.returnIndex;
      queueMicrotask(() => {
        deps
          .root()
          ?.querySelector<HTMLElement>(
            `[data-gg-legend-target][data-index="${String(returnIndex)}"]`,
          )
          ?.focus();
      });
    });

    $effect(() => {
      const plan = planLegendCommittedReconcile({
        committed: legendCommitted,
        entries: deps.entries(),
        keyIndex: deps.entryKeys().legendEntryKeyIndex,
        usesLocalEmphasis: deps.interaction() === undefined,
        localEmphasisCount: localEmphasisKeys.length,
      });
      switch (plan.type) {
        case "noop":
          return;
        case "clear-committed":
          legendCommitted = null;
          break;
        case "clear-committed-local-emit":
          legendCommitted = null;
          localEmphasisKeys = [];
          emitLegendFocus({
            type: "legend-focus",
            phase: "clear",
            source: "programmatic",
          });
          break;
      }
    });

    // Reconcile transient preview when data/domain reshuffles entry membership.
    $effect(() => {
      const preview = legendPreview;
      if (preview === null) return;
      const next = reconcileLegendPreview({
        preview: { identity: preview.action.identity, keys: preview.keys },
        entries: deps.entries(),
        keyIndex: deps.entryKeys().legendEntryKeyIndex,
      });
      if (next === null) {
        previewLegend(null);
        return;
      }
      if (samePropertyKeySet(next.keys, preview.keys)) return;
      legendPreview = {
        action: { ...preview.action, identity: next.identity },
        keys: next.keys,
      };
    });

    // Drop chart-local emphasis when legend focus is turned off at runtime.
    $effect(() => {
      const plan = planLegendFocusDisabledClear({
        legendFocusEnabled: deps.legendFocusEnabled(),
        hasPreview: legendPreview !== null,
        hasCommitted: legendCommitted !== null,
        hasLocalEmphasis: localEmphasisKeys.length > 0,
        usesLocalEmphasis: deps.interaction() === undefined,
      });
      switch (plan.type) {
        case "noop":
          return;
        case "clear-host":
          legendPreview = null;
          legendCommitted = null;
          break;
        case "clear-host-local":
          legendPreview = null;
          legendCommitted = null;
          localEmphasisKeys = [];
          break;
      }
    });
  }

  return {
    get effectiveEmphasisKeys() {
      return effectiveEmphasisKeys;
    },
    get previewIdentity() {
      return legendPreview?.action.identity ?? null;
    },
    get rovingIndex() {
      return legendRovingIndex;
    },
    computeInteractiveEntries,
    computeLegendPressed,
    onPreviewIndex,
    onPreviewClear,
    onLegendFocus,
    onLegendKeydown,
    onLegendPointerDown,
    onLegendPointerUp,
    onLegendClick,
    onLegendBlur,
    clearLegendFromControl,
    setTouchIndexCleared,
    setClearPointerType,
    installHostDerivedEffects,
  };
}
