import { isAreaTool, type InteractionTool } from "./interaction.js";

/**
 * Capture-surface keyboard decision input. `hasBrushDraft` mirrors
 * `brushRect !== null` in GGPlot — distinct from reducer `brushing`, which can
 * diverge when the draft corners and area machine are out of sync.
 */
export type SurfaceKeyboardInput = {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly activeTool: InteractionTool;
  /** True when a brush draft corner exists (`brushRect !== null`). */
  readonly hasBrushDraft: boolean;
  readonly hasInspection: boolean;
  readonly pinEnabled: boolean;
  /**
   * Inspection focus key when `hasInspection` (host: `inspection?.focus.key ?? null`).
   * Meaningful only for `toggle-point-keys`; unused on other actions.
   */
  readonly focusKey: PropertyKey | null;
  /**
   * Inspection sourceKeys when `hasInspection` (host: `inspection?.focus.sourceKeys ?? []`).
   * Meaningful only for `toggle-point-keys`; unused on other actions.
   */
  readonly sourceKeys: readonly PropertyKey[];
};

type SurfaceKeyAction =
  | { readonly type: "nudge-brush"; readonly dx: number; readonly dy: number }
  | { readonly type: "begin-area" }
  | {
      readonly type: "complete-area";
      /** Host: select-area → interval end; zoom-area → brush zoom. */
      readonly finish: "select" | "zoom";
    }
  | { readonly type: "cycle-coincident"; readonly delta: 1 | -1 }
  | {
      readonly type: "navigate-direction";
      readonly dx: number;
      readonly dy: number;
    }
  | {
      readonly type: "toggle-point-keys";
      /** Keys to toggle: `[focusKey]` when non-null, else `sourceKeys`. */
      readonly keys: readonly PropertyKey[];
    }
  | { readonly type: "toggle-pin" }
  | { readonly type: "escape"; readonly returnToInspect: boolean }
  | { readonly type: "none" };

type SurfaceKeyResolution = {
  readonly action: SurfaceKeyAction;
  readonly preventDefault: boolean;
};

/**
 * Pure decision table for the plot capture-surface `keydown` handler.
 * Preserves existing priority: area draft arrows → area Enter/Space →
 * coincident cycle → inspect arrows → point toggle → pin → Escape.
 * Callers own side effects (brush mutation, inspection, tool changes).
 */
export function resolveSurfaceKeyAction(input: SurfaceKeyboardInput): SurfaceKeyResolution {
  const {
    key,
    shiftKey,
    activeTool,
    hasBrushDraft,
    hasInspection,
    pinEnabled,
    focusKey,
    sourceKeys,
  } = input;
  const area = isAreaTool(activeTool);

  if (area && key.startsWith("Arrow") && hasBrushDraft) {
    const step = shiftKey ? 10 : 1;
    const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
    const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
    return {
      preventDefault: true,
      action: { type: "nudge-brush", dx, dy },
    };
  }

  if (area && (key === "Enter" || key === " ")) {
    return {
      preventDefault: true,
      action: hasBrushDraft
        ? {
            type: "complete-area",
            finish: activeTool === "select-area" ? "select" : "zoom",
          }
        : { type: "begin-area" },
    };
  }

  if (key === "]" || key === "[") {
    return {
      preventDefault: true,
      action: {
        type: "cycle-coincident",
        delta: key === "]" ? 1 : -1,
      },
    };
  }

  if (key.startsWith("Arrow")) {
    return {
      preventDefault: true,
      action: {
        type: "navigate-direction",
        dx: key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0,
        dy: key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0,
      },
    };
  }

  if ((key === "Enter" || key === " ") && activeTool === "point" && hasInspection) {
    return {
      preventDefault: true,
      action: {
        type: "toggle-point-keys",
        keys: focusKey === null ? sourceKeys : [focusKey],
      },
    };
  }

  if ((key === "Enter" || key === " ") && hasInspection && pinEnabled) {
    return { preventDefault: true, action: { type: "toggle-pin" } };
  }

  if (key === "Escape") {
    return {
      preventDefault: true,
      action: {
        type: "escape",
        returnToInspect: !hasBrushDraft && area,
      },
    };
  }

  return { preventDefault: false, action: { type: "none" } };
}
