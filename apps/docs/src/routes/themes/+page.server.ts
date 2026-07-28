import { THEME_SPECIMENS } from "$lib/theme-specimens/catalog";
import { temperaturesStaticSvg, themeSpecimenStaticSvg } from "$lib/theme-specimens/static-svg";

/** Precompute static chart shells at prerender so the client never imports core to paint them. */
export function load() {
  return {
    themeSpecimens: THEME_SPECIMENS.map((specimen) => ({
      ...specimen,
      staticSvg: themeSpecimenStaticSvg({
        name: specimen.name,
        kind: specimen.kind,
        scheme: specimen.scheme,
        height: 380,
      }),
    })),
    labStaticSvg: temperaturesStaticSvg({
      theme: "default",
      scheme: "observable10",
      height: 400,
    }),
  };
}
