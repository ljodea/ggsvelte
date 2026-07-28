import { guerry } from "$examples/point/scatter-color/data";
import { homeHeroStaticSvgFromData } from "$lib/theme-specimens/static-svg";

/** Prerender hero SVG so the home client shell does not import @ggsvelte/core. */
export function load() {
  return {
    heroStaticSvg: homeHeroStaticSvgFromData(guerry, {
      theme: "default",
      height: 400,
    }),
  };
}
