/**
 * Interaction controller assembly — one factory that constructs all five
 * interaction controllers in their topological order and wires the sibling
 * ports internally.
 *
 * Before this module, plot-engine.svelte.ts hand-wired the construction DAG
 * across ~200 lines, with `let surfaceState!` / `let semanticCandidateProjection!`
 * late bindings to break the surface ↔ inspection ↔ interval ↔ selection
 * cycles. Here the order is an implementation detail:
 *
 *   zoom → selection → interval → surface → inspection
 *
 * The two irreducible ordering constraints:
 * - surface is constructed before inspection so the shared interaction
 *   reducer exists as a concrete instance (inspection no longer closes over
 *   a later surface binding);
 * - interval / surface receive sibling controllers as handler-only getters
 *   over the bundle under construction (event-time reads only — every
 *   controller documents its construction-time reads as context-only).
 *
 * Host-derived enablement (availableTools, pointSelectEnabled, surfaceInter-
 * active) and host-owned slices (dataIdentityEpoch, consumptionCandidates,
 * clearAnnouncement) arrive via options; everything shared arrives via the
 * InteractionContext.
 */
import type {
  InspectionState,
  InspectionStateOptions,
} from "../inspection/inspection-state.svelte.js";
import { createInspectionState } from "../inspection/inspection-state.svelte.js";
import type { IntervalState, IntervalStateOptions } from "../interval/interval-state.svelte.js";
import { createIntervalState } from "../interval/interval-state.svelte.js";
import type { SelectionState } from "../selection/selection-state.svelte.js";
import { createSelectionState } from "../selection/selection-state.svelte.js";
import type { SurfaceState, SurfaceStateOptions } from "../surface/surface-state.svelte.js";
import { createSurfaceState } from "../surface/surface-state.svelte.js";
import type { PlotZoomState, PlotZoomStateOptions } from "../zoom/zoom-state.svelte.js";
import { createPlotZoomState } from "../zoom/zoom-state.svelte.js";
import type { InteractionContext } from "./interaction-context.svelte.js";

/** The five interaction controllers, keyed by role. */
export type InteractionStates = {
  readonly zoom: PlotZoomState;
  readonly selection: SelectionState;
  readonly interval: IntervalState;
  readonly surface: SurfaceState;
  readonly inspection: InspectionState;
};

/**
 * Host-owned slices the assembly cannot derive from the context. Sibling
 * ports (reducer, emitSelection, commitZoom, inspection/interval/zoom
 * getters) are wired internally — hosts never see them.
 */
export type InteractionStatesOptions = {
  readonly zoom: PlotZoomStateOptions;
  readonly interval: Pick<IntervalStateOptions, "consumptionCandidates">;
  readonly surface: Pick<
    SurfaceStateOptions,
    "toolProp" | "initialTool" | "availableTools" | "pointSelectEnabled" | "surfaceInteractive"
  >;
  readonly inspection: Omit<InspectionStateOptions, "reducer">;
};

/**
 * Construct all five interaction controllers. Call once during component
 * init (controllers register $derived/$effect in the calling effect tree).
 */
export function createInteractionStates(
  context: InteractionContext,
  options: InteractionStatesOptions,
): InteractionStates {
  // Sibling ports close over these bindings; assigned in topological order
  // below and read only at handler time, never during construction.
  let interval: IntervalState;
  let inspection: InspectionState;

  const zoom = createPlotZoomState(context, options.zoom);
  const selection = createSelectionState(context);

  interval = createIntervalState(context, {
    consumptionCandidates: options.interval.consumptionCandidates,
    effectiveZoomDomains: () => zoom.effectiveZoomDomains,
    commitZoom: (domains, source) => {
      zoom.commitZoom(domains, source);
    },
    inspectionPanel: () => inspection.inspectionPanel,
    emitSelection: (event) => {
      selection.emitSelection(event);
    },
  });

  const surface = createSurfaceState(context, {
    ...options.surface,
    inspection: () => inspection,
    interval: () => interval,
    zoom: () => zoom,
    emitSelection: (event) => {
      selection.emitSelection(event);
    },
    togglePointKeys: (keys, source) => {
      selection.togglePointKeys(keys, source);
    },
  });

  inspection = createInspectionState(context, {
    ...options.inspection,
    // Concrete reducer — surface is already constructed, so inspection no
    // longer closes over a later surface binding (was `let surfaceState!`).
    reducer: surface.reducer,
  });

  return { zoom, selection, interval, surface, inspection };
}
