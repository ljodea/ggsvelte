/**
 * M0a-1 spike: declaration-only children.
 *
 * Mechanism under test:
 *  - <GGPlot> creates a LayerRegistry and setContext()s it during component init.
 *  - Each geom child calls registerLayer() during ITS component init (synchronous,
 *    template order) — NOT inside $effect / $effect.pre. The descriptor it registers
 *    is a "live" object whose properties are getters over the child's $props, so
 *    later prop changes flow into any reactive read of the registry without
 *    re-registration.
 *  - Unregistration happens in onDestroy.
 *  - The registry's entry list is $state.raw and is replaced wholesale on
 *    register/unregister (no deep proxying — keeps the getter descriptors pristine).
 *
 * No $effect, no untrack(), no tick/version counters anywhere.
 */
import { getContext, onDestroy, setContext } from 'svelte';

export interface LayerDescriptor {
	readonly geom: string;
	readonly label?: string;
	readonly alpha?: number;
	readonly linewidth?: number;
	/**
	 * Mechanism B only: a hidden marker element emitted by the child so the plot
	 * can recover DECLARATION order (DOM order) after keyed moves / re-mounts.
	 * Mechanism A (strictly markup-free children) leaves this undefined.
	 */
	readonly marker?: Element;
}

export interface LayerEntry {
	readonly id: number;
	readonly descriptor: LayerDescriptor;
}

let nextId = 0;
let globalVersion = 0;

/**
 * SPIKE FINDING (measured on svelte 5.56.4): the registry must NOT be a
 * read-modify-write reactive array. A first cut used
 * `#entries = $state.raw([])` with `[...spread]` on register and `.filter()`
 * on unregister; when a keyed {#each} destroyed one child (onDestroy →
 * unregister) and created another (init → register) in the SAME flush, the
 * teardown-side read observed a STALE array (Svelte's batching keeps
 * uncommitted writes batch-local), and its write clobbered the freshly
 * registered entry — a silent lost update.
 *
 * Fix: the authoritative store is a plain (non-reactive) insertion-ordered
 * Map, so every mutation is commutative and immediately visible; a monotonic
 * version signal (distinct value per mutation, so invalidation can never be
 * deduplicated away) drives reactivity.
 */
export class LayerRegistry {
	#byId = new Map<number, LayerEntry>();
	#version = $state(0);

	/** Total register() calls ever made — test observability for "no re-registration". */
	registerCount = 0;

	register(descriptor: LayerDescriptor): number {
		const id = nextId++;
		this.registerCount += 1;
		this.#byId.set(id, { id, descriptor });
		this.#version = ++globalVersion;
		return id;
	}

	unregister(id: number): void {
		this.#byId.delete(id);
		this.#version = ++globalVersion;
	}

	get layers(): readonly LayerEntry[] {
		void this.#version; // reactive dependency; the Map itself is non-reactive
		return [...this.#byId.values()];
	}
}

const KEY = Symbol('ggsvelte-spike-registry');

/** Called by <GGPlot> during init. */
export function provideRegistry(): LayerRegistry {
	const registry = new LayerRegistry();
	setContext(KEY, registry);
	return registry;
}

/**
 * Called by geom components during init. Inert (no-op) when there is no
 * <GGPlot> ancestor, per the plan's tree-shaking/inertness requirement.
 */
export function registerLayer(descriptor: LayerDescriptor): void {
	const registry = getContext<LayerRegistry | undefined>(KEY);
	if (!registry) return;
	const id = registry.register(descriptor);
	onDestroy(() => registry.unregister(id));
}
