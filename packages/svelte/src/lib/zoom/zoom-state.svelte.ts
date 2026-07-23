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
  let localZoomDomains = $state<ContinuousZoomDomains | null>(null);
  // Memoize prior bag so selection/emphasis revisions do not retrain zoom.
  let previousEffectiveZoomDomains: ContinuousZoomDomains | null = null;

  const effectiveZoomDomains: ContinuousZoomDomains | null = $derived.by(() => {
    // Equivalent dependency to the host `controllerRevision` derived —
    // read interaction revision directly (no extra dep).
    void (deps.interaction()?.revision ?? 0);
    let next: ContinuousZoomDomains | null;
    if (deps.interaction() === undefined) {
      next = localZoomDomains;
    } else {
      // Gate shared domains by this plot's resolved zoom mode (null when
      // disabled / faceted-unsupported) so x-only plots ignore y domains.
      next = filterZoomDomainsByMode(
        deps.interaction()!.zoom(deps.resolvedInteractionScope()),
        deps.zoomConfig()?.mode ?? null,
      );
    }
    next = stableZoomDomains(previousEffectiveZoomDomains, next);
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
    let committed: ContinuousZoomDomains | null = domains;
    if (deps.interaction() === undefined) {
      if (domains === null && localZoomDomains === null) return;
      localZoomDomains = domains;
    } else {
      // Match filterZoomDomainsByMode: x-only plots must not mutate shared y.
      const mutationScope = filterScopeChannelsByZoomMode(
        deps.resolvedInteractionScope(),
        deps.zoomConfig()?.mode ?? null,
      );
      const transition =
        domains === null
          ? deps.interaction()!.resetZoom({ scope: mutationScope, source })
          : deps.interaction()!.setZoom(domains, {
              scope: mutationScope,
              source,
            });
      if (transition === null) return;
      if (domains !== null) {
        committed = frozenZoomDomains(
          continuousZoomDomainsFromScopes(
            transition.snapshot.zoom,
            mutationScope.x,
            mutationScope.y,
          ),
        );
      }
    }
    const event = buildZoomEvent(committed, source);
    deps.announce(zoomAnnouncement(committed));
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
    if (deps.interaction() === undefined) localZoomDomains = null;
    else
      deps.interaction()!.resetZoom({
        scope: filterScopeChannelsByZoomMode(
          deps.resolvedInteractionScope(),
          deps.zoomConfig()?.mode ?? null,
        ),
      });
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
