import { guerry } from "$examples/point/scatter-color/data";
import { palmerPenguins } from "@ggsvelte/svelte/data";

import {
  homeGrammarStaticSvgFromData,
  homeHeroStaticSvgFromData,
} from "$lib/theme-specimens/static-svg";

/**
 * Prerender hero + grammar shells so the home client does not need
 * @ggsvelte/core for first paint. Matches `contrastChartTheme()`:
 * fivethirtyeight on the light site, light on dark. CSS picks the shell from
 * `data-theme` set by static/theme.js before first paint.
 */
export function load() {
  const penguins = palmerPenguins as readonly Record<string, unknown>[];
  return {
    heroStaticSvgLightSite: homeHeroStaticSvgFromData(guerry, {
      theme: "fivethirtyeight",
      height: 400,
    }),
    heroStaticSvgDarkSite: homeHeroStaticSvgFromData(guerry, {
      theme: "light",
      height: 400,
    }),
    grammarStaticSvgLightSite: homeGrammarStaticSvgFromData(penguins, {
      theme: "fivethirtyeight",
      height: 400,
    }),
    grammarStaticSvgDarkSite: homeGrammarStaticSvgFromData(penguins, {
      theme: "light",
      height: 400,
    }),
  };
}
