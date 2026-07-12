/**
 * M0a-1 — best-effort REAL hydration test.
 *
 * vitest browser mode cannot run svelte/server (components are client-compiled),
 * so the SSR output of <TogglePlot show={true}> was captured from the ssr
 * project (tests/ssr) and is inlined verbatim. BRITTLE BY DESIGN: if the svelte
 * version changes its hydration comment markers, re-capture the fixture (see
 * decision record). Pinned: svelte 5.56.4.
 *
 * What this proves: hydrate() adopts the SSR DOM for a registry-driven scene
 * without recreating nodes (identity check) and without hydration-mismatch
 * warnings, and the plot stays fully interactive afterwards.
 */
import { describe, expect, it, vi } from 'vitest';
import { flushSync, hydrate, unmount } from 'svelte';

import TogglePlot from '../fixtures/TogglePlot.svelte';
import { stateBox } from '../fixtures/props-box.svelte.js';

// Captured from: render(TogglePlot, { props: { show: true } }) — svelte 5.56.4
const SSR_BODY = `<!--[--><!----> <!--[0--><!--]--> <!----><!----> <figure data-plot="toggle"><ul data-scene=""><!--[--><li data-layer="">point:a:1:</li><li data-layer="">line:b::1</li><li data-layer="">point:c:1:</li><!--]--></ul> <figcaption data-layer-count="">3</figcaption></figure><!--]-->`;

function layerTexts(scope: HTMLElement): string[] {
	return [...scope.querySelectorAll('[data-layer]')].map((li) => li.textContent?.trim() ?? '');
}

describe('hydration of SSR output', () => {
	it('adopts SSR DOM without mismatch, then stays interactive', () => {
		const warn = vi.spyOn(console, 'warn');
		const error = vi.spyOn(console, 'error');

		const target = document.createElement('div');
		document.body.appendChild(target);
		target.innerHTML = SSR_BODY;

		const ssrLis = [...target.querySelectorAll('[data-layer]')];
		expect(ssrLis).toHaveLength(3);

		const props = stateBox({ show: true });
		const app = hydrate(TogglePlot, { target, props });
		flushSync();

		try {
			// content correct after hydration
			expect(layerTexts(target)).toEqual(['point:a:1:', 'line:b::1', 'point:c:1:']);

			// TRUE hydration: the SSR <li> nodes were adopted, not recreated
			const hydratedLis = [...target.querySelectorAll('[data-layer]')];
			for (let i = 0; i < 3; i++) {
				expect(hydratedLis[i]).toBe(ssrLis[i]);
			}

			// no hydration_mismatch (svelte logs mismatches via console)
			const logged = [...warn.mock.calls, ...error.mock.calls].flat().join(' ');
			expect(logged).not.toMatch(/hydration/i);

			// interactivity survives: toggle off …
			props.show = false;
			flushSync();
			expect(layerTexts(target)).toEqual(['point:a:1:', 'point:c:1:']);

			// … and back on (mechanism A constraint: re-mounted layer appends)
			props.show = true;
			flushSync();
			expect(layerTexts(target)).toEqual(['point:a:1:', 'point:c:1:', 'line:b::1']);
		} finally {
			unmount(app);
			warn.mockRestore();
			error.mockRestore();
			target.remove();
		}
	});
});
