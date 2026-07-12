/**
 * Synchronous render helper for the M0a spike tests.
 *
 * vitest-browser-svelte v3 (the vitest-4-compatible line) made `render()`
 * async, which would smuggle microtask flushes into tests whose entire point
 * is asserting SYNCHRONOUS first paint (decision record 0001). The underlying
 * `@testing-library/svelte-core` render — the exact function v3 wraps — is
 * still synchronous, so the spikes use it directly and keep their original
 * semantics under vitest 4.
 */
import { beforeEach } from 'vitest';
import { cleanup, render as coreRender } from '@testing-library/svelte-core';

beforeEach(() => {
  cleanup();
});

// Core render has no default for its options argument; the spikes call
// render(Component) bare, so default it here.
export const render: typeof coreRender = (Component, options = {}, setupOptions = {}) =>
  coreRender(Component, options, setupOptions);
