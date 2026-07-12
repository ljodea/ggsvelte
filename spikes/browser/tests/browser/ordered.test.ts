/**
 * M0a-1 hostile test — Mechanism B (marker-based ordering).
 *
 * Each geom child emits ONE hidden inert element (<gg-marker style="display:none">).
 * The plot sorts registry entries by marker DOM order inside its scene $derived,
 * and a MutationObserver on the children host bumps a version signal so pure
 * keyed-{#each} moves (which change nothing reactive) trigger a re-sort.
 *
 * This trades "children emit strictly NO markup" for full declaration-order
 * fidelity under keyed reorder, mid-list insertion, and {#if} re-mount.
 */
import { describe, expect, it } from 'vitest';
import { render } from '../helpers/render.js';
import { tick } from 'svelte';

import OrderedBasicPlot from '../fixtures/OrderedBasicPlot.svelte';
import OrderedTogglePlot from '../fixtures/OrderedTogglePlot.svelte';
import OrderedKeyedPlot from '../fixtures/OrderedKeyedPlot.svelte';
import type { LayerRegistry } from '../../src/registry.svelte.js';

function layerTexts(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-layer]')].map((li) => li.textContent?.trim() ?? '');
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

/** MutationObserver delivery is a microtask after the flush; settle both. */
async function settle(): Promise<void> {
	await tick();
	await tick();
}

describe('mechanism B: marker-based declaration order', () => {
	const abc = [
		{ id: 'a', alpha: 0.1 },
		{ id: 'b', alpha: 0.2 },
		{ id: 'c', alpha: 0.3 },
	];
	const cab = [abc[2], abc[0], abc[1]];

	it('initial CSR render is synchronous and in declaration order', () => {
		const { container } = render(OrderedBasicPlot);
		expect(layerTexts(container)).toEqual(['point:a:0.1', 'point:b:0.2', 'point:c:0.3']);
	});

	it('markers are invisible: no layout-affecting markup from children', () => {
		const { container } = render(OrderedBasicPlot);
		const markers = [...container.querySelectorAll('gg-marker')];
		expect(markers).toHaveLength(3);
		for (const m of markers) {
			expect(getComputedStyle(m).display).toBe('none');
		}
	});

	it('KEYED each: pure reorder IS reflected — scene follows new declaration order', async () => {
		const { container, rerender } = render(OrderedKeyedPlot, { items: abc });
		expect(layerTexts(container)).toEqual(['point:a:0.1', 'point:b:0.2', 'point:c:0.3']);

		await rerender({ items: cab });
		await settle();
		expect(layerTexts(container)).toEqual(['point:c:0.3', 'point:a:0.1', 'point:b:0.2']);
	});

	it('KEYED each: mid-list insertion lands at its declaration position', async () => {
		const { container, rerender } = render(OrderedKeyedPlot, { items: abc });

		await rerender({ items: [abc[0], { id: 'x', alpha: 0.5 }, abc[2]] });
		await settle();
		expect(layerTexts(container)).toEqual(['point:a:0.1', 'point:x:0.5', 'point:c:0.3']);
	});

	it('{#if} re-mount returns the layer to its declaration position, no duplicates', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(OrderedTogglePlot, {
			show: true,
			onRegistryCreated: reg.callback,
		});
		expect(layerTexts(container)).toEqual(['point:a:1', 'point:b:1', 'point:c:1']);

		await rerender({ show: false });
		await settle();
		expect(layerTexts(container)).toEqual(['point:a:1', 'point:c:1']);

		await rerender({ show: true });
		await settle();
		expect(reg.get().layers).toHaveLength(3);
		expect(layerTexts(container)).toEqual(['point:a:1', 'point:b:1', 'point:c:1']);
	});

	it('rapid toggle stress stays consistent and ordered', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(OrderedTogglePlot, {
			show: true,
			onRegistryCreated: reg.callback,
		});

		for (let i = 0; i < 10; i++) {
			await rerender({ show: false });
			await rerender({ show: true });
		}
		await settle();
		expect(reg.get().layers).toHaveLength(3);
		const ids = reg.get().layers.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(layerTexts(container)).toEqual(['point:a:1', 'point:b:1', 'point:c:1']);
	});

	it('reactive prop updates flow through without re-registration', async () => {
		const reg = captureRegistry();
		const { container, rerender } = render(OrderedKeyedPlot, {
			items: abc,
			onRegistryCreated: reg.callback,
		});
		const countBefore = reg.get().registerCount;

		await rerender({ items: [{ id: 'a', alpha: 0.9 }, abc[1], abc[2]] });
		await settle();
		expect(layerTexts(container)).toEqual(['point:a:0.9', 'point:b:0.2', 'point:c:0.3']);
		expect(reg.get().registerCount).toBe(countBefore);
	});

	it('unmount cleanup leaves no dangling registrations', () => {
		const reg = captureRegistry();
		const { unmount } = render(OrderedBasicPlot, { onRegistryCreated: reg.callback });
		expect(reg.get().layers).toHaveLength(3);
		unmount();
		expect(reg.get().layers).toHaveLength(0);
	});
});
