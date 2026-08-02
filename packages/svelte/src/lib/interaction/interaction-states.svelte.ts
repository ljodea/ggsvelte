/**
 * Interaction controller assembly — owns construction order and sibling-port
 * wiring for the five interaction controllers (zoom, selection, interval,
 * surface, inspection).
 *
 * Before this module, plot-engine.svelte.ts hand-wired the construction DAG
 * across ~200 lines, with `let surfaceState!` / `let semanticCandidateProjection!`
 * late bindings to break the surface ↔ inspection ↔ interval ↔ selection
 * cycles.
 *
 * Why two phases
 * --------------
 * On SSR the Svelte compiler evaluates `$derived` eagerly at declaration, so
 * construction order must be the exact topological order of every derived
 * read — not just handler-time reads. The full DAG interleaves with host
 * controllers:
 *
 *   zoom → legendFilter → runtime → semanticKeys → selection → interval →
 *   surface → inspection
 *
 * Phase 1 (`createInteractionAssembly`) constructs zoom, the only controller
 * the legend-filter / runtime chain reads. Phase 2 (`complete`) — called by
 * the host once the runtime and semantic-key service exist — constructs
 * selection → interval → surface → inspection and wires all sibling ports
 * internally:
 *
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
  readonly interval: Pick<IntervalStateOptions, "consumptionCandidates">;
  readonly surface: Pick<
    SurfaceStateOptions,
    "toolProp" | "initialTool" | "availableTools" | "pointSelectEnabled" | "surfaceInteractive"
  >;
  readonly inspection: Omit<InspectionStateOptions, "reducer">;
};

/** Phase-1 result: zoom (consumed by the host's legend-filter / runtime
 * chain) plus the phase-2 completion hook. */
export type InteractionAssembly = {
  readonly zoom: PlotZoomState;
  /**
   * Phase 2 — call once the runtime and semantic-key service exist (SSR
   * evaluates deriveds eagerly at construction, so model-reading controllers
   * must be constructed after the runtime). Constructs selection → interval
   * → surface → inspection and returns the full bundle.
   */
  complete(options: InteractionStatesOptions): InteractionStates;
};

/**
 * Phase 1: construct the zoom controller (model-free at construction) and
 * return the assembly handle. Call `complete` after the host runtime exists.
 * Call once during component init (controllers register $derived/$effect in
 * the calling effect tree).
 */
export function createInteractionAssembly(
  context: InteractionContext,
  options: { readonly zoom: PlotZoomStateOptions },
): InteractionAssembly {
  const zoom = createPlotZoomState(context, options.zoom);

  return {
    zoom,
    complete(phase2: InteractionStatesOptions): InteractionStates {
      // Sibling ports close over these bindings; assigned in topological
      // order below and read only at handler time, never during construction.
      let interval: IntervalState;
      let inspection: InspectionState;

      const selection = createSelectionState(context);

      interval = createIntervalState(context, {
        consumptionCandidates: phase2.interval.consumptionCandidates,
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
        ...phase2.surface,
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
        ...phase2.inspection,
        // Concrete reducer — surface is already constructed, so inspection
        // no longer closes over a later surface binding (was `let
        // surfaceState!`).
        reducer: surface.reducer,
      });

      return { zoom, selection, interval, surface, inspection };
    },
  };
}
