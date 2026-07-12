/**
 * Layer registry for declaration-only children (decision 0001, mechanism A).
 *
 * Contract (all load-bearing, measured in the M0a-1 spike):
 *  - The authoritative store is a plain NON-reactive insertion-ordered Map;
 *    a monotonic version `$state` (distinct value per mutation) drives
 *    reactivity. NEVER a reactive array with read-modify-write: Svelte 5
 *    batching can lose an update when a keyed {#each} destroys one child and
 *    creates another in the same flush.
 *  - Geom children register DURING COMPONENT INIT (never in $effect) with
 *    live getter descriptors over their $props, and unregister in onDestroy.
 *  - <GGPlot> renders `{@render children?.()}` BEFORE any registry-consuming
 *    markup (SSR correctness depends on it).
 */
import { getContext, onDestroy, setContext } from "svelte";

import type {
  AesInput,
  GeomName,
  PositionName,
  PositionParams,
  RenderBackend,
  StatName,
} from "@ggsvelte/spec";

/**
 * A live layer descriptor: properties are getters over the child's $props,
 * so prop updates flow into the plot's derived spec without re-registration.
 * (`| undefined` is explicit so getter-backed objects satisfy the type under
 * exactOptionalPropertyTypes.)
 *
 * `params` is a plain record: each geom component narrows its own props
 * (typed per-geom), and normalize()/validate() enforce the per-geom schema.
 */
export interface LayerDescriptor {
  readonly geom: GeomName;
  readonly stat?: StatName | undefined;
  readonly aes?: AesInput | undefined;
  readonly position?: PositionName | undefined;
  readonly positionParams?: PositionParams | undefined;
  readonly render?: RenderBackend | undefined;
  readonly params?: Record<string, unknown> | undefined;
}

let nextId = 0;
let globalVersion = 0;

export class LayerRegistry {
  readonly #byId = new Map<number, LayerDescriptor>();
  #version = $state(0);

  register(descriptor: LayerDescriptor): number {
    const id = nextId++;
    this.#byId.set(id, descriptor);
    this.#version = ++globalVersion;
    return id;
  }

  unregister(id: number): void {
    this.#byId.delete(id);
    this.#version = ++globalVersion;
  }

  /** Registered descriptors in registration order (reactive read). */
  get layers(): readonly LayerDescriptor[] {
    void this.#version; // reactive dependency; the Map itself is non-reactive
    return [...this.#byId.values()];
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
