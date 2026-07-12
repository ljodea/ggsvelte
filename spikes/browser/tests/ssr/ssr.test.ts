/**
 * M0a-1 hostile test — SSR half.
 *
 * Question: with declaration-only children rendered BEFORE the scene in
 * <GGPlot>'s template, does svelte/server's single top-to-bottom pass register
 * every child before the scene markup is emitted, in declaration order?
 */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import BasicPlot from '../fixtures/BasicPlot.svelte';
import OrderedBasicPlot from '../fixtures/OrderedBasicPlot.svelte';
import TogglePlot from '../fixtures/TogglePlot.svelte';
import TwoPlots from '../fixtures/TwoPlots.svelte';
import SceneFirstPlot from '../fixtures/SceneFirstPlot.svelte';
import OrphanGeom from '../fixtures/OrphanGeom.svelte';

/** Extract the text of every <li data-layer> in document order. */
function layerTexts(html: string): string[] {
	return [...html.matchAll(/<li data-layer[^>]*>(.*?)<\/li>/gs)].map((m) =>
		// strip svelte hydration comment markers inside the li
		m[1].replace(/<!--.*?-->/gs, '').trim(),
	);
}

describe('SSR (svelte/server render)', () => {
	it('registers all children before the scene renders, in declaration order', () => {
		const { body } = render(BasicPlot, { props: {} });

		expect(layerTexts(body)).toEqual(['point:a:0.6:', 'line:b::2', 'point:c:0.9:']);

		// layer count rendered from the $derived scene
		expect(body).toMatch(/<figcaption data-layer-count[^>]*>3</);
	});

	it('children emit no markup — nothing but comments/whitespace before <figure>', () => {
		const { body } = render(BasicPlot, { props: {} });
		const beforeScene = body.slice(0, body.indexOf('<figure'));
		// Svelte SSR emits comment anchors (<!--[-->, <!---->, ...) but the three
		// geom children must not contribute a single element or text node.
		expect(beforeScene.replace(/<!--[^]*?-->/g, '').trim()).toBe('');
	});

	it('respects {#if} in SSR: hidden child never registers', () => {
		const { body } = render(TogglePlot, { props: { show: false } });
		expect(layerTexts(body)).toEqual(['point:a:1:', 'point:c:1:']);
	});

	it('two plots on one page do not cross-talk in SSR', () => {
		const { body } = render(TwoPlots, { props: {} });
		const firstFigure = body.slice(body.indexOf('data-plot="first"'), body.indexOf('data-plot="second"'));
		const secondFigure = body.slice(body.indexOf('data-plot="second"'));

		expect(layerTexts(firstFigure)).toEqual(['point:first-a:0.1:', 'point:first-b:0.2:']);
		expect(layerTexts(secondFigure)).toEqual(['line:second-a::4']);
	});

	it('HAZARD DEMO: scene markup placed before {@render children} is permanently empty in SSR', () => {
		const { body } = render(SceneFirstPlot, { props: {} });
		// This documents WHY template order is load-bearing: SSR is one pass, so a
		// scene rendered above the children sees an empty registry forever.
		expect(layerTexts(body)).toEqual([]);
	});

	it('mechanism B (markers) also SSRs in declaration order; children emit only hidden markers', () => {
		const { body } = render(OrderedBasicPlot, { props: {} });
		expect(layerTexts(body)).toEqual(['point:a:0.1', 'point:b:0.2', 'point:c:0.3']);
		// on the server no sorting happens (no DOM): registration order IS declaration order
		const beforeScene = body.slice(0, body.indexOf('<figure'));
		const stripped = beforeScene
			.replace(/<!--[^]*?-->/g, '')
			.replace(/<gg-marker[^>]*><\/gg-marker>/g, '')
			.replace(/<\/?div[^>]*>/g, '') // the display:contents host
			.trim();
		expect(stripped).toBe('');
	});

	it('a geom without a <GGPlot> ancestor is inert and does not throw', () => {
		const { body } = render(OrphanGeom, { props: {} });
		expect(body).toContain('data-after-orphan');
	});
});
