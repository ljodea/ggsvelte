/**
 * Layer registry for declaration-only children (decision 0001, mechanism A).
 *
 * Contract (all load-bearing, measured in the M0a-1 spike):
 *  - The authoritative store is a plain NON-reactive insertion-ordered Map;
 *    a monotonic version `$state` (distinct value per mutation) drives
 *    reactivity. NEVER a reactive array with read-modify-write: Svelte 5
 *    batching can lose an update when a keyed {#each} destroys one child and
 *    creates another in the same flush.
 *  - Children register DURING COMPONENT INIT (never in $effect) with live
 *    getter descriptors / values over their $props, and unregister in
 *    onDestroy.
 *  - <GGPlot> renders `{@render children?.()}` BEFORE any registry-consuming
 *    markup (SSR correctness depends on it).
 *
 * Layer kinds (#659 slice 1): the Map holds the full `Layer` union (mark +
 * non-mark plot contributions). `markLayers` is the geom-only view used by
 * assembly and the #609 data-identity epoch; `layers` returns every kind in
 * registration order. Non-mark components land in later slices; tests and
 * those components register via `registerPlotLayer`.
 */
import { getContext, onDestroy, setContext } from "svelte";

import type {
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  GeomName,
  GuidesSpec,
  Labs,
  LegendSpec,
  PositionName,
  PositionParams,
  RenderBackend,
  Scales,
  StatName,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";

/**
 * A live mark-layer descriptor: properties are getters over the child's
 * $props, so prop updates flow into the plot's derived spec without
 * re-registration. (`| undefined` is explicit so getter-backed objects
 * satisfy the type under exactOptionalPropertyTypes.)
 *
 * `params` is a plain record: each geom component narrows its own props
 * (typed per-geom), and normalize()/validate() enforce the per-geom schema.
 *
 * Name stays `LayerDescriptor` this slice (the MarkLayerDescriptor rename
 * ships with the deprecation guide anchor in a later slice).
 */
export interface LayerDescriptor {
  readonly geom: GeomName;
  readonly stat?: StatName | undefined;
  readonly aes?: AesInput | undefined;
  /** Optional layer-local data (#589). */
  readonly data?: DataInput | readonly Record<string, unknown>[] | undefined;
  readonly position?: PositionName | undefined;
  readonly positionParams?: PositionParams | undefined;
  readonly render?: RenderBackend | undefined;
  readonly params?: Record<string, unknown> | undefined;
}

/**
 * Everything a declaration-only child may contribute to a plot.
 * Mark/geom layers map onto `spec.layers`; other kinds fold into top-level
 * portable-spec fields (theme/scale/coord/facet/labs/guides/legend).
 *
 * Live getters are load-bearing for non-mark variants exactly as for marks:
 * `value` reads the child's `$props` proxy so prop changes flow through the
 * plot's `$derived` with zero re-registration.
 */
export type Layer =
  | { readonly kind: "mark"; readonly descriptor: LayerDescriptor }
  | { readonly kind: "scale"; get value(): Scales }
  | { readonly kind: "theme"; get value(): ThemeName | ThemeSpec }
  | { readonly kind: "coord"; get value(): CoordSpec | "flip" }
  | { readonly kind: "facet"; get value(): FacetInput }
  | { readonly kind: "labs"; get value(): Labs }
  | { readonly kind: "guides"; get value(): GuidesSpec }
  | { readonly kind: "legend"; get value(): LegendSpec };

let nextId = 0;
let globalVersion = 0;

export class LayerRegistry {
  readonly #byId = new Map<number, Layer>();
  #version = $state(0);
  /** Monotonic register count (never decrements). For ADR 0001 test assertions. */
  #registrationCount = 0;

  /** Register a mark/geom descriptor (wraps as `{ kind: "mark", descriptor }`). */
  register(descriptor: LayerDescriptor): number {
    return this.registerPlotLayer({ kind: "mark", descriptor });
  }

  /** Register any layer kind (mark or non-mark). Returns the entry id. */
  registerPlotLayer(layer: Layer): number {
    const id = nextId++;
    this.#byId.set(id, layer);
    this.#registrationCount += 1;
    this.#version = ++globalVersion;
    return id;
  }

  unregister(id: number): void {
    this.#byId.delete(id);
    this.#version = ++globalVersion;
  }

  /** Every registered layer in registration order (reactive read). */
  get layers(): readonly Layer[] {
    void this.#version; // reactive dependency; the Map itself is non-reactive
    return [...this.#byId.values()];
  }

  /**
   * Mark/geom descriptors only, unwrapped, in registration order.
   * Consumers that need `.data` / `toLayerInput` must use this — not `layers`.
   */
  get markLayers(): readonly LayerDescriptor[] {
    void this.#version;
    const out: LayerDescriptor[] = [];
    for (const layer of this.#byId.values()) {
      if (layer.kind === "mark") out.push(layer.descriptor);
    }
    return out;
  }

  /**
   * Monotonic count of successful `register` / `registerPlotLayer` calls.
   * Unregister does not decrement. Tests use this to assert ADR 0001's
   * zero-re-registration guarantee under live prop updates.
   */
  get registrationCount(): number {
    return this.#registrationCount;
  }
}

const KEY = Symbol("ggsvelte-layer-registry");

/** Called by <GGPlot> during component init. */
export function provideRegistry(): LayerRegistry {
  const registry = new LayerRegistry();
  setContext(KEY, registry);
  return registry;
}

/**
 * Called by geom components during component init. Inert (no-op) when there
 * is no <GGPlot> ancestor.
 */
export function registerLayer(descriptor: LayerDescriptor): void {
  const registry = getContext<LayerRegistry | undefined>(KEY);
  if (!registry) return;
  const id = registry.register(descriptor);
  onDestroy(() => {
    registry.unregister(id);
  });
}

/**
 * Register any plot layer (mark or non-mark) during component init.
 * Inert without a <GGPlot> ancestor. Slices 2–6 use this for theme/scale/
 * coord/facet/labs/guides/legend children; tests use it until those ship.
 */
export function registerPlotLayer(layer: Layer): void {
  const registry = getContext<LayerRegistry | undefined>(KEY);
  if (!registry) return;
  const id = registry.registerPlotLayer(layer);
  onDestroy(() => {
    registry.unregister(id);
  });
}
