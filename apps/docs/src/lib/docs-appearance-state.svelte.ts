/**
 * Reactive view of the site appearance (data-theme on <html>) for components
 * that pick a chart theme against the page: FiveThirtyEight on the light site,
 * light chart paper on the dark site.
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

/**
 * Chart theme for homepage hero / grammar demo plots.
 * Light site → fivethirtyeight (light paper, editorial chrome).
 * Dark site → light (so the plot still reads as a chart on a dark frame).
 */
export function contrastChartTheme(): "fivethirtyeight" | "light" {
  return docsAppearance.current === "light" ? "fivethirtyeight" : "light";
}
