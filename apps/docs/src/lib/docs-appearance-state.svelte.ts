/**
 * Reactive view of the site appearance (data-theme on <html>) for components
 * that must invert chart themes against the page: a dark chart on the light
 * site needs no border to read as a plot, and vice versa.
 */
import { browser } from "$app/environment";

import { type DocsAppearance, readDocsAppearance, watchDocsAppearance } from "./docs-appearance.js";

export const docsAppearance = $state<{ current: DocsAppearance }>({
  current: "light",
});

if (browser) {
  docsAppearance.current = readDocsAppearance();
  watchDocsAppearance((appearance) => {
    docsAppearance.current = appearance;
  });
}

/** Chart theme that contrasts with the current site appearance. */
export function contrastChartTheme(): "light" | "dark" {
  return docsAppearance.current === "light" ? "dark" : "light";
}
