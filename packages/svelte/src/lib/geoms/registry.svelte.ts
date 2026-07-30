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

// #785: Layer / MarkLayerDescriptor live in runes-free layers/types.ts so
// assemble.ts can share the same union without importing this .svelte.ts file.
// LayerDescriptor alias removed in 0.13.0 (#704) — use MarkLayerDescriptor.
export type { Layer, MarkLayerDescriptor } from "../layers/types.js";
import type { Layer, MarkLayerDescriptor } from "../layers/types.js";
import type { InspectCapabilityChild } from "../interaction/resolve-inspect-capability.js";

/**
 * Host-only interaction capabilities registered by declaration children
 * (`<Inspect>`, later select/zoom/…). Not members of the grammar `Layer`
 * union and never folded into PortableSpec.
 */
export type HostCapabilityKind = "inspect";

/** Value bags per capability kind (extend when more children land). */
export type HostCapabilityValue = {
  readonly inspect: InspectCapabilityChild;
};

type CapabilityEntry<K extends HostCapabilityKind = HostCapabilityKind> = {
  readonly kind: K;
  get value(): HostCapabilityValue[K];
};

let nextId = 0;
let globalVersion = 0;

export class LayerRegistry {
  readonly #byId = new Map<number, Layer>();
  /** Host capabilities — separate from grammar layers (never plotLayers). */
  readonly #capabilities = new Map<number, CapabilityEntry>();
  #version = $state(0);
  /** Monotonic register count (never decrements). For ADR 0001 test assertions. */
  #registrationCount = 0;

  /** Register a mark/geom descriptor (wraps as `{ kind: "mark", descriptor }`). */
  register(descriptor: MarkLayerDescriptor): number {
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

  /**
   * Register a host-only capability (inspect, later select/zoom/…).
   * Live `value` getter is load-bearing (ADR 0001). Returns entry id.
   */
  registerCapability<K extends HostCapabilityKind>(
    kind: K,
    getValue: () => HostCapabilityValue[K],
  ): number {
    const id = nextId++;
    const entry: CapabilityEntry<K> = {
      kind,
      get value() {
        return getValue();
      },
    };
    this.#capabilities.set(id, entry);
    this.#registrationCount += 1;
    this.#version = ++globalVersion;
    return id;
  }

  unregister(id: number): void {
    this.#byId.delete(id);
    this.#capabilities.delete(id);
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
  get markLayers(): readonly MarkLayerDescriptor[] {
    void this.#version;
    const out: MarkLayerDescriptor[] = [];
    for (const layer of this.#byId.values()) {
      if (layer.kind === "mark") out.push(layer.descriptor);
    }
    return out;
  }

  /**
   * Host capability values of `kind` in registration order (reactive).
   * Multiple entries of the same kind are all returned so resolve can last-win
   * and multi-child diagnostics can fire.
   */
  capabilities<K extends HostCapabilityKind>(kind: K): readonly HostCapabilityValue[K][] {
    void this.#version;
    const out: HostCapabilityValue[K][] = [];
    for (const entry of this.#capabilities.values()) {
      if (entry.kind === kind) {
        // entry is CapabilityEntry; kind narrow leaves value as the union of all
        // capability values. Only inspect exists today so this is the inspect bag.
        out.push(entry.value);
      }
    }
    return out;
  }

  /**
   * Monotonic count of successful `register` / `registerPlotLayer` /
   * `registerCapability` calls. Unregister does not decrement. Tests use this
   * to assert ADR 0001's zero-re-registration guarantee under live prop updates.
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
 * Read the ancestor <GGPlot> LayerRegistry, if any. Used by tests that assert
 * ADR 0001 registrationCount under live child updates; inert outside a plot.
 */
export function getLayerRegistry(): LayerRegistry | undefined {
  return getContext<LayerRegistry | undefined>(KEY);
}

/**
 * Called by geom components during component init. Inert (no-op) when there
 * is no <GGPlot> ancestor.
 */
export function registerLayer(descriptor: MarkLayerDescriptor): void {
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

/**
 * Register a host-only capability during component init (e.g. `<Inspect>`).
 * Inert without a <GGPlot> ancestor. Live getter over child props (ADR 0001).
 */
export function registerHostCapability<K extends HostCapabilityKind>(
  kind: K,
  getValue: () => HostCapabilityValue[K],
): void {
  const registry = getContext<LayerRegistry | undefined>(KEY);
  if (!registry) return;
  const id = registry.registerCapability(kind, getValue);
  onDestroy(() => {
    registry.unregister(id);
  });
}
