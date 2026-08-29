import { isAreaTool, type InteractionTool } from "../interaction/interaction.js";
import {
  nudgeBrushEnd,
  panelCenterAnchor,
  type BrushCorners,
  type PlotPoint,
} from "./area-brush.js";
import { normalizedRect, type PanelBounds } from "../scene/geometry.js";
import { resolveFinishBrushAction, type FinishBrushAction } from "./brush-finish.js";

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
   * Host: panel containing inspection focus anchor, or null.
   * Preferred clamp panel for nudge-brush over `firstPanel`.
   */
  readonly inspectionPanel: PanelBounds | null;
  /**
   * Host: first semantic-viewport panel bounds (`panelBoundsFrom(viewport.panels[0].bounds)`).
   * Panel-center fallback for `begin-area` when no inspection anchor; also
   * nudge clamp fallback after inspectionPanel (#1038).
   */
  readonly firstPanel: PanelBounds | undefined;
};

type SurfaceKeyAction =
  | {
      readonly type: "nudge-brush";
      /** Clamped draft after free-corner nudge; host assigns brushRect. */
      readonly corners: BrushCorners;
    }
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

function arrowDelta(key: string, step: number): PlotPoint {
  const horizontal = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
  const vertical = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
  return { x: horizontal, y: vertical };
}

function resolveAreaArrow(input: SurfaceKeyboardInput): SurfaceKeyResolution {
  const panel = input.inspectionPanel ?? input.firstPanel;
  if (panel === undefined || input.brushCorners === null) {
    return { preventDefault: true, action: { type: "none" } };
  }
  const { x: dx, y: dy } = arrowDelta(input.key, input.shiftKey ? 10 : 1);
  return {
    preventDefault: true,
    action: {
      type: "nudge-brush",
      corners: nudgeBrushEnd(input.brushCorners, dx, dy, panel),
    },
  };
}

function resolveAreaCommit(input: SurfaceKeyboardInput): SurfaceKeyResolution {
  const action: SurfaceKeyAction =
    input.brushCorners === null
      ? {
          type: "begin-area",
          anchor: input.inspectionAnchor ?? panelCenterAnchor(input.firstPanel),
        }
      : {
          type: "complete-area",
          finish: resolveFinishBrushAction({
            ended: { kind: "commit", rect: normalizedRect(input.brushCorners) },
            activeTool: input.activeTool,
          }),
        };
  return { preventDefault: true, action };
}

function resolveInspectionActivation(input: SurfaceKeyboardInput): SurfaceKeyResolution | null {
  if (input.activeTool === "point" && input.hasInspection) {
    return {
      preventDefault: true,
      action: {
        type: "toggle-point-keys",
        keys: input.focusKey === null ? input.sourceKeys : [input.focusKey],
      },
    };
  }
  if (input.hasInspection && input.pinEnabled) {
    return { preventDefault: true, action: { type: "toggle-pin" } };
  }
  return null;
}

/**
 * Pure decision table for the plot capture-surface `keydown` handler.
 * Preserves existing priority: area draft arrows → area Enter/Space →
 * coincident cycle → inspect arrows → point toggle → pin → Escape.
 * Callers own side effects (brush mutation, inspection, tool changes).
 */
export function resolveSurfaceKeyAction(input: SurfaceKeyboardInput): SurfaceKeyResolution {
  const { key, activeTool, brushCorners } = input;
  const area = isAreaTool(activeTool);
  const hasDraft = brushCorners !== null;

  if (area && key.startsWith("Arrow") && hasDraft) {
    return resolveAreaArrow(input);
  }

  if (area && (key === "Enter" || key === " ")) {
    return resolveAreaCommit(input);
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
    const { x: dx, y: dy } = arrowDelta(key, 1);
    return {
      preventDefault: true,
      action: {
        type: "navigate-direction",
        dx,
        dy,
      },
    };
  }

  if (key === "Enter" || key === " ") {
    const activation = resolveInspectionActivation(input);
    if (activation !== null) return activation;
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
