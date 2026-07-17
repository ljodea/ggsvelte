/**
 * Legend-filter controller extracted from GGPlot for S2.
 *
 * Owns chart-local filter clauses, mode/capability reset effects, catalog
 * reconciliation (phased registration), and toggle/reset side effects.
 * Construction-time deriveds must NOT read `model` — on Svelte 5.29 the
 * server evaluates $derived eagerly at factory construction (SSR TDZ).
 */
import type { CellValue, RenderModel, SceneDiscreteLegend, SceneLegendEntry } from "@ggsvelte/core";
import { encodeKey } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import {
  isLegendValueVisible,
  nextLegendFilterValues,
  reconcileLegendFilterValues,
  type LegendFilterClause,
  type LegendFilterEvent,
  type LegendFilterInput,
} from "./legend-filter.js";
// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

type ResolvedLegendFilterOptions = {
  readonly mode: "exclude" | "include";
  readonly multiple: boolean;
};

export type FilterableLegendEntry = {
  readonly legend: SceneDiscreteLegend;
  readonly entry: SceneLegendEntry;
  readonly field: string;
  readonly visible: boolean;
};

export type LegendFilterStateDeps = {
  effectiveSpec: () => PortableSpec | null;
  /** Raw prop; options are derived internally. */
  legendFilterProp: () => LegendFilterInput;
  onlegendfilter: () => ((event: LegendFilterEvent) => void) | undefined;
  oninteraction: () => ((event: LegendFilterEvent) => void) | undefined;
  /** Stable announce sink (not a getter). */
  announce: (message: string) => void;
  /**
   * Used ONLY inside late catalog effects (never at construction). Armed-getter
   * construction tests enforce this for Svelte 5.29 server-eager deriveds.
   */
  model: () => RenderModel | null;
};

export type LegendFilterState = {
  readonly options: ResolvedLegendFilterOptions | null;
  /** Effective clauses (capability-gated) — feeds the plot runtime getter. */
  readonly filters: readonly LegendFilterClause[];
  /**
   * Reset-button condition: true when any local clause exists (not merely
   * effective length — transient reconciliation can differ).
   */
  readonly hasActiveFilters: boolean;
  computeEntries(model: RenderModel | null): FilterableLegendEntry[];
  toggle(target: FilterableLegendEntry, event: MouseEvent): void;
  reset(event: MouseEvent): void;
  setPointerType(type: string | null): void;
  /** Register catalog-reconcile effect at its original host position. */
  registerCatalogEffects(entries: () => readonly FilterableLegendEntry[]): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the legend-filter controller. Construction registers ONLY the
 * capability-reset and mode-reset effects (original ~550 region). Call
 * `registerCatalogEffects` at the original catalog position after the
 * runtime's model effects so callback/event order is preserved.
 */
export function createLegendFilterState(deps: LegendFilterStateDeps): LegendFilterState {
  const legendFilterOptions: ResolvedLegendFilterOptions | null = $derived.by(() => {
    const legendFilter = deps.legendFilterProp();
    if (legendFilter === false) return null;
    return {
      mode: typeof legendFilter === "object" ? (legendFilter.mode ?? "exclude") : "exclude",
      multiple: typeof legendFilter === "object" ? (legendFilter.multiple ?? true) : true,
    };
  });
  let localLegendFilters = $state<LegendFilterClause[]>([]);
  let appliedLegendFilterMode = $state<"exclude" | "include" | null>(null);
  const legendCatalogFingerprints = new Map<string, string>();
  const activeLegendFilterBindings = $derived.by(() => {
    const bindings = new Set<string>();
    const effectiveSpec = deps.effectiveSpec();
    if (effectiveSpec === null) return bindings;
    for (const layer of effectiveSpec.layers) {
      for (const scale of ["color", "fill"] as const) {
        const own = layer.aes?.[scale];
        // Explicit null is an unset (normalize's null-unset semantics): the
        // layer deliberately removed the plot-level binding — never inherit.
        if (own === null) continue;
        const channel = own ?? effectiveSpec.aes?.[scale];
        if (channel !== null && channel !== undefined && "field" in channel)
          bindings.add(`${scale}:${channel.field}`);
      }
    }
    return bindings;
  });
  const effectiveLegendFilters = $derived(
    legendFilterOptions === null
      ? []
      : localLegendFilters.filter((clause) =>
          activeLegendFilterBindings.has(`${clause.scale}:${clause.field}`),
        ),
  );

  let legendFilterPointerType: string | null = null;

  function emitLegendFilter(event: LegendFilterEvent): void {
    deps.onlegendfilter()?.(event);
    deps.oninteraction()?.(event);
  }

  // A disabled capability or a remapped spec must never leave an invisible
  // filter active. Reset the chart-local filter set atomically so the public
  // `clear` event always describes the actual resulting state.
  $effect(() => {
    if (effectiveLegendFilters.length === localLegendFilters.length) return;
    localLegendFilters = [];
    emitLegendFilter({
      type: "legend-filter",
      phase: "clear",
      source: "programmatic",
      clause: null,
    });
    deps.announce("Legend filters reset after the filter capability changed.");
  });

  // Mode changes are controlled API changes, not reinterpretations of old
  // state. Reset active clauses so an exclude set can never become a stale
  // include set (or vice versa).
  $effect(() => {
    const mode = legendFilterOptions?.mode ?? null;
    if (appliedLegendFilterMode === null) {
      appliedLegendFilterMode = mode;
      return;
    }
    if (mode === appliedLegendFilterMode) return;
    appliedLegendFilterMode = mode;
    if (localLegendFilters.length === 0) return;
    localLegendFilters = [];
    emitLegendFilter({
      type: "legend-filter",
      phase: "clear",
      source: "programmatic",
      clause: null,
    });
    deps.announce("Legend filters reset after the filter mode changed.");
  });

  function computeEntries(model: RenderModel | null): FilterableLegendEntry[] {
    if (model === null || legendFilterOptions === null) return [];
    return model.scene.legends.flatMap((sceneLegend) => {
      if (sceneLegend.type !== "discrete") return [];
      if (sceneLegend.scale !== "color" && sceneLegend.scale !== "fill") return [];
      const fields = new Set(
        model.layerFields
          .flat()
          .filter((mapped) => mapped.channel === sceneLegend.scale && mapped.source !== "stat")
          .map((mapped) => mapped.field),
      );
      const field = fields.values().next().value;
      // One combined scale fed by unlike fields has no honest one-toggle
      // filtering semantics. Keep the static legend rather than filtering
      // only whichever field happened to be encountered first.
      if (field === undefined || fields.size !== 1) return [];
      // A scaled constant (aes { value, scale: true }) feeds this legend
      // without a field: toggling its entry would filter an unrelated field
      // while the constant-colored layer stays rendered. Keep it static.
      if (
        model.layerScaledConstants.some((constants) => constants[sceneLegend.scale] !== undefined)
      )
        return [];
      const current = localLegendFilters.find(
        (clause) => clause.scale === sceneLegend.scale && clause.field === field,
      );
      return sceneLegend.entries.map((entry) => ({
        legend: sceneLegend,
        entry,
        field,
        visible:
          current === undefined ||
          isLegendValueVisible(current.values, entry.value as CellValue, current.mode),
      }));
    });
  }

  function legendFilterSource(event: MouseEvent): LegendFilterEvent["source"] {
    if (event.detail === 0) return "keyboard";
    return legendFilterPointerType === "touch" ? "touch" : "pointer";
  }

  function toggle(target: FilterableLegendEntry, event: MouseEvent): void {
    if (legendFilterOptions === null) return;
    // This is a controlled checkbox. Prevent the browser's post-handler
    // default toggle from racing the reactive checked value.
    event.preventDefault();
    const catalog = target.legend.entries.map((entry) => entry.value as CellValue);
    const index = localLegendFilters.findIndex(
      (clause) => clause.scale === target.legend.scale && clause.field === target.field,
    );
    const current = localLegendFilters[index];
    const baseline = current?.values ?? (legendFilterOptions.mode === "include" ? catalog : []);
    const values = nextLegendFilterValues(
      baseline,
      target.entry.value as CellValue,
      catalog,
      legendFilterOptions.mode,
      legendFilterOptions.multiple,
    );
    const clause: LegendFilterClause = Object.freeze({
      scale: target.legend.scale as "color" | "fill",
      field: target.field,
      values,
      mode: legendFilterOptions.mode,
    });
    localLegendFilters =
      index < 0
        ? [...localLegendFilters, clause]
        : localLegendFilters.map((candidate, candidateIndex) =>
            candidateIndex === index ? clause : candidate,
          );
    const source = legendFilterSource(event);
    legendFilterPointerType = null;
    const filterEvent: LegendFilterEvent = Object.freeze({
      type: "legend-filter",
      phase: "change",
      source,
      clause,
    });
    emitLegendFilter(filterEvent);
    deps.announce(
      `${target.entry.label} ${isLegendValueVisible(values, target.entry.value as CellValue, legendFilterOptions.mode) ? "shown" : "hidden"}.`,
    );
  }

  function reset(event: MouseEvent): void {
    if (localLegendFilters.length === 0) return;
    // Focus restoration is owned by the child component (zero DOM here).
    const source = legendFilterSource(event);
    localLegendFilters = [];
    legendFilterPointerType = null;
    emitLegendFilter(
      Object.freeze({
        type: "legend-filter",
        phase: "clear",
        source,
        clause: null,
      }),
    );
  }

  function setPointerType(type: string | null): void {
    legendFilterPointerType = type;
  }

  function registerCatalogEffects(entries: () => readonly FilterableLegendEntry[]): void {
    // Catalog changes prune values that no longer exist. An emptied clause is
    // removed, so a category that disappears and later returns is visible by
    // default. resetScales() deliberately does not alter this filter state.
    $effect(() => {
      const catalogs = new Map<string, CellValue[]>();
      for (const target of entries()) {
        const key = `${target.legend.scale}:${target.field}`;
        const catalog = catalogs.get(key) ?? [];
        catalog.push(target.entry.value as CellValue);
        catalogs.set(key, catalog);
      }
      let next = localLegendFilters;
      const reconciled: Array<{
        clause: LegendFilterClause;
        removed: boolean;
      }> = [];
      // A clause whose field is still mapped but whose legend stopped being
      // filterable (second unlike field on the scale, a scaled constant, a
      // non-discrete legend) has no checkbox or reset control left — remove it
      // rather than filtering rows invisibly. Unmapped fields are handled by
      // the capability reset above.
      if (deps.model() !== null && legendFilterOptions !== null) {
        for (const clause of next.filter(
          (candidate) =>
            activeLegendFilterBindings.has(`${candidate.scale}:${candidate.field}`) &&
            !catalogs.has(`${candidate.scale}:${candidate.field}`),
        )) {
          next = next.filter((candidate) => candidate !== clause);
          reconciled.push({ clause, removed: true });
        }
      }
      for (const [key, catalog] of catalogs) {
        const fingerprint = JSON.stringify(catalog.map((value) => encodeKey(value)));
        const priorFingerprint = legendCatalogFingerprints.get(key);
        legendCatalogFingerprints.set(key, fingerprint);
        if (priorFingerprint === undefined || priorFingerprint === fingerprint) continue;
        const index = next.findIndex((clause) => `${clause.scale}:${clause.field}` === key);
        if (index < 0) continue;
        const clause = next[index]!;
        const values = reconcileLegendFilterValues(clause.values, catalog);
        reconciled.push({
          clause: Object.freeze({ ...clause, values }),
          removed: values.length === 0,
        });
        next =
          values.length === 0
            ? next.filter((_, candidateIndex) => candidateIndex !== index)
            : next.map((candidate, candidateIndex) =>
                candidateIndex === index ? Object.freeze({ ...candidate, values }) : candidate,
              );
      }
      for (const key of legendCatalogFingerprints.keys())
        if (!catalogs.has(key)) legendCatalogFingerprints.delete(key);
      if (next === localLegendFilters) return;
      localLegendFilters = [...next];
      for (const { clause, removed } of reconciled)
        emitLegendFilter({
          type: "legend-filter",
          phase: removed ? "remove" : "change",
          source: "programmatic",
          clause,
        });
      deps.announce("Legend filters reconciled with the available groups.");
    });
  }

  return {
    get options() {
      return legendFilterOptions;
    },
    get filters() {
      return effectiveLegendFilters;
    },
    get hasActiveFilters() {
      return localLegendFilters.length > 0;
    },
    computeEntries,
    toggle,
    reset,
    setPointerType,
    registerCatalogEffects,
  };
}
