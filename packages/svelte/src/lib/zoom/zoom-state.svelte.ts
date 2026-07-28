/**
 * Zoom controller extracted from GGPlot for S4.
 *
 * Owns chart-local zoom domains, effective-domain / effective-spec deriveds,
 * and zoom commit/reset/brush/set handlers. Construction-time deriveds must
 * NOT read model/announce (later-declared / handler-only;
 * construction-order DAG). Those are handler-only deferred getters.
 */
import type { CellValue, RenderModel } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import type { PlotInteractionController } from "../interaction/controller.svelte.js";
import type {
  InteractionSource,
  PlotInteractionEvent,
  PlotInteractionScope,
  ResolvedInteractionConfig,
  ZoomEvent,
} from "../interaction/interaction.js";
import { createScopedStore } from "../interaction/scoped-store.svelte.js";
import { frozenZoomDomains, type ContinuousZoomDomains } from "../scene/geometry.js";
import { zoomAnnouncement } from "../assembly/labels.js";
import {
  applyZoomToSpec,
  buildZoomEvent,
  continuousZoomDomainsFromScopes,
  filterScopeChannelsByZoomMode,
  filterZoomDomainsByMode,
  resolveBrushZoomFromModel,
  sanitizePartialZoomDomains,
  stableZoomDomains,
} from "./zoom.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PlotZoomStateDeps = {
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  resolvedInteractionScope: () => PlotInteractionScope;
  /** Narrow getter over `interactionConfig.zoom` (mode + null gate). */
  zoomConfig: () => ResolvedInteractionConfig["zoom"];
  assembled: () => PortableSpec | null;
  /**
   * Deferred: the runtime model alias and the coord-flip derived are declared
   * after createPlotRuntime in the host — handler-only reads.
   */
  model: () => RenderModel | null;
  onzoom: () => ((event: ZoomEvent) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  /** Stable sink; announcer is declared later — handler-only. */
  announce: (message: string) => void;
};

export type PlotZoomState = {
  readonly effectiveZoomDomains: ContinuousZoomDomains | null;
  readonly effectiveSpec: PortableSpec | null;
  commitZoom(domains: ContinuousZoomDomains | null, source: InteractionSource): void;
  resetZoom(source?: InteractionSource): void;
  setZoomDomains(domains: Partial<ContinuousZoomDomains>): void;
  onDblClick(): void;
  applyBrushZoom(
    rect: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    },
    source: InteractionSource,
  ): void;
  /** Silent scale-reset path (runtime dep; no event / announcement). */
  resetForScales(): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the zoom controller. Construction registers only the
 * construction-time `effectiveZoomDomains` / `effectiveSpec` deriveds (over
 * earlier host bindings). Handlers may read later-declared bindings via
 * deferred getters (`model`, `announce`).
 */
export function createPlotZoomState(deps: PlotZoomStateDeps): PlotZoomState {
  // Memoize prior bag so selection/emphasis revisions do not retrain zoom.
  let previousEffectiveZoomDomains: ContinuousZoomDomains | null = null;

  const zoomDomains = createScopedStore<ContinuousZoomDomains | null>({
    initial: null,
    empty: null,
    controller: deps.interaction,
    scope: deps.resolvedInteractionScope,
    read: (controller, scope) =>
      // Gate shared domains by this plot's resolved zoom mode (null when
      // disabled / faceted-unsupported) so x-only plots ignore y domains.
      filterZoomDomainsByMode(controller.zoom(scope), deps.zoomConfig()?.mode ?? null),
    write: (controller, next, scope, source) => {
      // Match filterZoomDomainsByMode: x-only plots must not mutate shared y.
      const mutationScope = filterScopeChannelsByZoomMode(scope, deps.zoomConfig()?.mode ?? null);
      if (next === null) {
        const transition = controller.resetZoom({ scope: mutationScope, source });
        return transition === null ? null : { value: null };
      }
      const transition = controller.setZoom(next, { scope: mutationScope, source });
      if (transition === null) return null;
      return {
        value: frozenZoomDomains(
          continuousZoomDomainsFromScopes(
            transition.snapshot.zoom,
            mutationScope.x,
            mutationScope.y,
          ),
        ),
      };
    },
    clearShared: (controller, scope, source) =>
      controller.resetZoom({
        scope: filterScopeChannelsByZoomMode(scope, deps.zoomConfig()?.mode ?? null),
        source,
      }) !== null,
  });

  const effectiveZoomDomains: ContinuousZoomDomains | null = $derived.by(() => {
    const next = stableZoomDomains(previousEffectiveZoomDomains, zoomDomains.value);
    previousEffectiveZoomDomains = next;
    return next;
  });

  function resolveEffectiveSpec(): PortableSpec | null {
    const assembled = deps.assembled();
    if (assembled === null || effectiveZoomDomains === null) return assembled;
    return applyZoomToSpec(assembled, effectiveZoomDomains);
  }
  const effectiveSpec: PortableSpec | null = $derived.by(resolveEffectiveSpec);

  function commitZoom(domains: ContinuousZoomDomains | null, source: InteractionSource): void {
    const committed = zoomDomains.set(domains, source);
    if (committed === null) return;
    const event = buildZoomEvent(committed.value, source);
    deps.announce(zoomAnnouncement(committed.value));
    deps.onzoom()?.(event);
    deps.oninteraction()?.(event);
  }

  function resetZoom(source: InteractionSource = "programmatic"): void {
    if (effectiveZoomDomains === null) return;
    commitZoom(null, source);
  }

  function setZoomDomains(domains: Partial<ContinuousZoomDomains>): void {
    const next = sanitizePartialZoomDomains(domains, deps.model()?.scales, effectiveZoomDomains);
    if (next === null) return;
    commitZoom(frozenZoomDomains(next), "programmatic");
  }

  function onDblClick(): void {
    if (deps.zoomConfig() === null) return;
    resetZoom("pointer");
  }

  /**
   * Brush-to-zoom = an intentional respec: invert the brushed plot-px rect
   * through the trained scales into explicit continuous domains. Band axes
   * and faceted plots are skipped (documented M2 limitation) inside
   * `resolveBrushZoomFromModel`.
   */
  function applyBrushZoom(
    rect: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    },
    source: InteractionSource,
  ): void {
    // Pure owns null/multi-panel gate, invert, and freeze for commit.
    const next = resolveBrushZoomFromModel({
      model: deps.model(),
      rect,
      mode: deps.zoomConfig()?.mode ?? "xy",
      current: effectiveZoomDomains,
    });
    if (next === null) return;
    commitZoom(next, source);
  }

  function resetForScales(): void {
    // Silent path: no event / announcement. Prefer clear() so local and shared
    // storage stay interchangeable without an interaction fork at the call site.
    zoomDomains.clear("programmatic");
  }

  return {
    get effectiveZoomDomains() {
      return effectiveZoomDomains;
    },
    get effectiveSpec() {
      // Svelte 5.33 SSR does not invalidate construction-time deriveds after
      // declaration-only children register in the same server pass.
      return typeof window === "undefined" ? resolveEffectiveSpec() : effectiveSpec;
    },
    commitZoom,
    resetZoom,
    setZoomDomains,
    onDblClick,
    applyBrushZoom,
    resetForScales,
  };
}
