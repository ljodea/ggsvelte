import { isColorblindSafe } from "$lib/catalog/palette-chooser";
import { CATEGORICAL_PALETTES } from "$lib/catalog/themes";
import { THEME_STATIC_SHELL_BY_ID } from "$lib/generated/theme-static-shells";

function shellPath(id: string): string {
  const path = THEME_STATIC_SHELL_BY_ID[id];
  if (path === undefined) throw new Error(`Missing static shell ${id}`);
  return path;
}

/** Paths only — SVG bodies under /theme-shells/ (see gen-theme-static-shells). */
export function load() {
  const paletteSpecimens = CATEGORICAL_PALETTES.map((palette) => ({
    name: palette.name,
    label: palette.label,
    colors: palette.colors,
    capacity: palette.capacity,
    colorblindSafe: isColorblindSafe(palette.name),
    staticSrc: shellPath(`palette-${palette.name}`),
  }));

  return { paletteSpecimens };
}
