import { isAreaTool, type InteractionTool } from "./interaction.js";
import { panelCenterAnchor, type BrushCorners, type PlotPoint } from "./plot-area-brush.js";
import { normalizedRect, type PanelBounds } from "./plot-geometry.js";
import { resolveFinishBrushAction, type FinishBrushAction } from "./plot-brush-finish.js";

/**
 * Capture-surface keyboard decision input.
 *
 * `brushCorners` is the sole draft source of truth (host: `brushRect`).
 * Distinct from reducer `brushing`, which can diverge when the draft corners
 * and area machine are out of sync. Null means no draft — no separate
 * `hasBrushDraft` boolean so illegal combos are unrepresentable.
 */
export type SurfaceKeyboardInput = {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly activeTool: InteractionTool;
  /**
   * Host: `brushRect`. Non-null when a draft free corner exists.
   * Gates nudge-brush, complete-area, and Escape returnToInspect.
   */
  readonly brushCorners: BrushCorners | null;
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
  /**
   * Host: `inspection?.focus.anchor ?? null`.
   * Meaningful for `begin-area` (preferred over firstPanel center).
   */
  readonly inspectionAnchor: PlotPoint | null;
  /**
   * Host: `model?.scene.panels[0]`. Panel-center fallback for `begin-area`
   * when no inspection anchor. Host still uses `panelId(0)` for dispatch
   * (index-based, not derived from this panel reference).
   */
  readonly firstPanel: PanelBounds | undefined;
};

type SurfaceKeyAction =
  | { readonly type: "nudge-brush"; readonly dx: number; readonly dy: number }
  | {
      readonly type: "begin-area";
      /** Inspection anchor if present, else panel center (or {0,0}). */
      readonly anchor: PlotPoint;
    }
  | {
      /**
       * Pure table owns normalize + select/zoom/end routing (shared finish
       * owner with pointer). Keyboard always commits the current draft
       * (`kind: "commit"`) — no free-corner too-small evaluation.
       */
      readonly type: "complete-area";
      readonly finish: FinishBrushAction;
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
    brushCorners,
    hasInspection,
    pinEnabled,
    focusKey,
    sourceKeys,
    inspectionAnchor,
    firstPanel,
  } = input;
  const area = isAreaTool(activeTool);
  const hasDraft = brushCorners !== null;

  if (area && key.startsWith("Arrow") && hasDraft) {
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
      action:
        brushCorners === null
          ? {
              type: "begin-area",
              anchor: inspectionAnchor ?? panelCenterAnchor(firstPanel),
            }
          : {
              type: "complete-area",
              // Keyboard commits the live draft as-is (no free-corner update).
              // Zero-size drafts still route as commit → select/zoom/end-area.
              finish: resolveFinishBrushAction({
                ended: { kind: "commit", rect: normalizedRect(brushCorners) },
                activeTool,
              }),
            },
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
        returnToInspect: !hasDraft && area,
      },
    };
  }

  return { preventDefault: false, action: { type: "none" } };
}
