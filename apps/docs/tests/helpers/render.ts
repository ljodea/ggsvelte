/**
 * Synchronous render helper (same rationale as packages/svelte):
 * vitest-browser-svelte's render() is async; the underlying
 * @testing-library/svelte-core render is synchronous, which keeps first-paint
 * assertions honest.
 */
import { cleanup, render as coreRender } from "@testing-library/svelte-core";
import { beforeEach } from "vitest";

beforeEach(() => {
  cleanup();
});

export const render: typeof coreRender = (Component, options, setupOptions) =>
  coreRender(Component, options ?? {}, setupOptions ?? {});
