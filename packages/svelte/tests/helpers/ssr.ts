import type { Component, ComponentProps } from "svelte";
import { render } from "svelte/server";

export interface SsrFixture {
  body: string;
  head: string;
  html: string;
}

/** Render the same component/props pair consumed by the browser hydration helper. */
export function renderSsrFixture<C extends Component<any>>(
  Component: C,
  props: ComponentProps<C>,
): SsrFixture {
  const result = render(Component, { props });
  return {
    body: result.body,
    head: result.head,
    html: `<!doctype html><html><head>${result.head}</head><body><main id="fixture">${result.body}</main></body></html>`,
  };
}
