/**
 * Synchronous render helper (same rationale as the M0a spike harness):
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
