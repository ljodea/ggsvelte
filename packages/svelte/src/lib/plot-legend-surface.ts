/**
 * Pure legend surface event decisions for GGPlot.
 *
 * Hosts own DOM handlers, suppress/touch index lifecycle, focus moves,
 * commitLegend side effects, and announcements. This module owns only
 * key routing, touch/click coordination, and commit/preview-dismiss priority.
 */

import type { InteractionSource } from "./interaction/interaction.js";
import {
  legendInteractionSource,
  type LegendEntryIdentity,
  type LegendInteractionSource,
} from "./plot-legend-focus.js";

// ---- keydown ----

export type LegendKeyInput = {
  readonly key: string;
};

type LegendKeyAction =
  | { readonly type: "move"; readonly key: string }
  | { readonly type: "commit" }
  | { readonly type: "clear" }
  | { readonly type: "none" };

export type LegendKeyResolution = {
  readonly action: LegendKeyAction;
  readonly preventDefault: boolean;
};

const isRovingKey = (key: string): boolean =>
  key === "ArrowRight" ||
  key === "ArrowDown" ||
  key === "ArrowLeft" ||
  key === "ArrowUp" ||
  key === "Home" ||
  key === "End";

/**
 * Pure decision for a legend target `keydown` handler.
 * Priority: roving arrows/Home/End → Enter/Space commit → Escape clear → none.
 * Callers own preventDefault, focus move, commitLegend, and clearLegendFocus.
 */
export function resolveLegendKeyAction(input: LegendKeyInput): LegendKeyResolution {
  const { key } = input;

  if (isRovingKey(key)) {
    return { preventDefault: true, action: { type: "move", key } };
  }

  if (key === "Enter" || key === " ") {
    return { preventDefault: true, action: { type: "commit" } };
  }

  if (key === "Escape") {
    return { preventDefault: true, action: { type: "clear" } };
  }

  return { preventDefault: false, action: { type: "none" } };
}

// ---- pointer up (touch commit gate) ----

export type LegendPointerUpInput = {
  readonly pointerType: string;
  readonly index: number;
  /** Host `legendTouchIndex` from pointerdown; -1 if none/cancelled. */
  readonly touchIndex: number;
};

export type LegendPointerUpAction = { readonly type: "touch-commit" } | { readonly type: "none" };

/**
 * Pure decision for legend target `pointerup`.
 * Touch-commit only when pointerType is touch and touchIndex matches index.
 * Host on touch-commit: clear touchIndex, set suppressLegendClick, then commit.
 * Host on none: no suppress flag change (mismatched up after cancel stays quiet).
 *
 * `legendTouchIndex` is a single host slot (not pointerId-keyed). Multi-touch
 * is not modeled; cancel resets the slot before this resolver runs.
 */
export function resolveLegendPointerUpAction(input: LegendPointerUpInput): LegendPointerUpAction {
  if (input.pointerType !== "touch") return { type: "none" };
  if (input.touchIndex !== input.index) return { type: "none" };
  return { type: "touch-commit" };
}

// ---- click ----

export type LegendClickInput = {
  /** Host `suppressLegendClick` after a touch commit. */
  readonly suppressClick: boolean;
  /**
   * MouseEvent.detail classification used by the host today.
   * detail === 0 → source "keyboard" (also true for some programmatic clicks —
   * this is current source classification, not an a11y guarantee).
   */
  readonly detail: number;
};

export type LegendClickAction =
  | { readonly type: "suppress" }
  | { readonly type: "commit"; readonly source: "keyboard" | "pointer" };

/**
 * Pure decision for legend target `click`.
 * Priority: suppressClick → suppress; else commit with detail-classified source.
 * Host on suppress: clear suppressLegendClick and return (exact-once touch).
 * Host on commit: legendAction(index, source) + commitLegend when non-null.
 */
export function resolveLegendClickAction(input: LegendClickInput): LegendClickAction {
  if (input.suppressClick) return { type: "suppress" };
  return {
    type: "commit",
    source: input.detail === 0 ? "keyboard" : "pointer",
  };
}

// ---- clear control click ----

export type LegendClearControlInput = {
  /** MouseEvent.detail from the clear control click. */
  readonly detail: number;
  /**
   * Host `legendClearPointerType` from pointerdown on the clear control
   * (null when never set / after cancel).
   */
  readonly pointerType: string | null;
};

/**
 * Pure InteractionSource for the legend clear control `click`.
 * Priority: detail === 0 → keyboard; pointerType === "touch" → touch; else pointer.
 * Host still clears `legendClearPointerType` after classification.
 */
export function resolveLegendClearControlSource(input: LegendClearControlInput): InteractionSource {
  if (input.detail === 0) return "keyboard";
  if (input.pointerType === "touch") return "touch";
  return "pointer";
}

// ---- blur (preview clear gate) ----

export type LegendBlurInput = {
  readonly relatedTarget: EventTarget | null;
  /** Host plot root; null when unmounted. */
  readonly root: ParentNode | null;
};

/**
 * Whether blur should clear transient legend preview.
 *
 * Retain preview only when focus moves to another legend target **inside this
 * plot's root**. Cross-plot moves to another `[data-gg-legend-target]` must
 * clear, or the previous plot stays muted with a stale preview.
 */
export function shouldClearLegendPreviewOnBlur(input: LegendBlurInput): boolean {
  if (!(input.relatedTarget instanceof Element)) return true;
  if (!input.relatedTarget.matches("[data-gg-legend-target]")) return true;
  if (input.root === null) return true;
  return !input.root.contains(input.relatedTarget);
}

// ---- live region gate ----

export type InteractionLiveRegionInput = {
  readonly surfaceInteractive: boolean;
  readonly legendFocusEnabled: boolean;
  readonly legendFilterEnabled?: boolean;
};

/**
 * Live region is required for surface tools, legend-only focus, **or** legend
 * filtering so keyboard commits/clears and programmatic filter reconciliation
 * still announce when inspect/select/zoom are off.
 */
export function shouldRenderInteractionLiveRegion(input: InteractionLiveRegionInput): boolean {
  return input.surfaceInteractive || input.legendFocusEnabled || input.legendFilterEnabled === true;
}

// ---- commit / preview dismiss ----

export type LegendCommitAction =
  | { readonly type: "toggle-clear"; readonly source: InteractionSource }
  | { readonly type: "ignore" }
  | { readonly type: "commit"; readonly source: InteractionSource };

/**
 * Pure routing for host `commitLegend` after identity + key lookup.
 *
 * Priority (load-bearing):
 *   1. toggle-clear — pressed identity matches action identity
 *   2. ignore — keyCount === 0
 *   3. commit
 *
 * Non-ignore actions carry mapped InteractionSource via `legendInteractionSource`
 * so the host does not re-map `action.source` after routing.
 *
 * Host may compute `keysForLegend(action)` before this call (eager Map.get);
 * keys are unused on toggle-clear but O(1). A pressed entry whose domain keys
 * reshuffled empty still toggles clear (does not fall into ignore).
 */
export function resolveLegendCommitAction(input: {
  readonly pressed: LegendEntryIdentity | null;
  readonly identity: LegendEntryIdentity;
  readonly keyCount: number;
  /** Host: `action.source` (legend entry interaction source). */
  readonly entrySource: LegendInteractionSource;
}): LegendCommitAction {
  const source = legendInteractionSource(input.entrySource);
  if (
    input.pressed !== null &&
    input.pressed.scale === input.identity.scale &&
    input.pressed.entryIndex === input.identity.entryIndex
  )
    return { type: "toggle-clear", source };
  if (input.keyCount === 0) return { type: "ignore" };
  return { type: "commit", source };
}

export type LegendPreviewDismissAction =
  | { readonly type: "none" }
  | { readonly type: "clear-only"; readonly source: InteractionSource }
  | { readonly type: "clear-and-emit"; readonly source: InteractionSource };

/**
 * Pure routing for host `previewLegend(null)` (dismiss path only).
 *
 *   none           — `previewSource === null` (no active preview)
 *   clear-only     — drop preview, no clear event; carries mapped source
 *   clear-and-emit — drop preview and emit legend-focus clear; carries mapped source
 *
 * `previewSource` is host `legendPreview?.action.source ?? null` — a single
 * discriminant (no separate hasActivePreview boolean) so
 * `hasActivePreview: true` with null source is unrepresentable.
 *
 * Emit gate uses **committed** emphasis (`interaction?.emphasized(scope) ??
 * localEmphasisKeys`), not `effectiveEmphasisKeys` (which includes preview).
 * That differs intentionally from `clearLegendFocus`, which ORs preview /
 * committed / effective emphasis before emit.
 */
export function resolveLegendPreviewDismissAction(input: {
  /** Host: `legendPreview?.action.source ?? null`. */
  readonly previewSource: LegendInteractionSource | null;
  readonly committedEmphasisEmpty: boolean;
}): LegendPreviewDismissAction {
  if (input.previewSource === null) return { type: "none" };
  const source = legendInteractionSource(input.previewSource);
  if (input.committedEmphasisEmpty) return { type: "clear-and-emit", source };
  return { type: "clear-only", source };
}

/**
 * Whether `clearLegendFocus` should emit a legend-focus clear event.
 *
 * Unlike `resolveLegendPreviewDismissAction` (preview dismiss), this gate ORs
 * active preview, committed legend entry, and **effective** emphasis key count
 * (preview keys included when present). That matches the host clearing all
 * focus surfaces, not only a transient preview leave.
 */
export function shouldEmitLegendFocusClear(input: {
  readonly hasPreview: boolean;
  readonly hasCommitted: boolean;
  readonly emphasisKeyCount: number;
}): boolean {
  return input.hasPreview || input.hasCommitted || input.emphasisKeyCount > 0;
}
