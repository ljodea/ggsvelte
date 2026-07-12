/**
 * M0a-1 hostile test — CSR half (vitest browser mode, chromium).
 *
 * Mechanism A: strictly markup-free children, init-time registration, live
 * getter descriptors. Tests marked CONSTRAINT assert the empirically measured
 * semantics where they diverge from ideal declaration-order fidelity; the
 * marker-based Mechanism B (ordered.test.ts) removes those constraints.
 */
import { describe, expect, it } from 'vitest';
import { render } from '../helpers/render.js';
import { tick } from 'svelte';

import BasicPlot from '../fixtures/BasicPlot.svelte';
import TogglePlot from '../fixtures/TogglePlot.svelte';
import KeyedReorderPlot from '../fixtures/KeyedReorderPlot.svelte';
import UnkeyedReorderPlot from '../fixtures/UnkeyedReorderPlot.svelte';
import ReactivePlot from '../fixtures/ReactivePlot.svelte';
import TwoPlots from '../fixtures/TwoPlots.svelte';
import SceneFirstPlot from '../fixtures/SceneFirstPlot.svelte';
import OrphanGeom from '../fixtures/OrphanGeom.svelte';
import type { LayerRegistry } from '../../src/registry.svelte.js';

function layerTexts(container: HTMLElement, plot?: string): string[] {
	const scope = plot
		? container.querySelector(`[data-plot="${plot}"]`)!
		: container;
	return [...scope.querySelectorAll('[data-layer]')].map((li) => li.textContent?.trim() ?? '');
}

function captureRegistry(): { get: () => LayerRegistry; callback: (r: LayerRegistry) => void } {
	let registry: LayerRegistry | undefined;
	return {
		get: () => {
			if (!registry) throw new Error('registry never captured');
			return registry;
		},
		callback: (r) => {
			registry = r;
		},
	};
}

describe('initial CSR render', () => {
	it('scene is populated SYNCHRONOUSLY on mount, in declaration order (no deferred first paint)', () => {
		const { container } = render(BasicPlot);
		// no await, no tick: this must hold on the very first paint
		expect(layerTexts(container)).toEqual(['point:a:0.6:', 'line:b::2', 'point:c:0.9:']);
		expect(container.querySelector('[data-layer-count]')?.textContent).toBe('3');
	});

	it('children emit no markup: nothing before the <figure> except comment/empty-text anchors', () => {
		const { container } = render(BasicPlot);
		let node = container.firstChild;
		while (node && !(node instanceof HTMLElement && node.matches('figure'))) {
			// Svelte's client runtime uses comment AND empty text nodes as anchors;
			// the children must contribute no ELEMENT and no visible text.
			expect(node.nodeType === Node.ELEMENT_NODE, `unexpected element before <figure>`).toBe(
				false,
			);
			expect((node.textContent ?? '').trim()).toBe('');
			node = node.nextSibling;
		}
	});

	it('FINDING: even with scene markup ABOVE {@render children}, CSR mount() flushes the registration update synchronously — the ordering hazard is SSR-only', async () => {
		const { container } = render(SceneFirstPlot);
		// svelte 5 mount() flushes effects before returning, so the each block —
		// created empty, before children init — has already re-rendered by the time
		// render() returns. No deferred first paint even in the hazardous arrangement.
		expect(layerTexts(container)).toEqual(['point:a', 'point:b']);
		await tick();
		expect(layerTexts(container)).toEqual(['point:a', 'point:b']);
	});
});

describe('reactive prop updates', () => {
	it('alpha change propagates to the scene WITHOUT re-registration', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(ReactivePlot, {
			alpha: 0.5,
			onRegistryCreated: reg.callback,
		});

		const idsBefore = reg.get().layers.map((e) => e.id);
		const countBefore = reg.get().registerCount;
		expect(layerTexts(container)).toEqual(['point:p:0.5:', 'line:l::3']);

		await rerender({ alpha: 0.9 });

		expect(layerTexts(container)).toEqual(['point:p:0.9:', 'line:l::3']);
		expect(reg.get().layers.map((e) => e.id)).toEqual(idsBefore);
		expect(reg.get().registerCount).toBe(countBefore);
	});
});

describe('{#if} toggle', () => {
	it('unregisters on unmount, re-registers on re-mount, no duplicates', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(TogglePlot, {
			show: true,
			onRegistryCreated: reg.callback,
		});
		expect(layerTexts(container)).toEqual(['point:a:1:', 'line:b::1', 'point:c:1:']);
		const stableIds = () =>
			reg
				.get()
				.layers.filter((e) => e.descriptor.label !== 'b')
				.map((e) => e.id);
		const idsBefore = stableIds();

		await rerender({ show: false });
		expect(layerTexts(container)).toEqual(['point:a:1:', 'point:c:1:']);
		expect(reg.get().layers).toHaveLength(2);
		expect(stableIds()).toEqual(idsBefore); // siblings untouched

		await rerender({ show: true });
		expect(reg.get().layers).toHaveLength(3); // no duplicates
		expect(stableIds()).toEqual(idsBefore); // siblings still untouched
		// CONSTRAINT (measured): a re-mounted child re-registers at the END of the
		// registry, not at its declaration position — registration order is only
		// observable at init time. Mechanism B restores declaration order.
		expect(layerTexts(container)).toEqual(['point:a:1:', 'point:c:1:', 'line:b::1']);
	});

	it('rapid toggle stress: registry stays consistent over many mount/unmount cycles', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(TogglePlot, {
			show: true,
			onRegistryCreated: reg.callback,
		});

		for (let i = 0; i < 10; i++) {
			await rerender({ show: false });
			expect(reg.get().layers).toHaveLength(2);
			await rerender({ show: true });
			expect(reg.get().layers).toHaveLength(3);
			// ids stay unique — no ghost entries
			const ids = reg.get().layers.map((e) => e.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
		expect(layerTexts(container)).toHaveLength(3);
		expect(
			reg
				.get()
				.layers.map((e) => e.descriptor.label)
				.sort(),
		).toEqual(['a', 'b', 'c']);
	});
});

describe('{#each} reordering', () => {
	const abc = [
		{ id: 'a', alpha: 0.1 },
		{ id: 'b', alpha: 0.2 },
		{ id: 'c', alpha: 0.3 },
	];
	const cab = [abc[2], abc[0], abc[1]];

	it('KEYED each: CONSTRAINT (measured) — pure reorder is INVISIBLE to the registry, order stays as registered', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(KeyedReorderPlot, {
			items: abc,
			onRegistryCreated: reg.callback,
		});
		expect(layerTexts(container)).toEqual(['point:a:0.1:', 'point:b:0.2:', 'point:c:0.3:']);

		await rerender({ items: cab });
		// Keyed each MOVES component instances: no init, no prop change, no destroy.
		// A markup-free child has zero signal that its declaration position changed.
		expect(layerTexts(container)).toEqual(['point:a:0.1:', 'point:b:0.2:', 'point:c:0.3:']);
	});

	it('UNKEYED each: reorder flows through as prop updates, order follows declaration', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(UnkeyedReorderPlot, {
			items: abc,
			onRegistryCreated: reg.callback,
		});
		const idsBefore = reg.get().layers.map((e) => e.id);
		expect(layerTexts(container)).toEqual(['point:a:0.1:', 'point:b:0.2:', 'point:c:0.3:']);

		await rerender({ items: cab });
		expect(layerTexts(container)).toEqual(['point:c:0.3:', 'point:a:0.1:', 'point:b:0.2:']);
		// unkeyed reorder = in-place prop updates, zero re-registrations
		expect(reg.get().layers.map((e) => e.id)).toEqual(idsBefore);
	});

	it('KEYED each: removal is clean; CONSTRAINT (measured) — mid-list insertion registers at the END', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(KeyedReorderPlot, {
			items: abc,
			onRegistryCreated: reg.callback,
		});

		await rerender({ items: [abc[0], abc[2]] }); // remove b
		expect(layerTexts(container)).toEqual(['point:a:0.1:', 'point:c:0.3:']);

		await rerender({ items: [abc[0], { id: 'x', alpha: 0.5 }, abc[2]] }); // insert x in middle
		// Same root cause as re-mount: registration order is append-only.
		expect(layerTexts(container)).toEqual(['point:a:0.1:', 'point:c:0.3:', 'point:x:0.5:']);
	});
});

describe('multiple plots', () => {
	it('two <GGPlot> instances on one page have isolated registries', async () => {
		const first = captureRegistry();
		const second = captureRegistry();
		const { container } = render(TwoPlots, {
			onFirstRegistry: first.callback,
			onSecondRegistry: second.callback,
		});

		expect(first.get()).not.toBe(second.get());
		expect(layerTexts(container, 'first')).toEqual(['point:first-a:0.1:', 'point:first-b:0.2:']);
		expect(layerTexts(container, 'second')).toEqual(['line:second-a::4']);
		expect(first.get().layers.map((e) => e.descriptor.label)).toEqual(['first-a', 'first-b']);
		expect(second.get().layers.map((e) => e.descriptor.label)).toEqual(['second-a']);
	});
});

describe('unmount cleanup', () => {
	it('destroying the plot leaves no dangling registrations', () => {
		const reg = captureRegistry();
		const { unmount } = render(BasicPlot, { onRegistryCreated: reg.callback });
		expect(reg.get().layers).toHaveLength(3);

		unmount();
		expect(reg.get().layers).toHaveLength(0);
	});
});

describe('orphan geom', () => {
	it('a geom outside <GGPlot> is inert and does not throw', () => {
		const { container } = render(OrphanGeom);
		expect(container.querySelector('[data-after-orphan]')).not.toBeNull();
	});
});
