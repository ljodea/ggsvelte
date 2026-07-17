/**
 * Plot runtime: container sizing, model production (runPipeline + scale gate),
 * strata plan, paint ledger, and readiness. Extracted from GGPlot for S1.
 *
 * Effect registration is phased (see registerModelEffects / registerLateEffects)
 * so relative order vs host effects is preserved.
 */
import {
  planStrata,
  runPipeline,
  type RenderModel,
  type ScaleState,
  type Stratum,
} from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";
import { untrack } from "svelte";

import type { LegendFilterClause } from "./legend-filter.js";
import type { ReadonlyZoomDomains } from "./interaction.js";
import { isContainerWidthProp, resolvePlotSize } from "./plot-layout.js";
import { createPaintLedger, isPlotReady } from "./plot-paint.js";

export type PlotRuntimeDeps = {
  widthProp: () => number | "container" | undefined;
  heightProp: () => number | undefined;
  assembled: () => PortableSpec | null;
  effectiveSpec: () => PortableSpec | null;
  effectiveZoomDomains: () => ReadonlyZoomDomains | null;
  effectiveLegendFilters: () => readonly LegendFilterClause[];
  root: () => HTMLDivElement | null;
  /** Silent zoom clear owned by the S4 zoom controller (`resetForScales`). */
  resetZoom: () => void;
  /**
   * Getter for the onrender callback. The dispose/onrender effects wrap the
   * getter invocation in `untrack` so callback identity is not a dependency
   * (matches GGPlot.svelte:677-680).
   */
  onrender: () => ((model: RenderModel, spec: PortableSpec) => void) | undefined;
};

export type PlotRuntime = {
  readonly model: RenderModel | null;
  readonly resolvedWidth: number;
  readonly resolvedHeight: number;
  readonly strata: readonly Stratum[];
  readonly hasCanvas: boolean;
  readonly ready: boolean;
  notifyPainted(runId: number, stratumKey: string): void;
  resetScales(): void;
  /** Register dispose + onrender effects (original position ~after legend resets). */
  registerModelEffects(): void;
  /** Register clientFlush/ready effect (end of script). */
  registerLateEffects(): void;
};

/**
 * Create the plot runtime. Construction registers ONLY the ResizeObserver
 * effect. Call `registerModelEffects` and `registerLateEffects` at their
 * original host positions. Dep getters must not be invoked during construction
 * for construction-time deriveds; the host must declare every binding a dep
 * getter closes over BEFORE calling this factory (declaration order is the
 * topological order; direct construction-time reads of later bindings TDZ).
 */
export function createPlotRuntime(deps: PlotRuntimeDeps): PlotRuntime {
  // ------------------------------------------------- container width (RO)
  let containerWidth = $state<number | null>(null);
  let containerHasPositiveWidth = $state(false);

  $effect(() => {
    // No-op cleanup keeps every code path returning a teardown (consistent-return).
    if (!isContainerWidthProp(deps.widthProp()) || deps.root() === null) return () => {};
    const el = deps.root()!;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      // Debounce resize storms through rAF; the pipeline's run-id gate
      // guarantees only the newest result commits regardless.
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
      containerHasPositiveWidth = nextWidth > 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (nextWidth > 0) containerWidth = nextWidth;
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  const resolvedSize = $derived(
    resolvePlotSize({
      width: deps.widthProp(),
      height: deps.heightProp(),
      containerWidth,
      assembledWidth: deps.assembled()?.width,
      assembledHeight: deps.assembled()?.height,
    }),
  );
  const resolvedWidth = $derived(resolvedSize.width);
  const resolvedHeight = $derived(resolvedSize.height);

  // Authoritative committed scale state: a plain non-reactive box + run-id
  // gate. Committing only monotonically newer runs keeps stale results from
  // clobbering the value-stable color assignments. scaleEpoch exists so
  // resetScales() can force a re-run after clearing the box.
  const scaleBox: {
    runId: number;
    scales: Record<string, ScaleState> | undefined;
  } = { runId: -1, scales: undefined };
  let scaleEpoch = $state(0);

  const model: RenderModel | null = $derived.by(() => {
    void scaleEpoch;
    const effectiveSpec = deps.effectiveSpec();
    if (effectiveSpec === null) return null;
    const m = runPipeline(effectiveSpec, {
      width: resolvedWidth,
      height: resolvedHeight,
      ...(scaleBox.scales !== undefined && { prevScales: scaleBox.scales }),
      ...(deps.effectiveZoomDomains() !== null && {
        baselineScales: deps.assembled()?.scales ?? {},
      }),
      ...(deps.effectiveLegendFilters().length > 0 && {
        rowFilters: deps.effectiveLegendFilters(),
      }),
    });
    if (m.runId > scaleBox.runId) {
      scaleBox.runId = m.runId;
      scaleBox.scales = m.scales.state;
    }
    return m;
  });

  // ---------------------------------------------------------- strata plan
  const strata = $derived(model === null ? [] : planStrata(model.scene, model.layerBackends));
  const canvasCount = $derived(strata.filter((s) => s.backend === "canvas").length);
  const hasCanvas = $derived(canvasCount > 0);

  // Canvas first-paint tracking: data-gg-ready waits for every distinct
  // canvas stratum of the CURRENT model to have painted at least once.
  // paintEpoch bumps so readiness re-derives when the non-reactive ledger
  // mutates (ledger itself must not be $state — set mutations are invisible).
  const paintLedger = createPaintLedger();
  let paintEpoch = $state(0);
  function notifyPainted(runId: number, stratumKey: string): void {
    paintLedger.notify(runId, stratumKey);
    paintEpoch += 1;
  }

  /**
   * Clear the committed scale state (grow-mode recovery: dropped categories
   * lose their reserved colors) and any brush zoom. The next render trains
   * scales fresh from the current data.
   */
  function resetScales(): void {
    scaleBox.runId = -1;
    scaleBox.scales = undefined;
    deps.resetZoom();
    scaleEpoch++;
  }

  // Readiness: clientFlush is false until registerLateEffects runs its effect.
  let clientFlush = $state(false);
  const ready = $derived.by(() => {
    void paintEpoch;
    if (!clientFlush) return false;
    return isPlotReady({
      hasModel: model !== null,
      widthMode: isContainerWidthProp(deps.widthProp()) ? "container" : "fixed",
      containerHasPositiveWidth,
      hasCanvas,
      paintComplete: model !== null && paintLedger.isComplete(model.runId, canvasCount),
    });
  });

  function registerModelEffects(): void {
    // Memory ownership: dispose the previous model once the DOM has moved on
    // (effect cleanup runs post-flush), and the last model on unmount.
    $effect(() => {
      const m = model;
      return () => m?.dispose();
    });

    $effect(() => {
      const m = model;
      const assembled = deps.assembled();
      if (m !== null && assembled !== null) untrack(() => deps.onrender()?.(m, assembled));
    });
  }

  function registerLateEffects(): void {
    // clientFlush via $effect: never runs during SSR → prerender stays
    // data-gg-ready="false" until the first client committed flush (decision 0009)
    $effect(() => {
      clientFlush = true;
    });
  }

  return {
    get model() {
      return model;
    },
    get resolvedWidth() {
      return resolvedWidth;
    },
    get resolvedHeight() {
      return resolvedHeight;
    },
    get strata() {
      return strata;
    },
    get hasCanvas() {
      return hasCanvas;
    },
    get ready() {
      return ready;
    },
    notifyPainted,
    resetScales,
    registerModelEffects,
    registerLateEffects,
  };
}
