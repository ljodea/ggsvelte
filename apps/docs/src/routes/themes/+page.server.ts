import { THEME_SPECIMENS } from "$lib/theme-specimens/catalog";
import { THEME_STATIC_SHELL_BY_ID } from "$lib/generated/theme-static-shells";

/**
 * Paths only — SVG bodies live under /theme-shells/ so prerendered HTML stays
 * small (was ~475 KB with inlined shells + kit data payload duplication).
 */
export function load() {
  return {
    themeSpecimens: THEME_SPECIMENS.map((specimen) => {
      const path = THEME_STATIC_SHELL_BY_ID[`theme-${specimen.name}`];
      if (path === undefined) {
        throw new Error(`Missing static shell for theme ${specimen.name}`);
      }
      return { ...specimen, staticSrc: path };
    }),
    labStaticSrc: (() => {
      const path = THEME_STATIC_SHELL_BY_ID["theme-lab-default"];
      if (path === undefined) throw new Error("Missing theme-lab-default shell");
      return path;
    })(),
  };
}
