import { guerry } from "$examples/point/scatter-color/data";
import { homeHeroStaticSvgFromData } from "$lib/theme-specimens/static-svg";

/**
 * Prerender hero shells so the home client does not import @ggsvelte/core.
 * Two contrast themes: dark chart on the light site, light chart on dark
 * (matches `contrastChartTheme()`). CSS on the page picks the right one from
 * `data-theme` set by static/theme.js before first paint.
 */
export function load() {
  return {
    heroStaticSvgLightSite: homeHeroStaticSvgFromData(guerry, {
      theme: "dark",
      height: 400,
    }),
    heroStaticSvgDarkSite: homeHeroStaticSvgFromData(guerry, {
      theme: "light",
      height: 400,
    }),
  };
}
