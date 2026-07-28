import type { ColorScaleSpec } from "@ggsvelte/spec";

import { CATEGORICAL_PALETTES } from "$lib/catalog/themes";
import {
  paletteSpecimenStaticSvg,
  sequentialRasterStaticSvg,
} from "$lib/theme-specimens/static-svg";

const SEQUENTIAL_EXAMPLES: readonly {
  label: string;
  scale: ColorScaleSpec;
}[] = [
  { label: "Viridis", scale: { type: "sequential", scheme: "viridis" } },
  {
    label: "Reversed",
    scale: { type: "sequential", scheme: "viridis", reverse: true },
  },
  {
    label: "Custom range",
    scale: {
      type: "sequential",
      range: ["#2d1e2f", "#3d5a80", "#e76f51"],
    },
  },
  {
    label: "Pinned domain",
    scale: {
      type: "sequential",
      scheme: "viridis",
      domain: [15, 40],
    },
  },
];

/** Precompute static chart shells at prerender so the client never imports core to paint them. */
export function load() {
  return {
    paletteSpecimens: CATEGORICAL_PALETTES.map((palette) => ({
      name: palette.name,
      label: palette.label,
      colors: palette.colors,
      capacity: palette.capacity,
      reverse: false,
      paperTheme: "light" as const,
      staticSvg: paletteSpecimenStaticSvg({
        scheme: palette.name,
        reverse: false,
        paperTheme: "light",
        height: 340,
      }),
    })),
    sequentialExamples: SEQUENTIAL_EXAMPLES.map((example) => ({
      label: example.label,
      scale: example.scale,
      staticSvg: sequentialRasterStaticSvg({
        label: example.label,
        scale: example.scale,
        height: 360,
      }),
    })),
  };
}
