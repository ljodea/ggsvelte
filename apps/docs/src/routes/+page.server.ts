import { guerry } from "$examples/point/scatter-color/data";
import { homeHeroStaticSvgFromData } from "$lib/theme-specimens/static-svg";

/**
 * Prerender hero shells so the home client does not import @ggsvelte/core.
 * Matches `contrastChartTheme()`: fivethirtyeight on the light site, light on
 * dark. CSS on the page picks the right shell from `data-theme` set by
 * static/theme.js before first paint.
 */
export function load() {
  return {
    heroStaticSvgLightSite: homeHeroStaticSvgFromData(guerry, {
      theme: "fivethirtyeight",
      height: 400,
    }),
    heroStaticSvgDarkSite: homeHeroStaticSvgFromData(guerry, {
      theme: "light",
      height: 400,
    }),
  };
}
