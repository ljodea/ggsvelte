/**
 * Pipeline catalogs keyed off the schema version: geoms, stats, positions,
 * channels, edition stamp, and per-geom defaults (normalize fills these).
 */
/** Geom names known to this schema version (discriminator values of LayerSpec). */
export const KNOWN_GEOMS = [
  "point",
  "line",
  "path",
  "col",
  "bar",
  "histogram",
  "freqpoly",
  "area",
  "rule",
  "hline",
  "vline",
  "text",
  "smooth",
  "quantile",
  "boxplot",
  "density",
  "errorbar",
  "rect",
  "tile",
  "raster",
  "ribbon",
  "segment",
  "hex",
  "bin_2d",
  "abline",
  "curve",
  "contour",
  "density_2d",
  "density_2d_filled",
  "dotplot",
  "map",
  "sf",
  "sf_text",
  "sf_label",
  "blank",
  "jitter",
  "spoke",
  "rug",
  "step",
  "qq",
  "qq_line",
] as const;
export type GeomName = (typeof KNOWN_GEOMS)[number];

/**
 * The current DEFAULTS EDITION (Hadley lesson 13: fix accumulated bad
 * defaults "without breaking existing code"). normalize() stamps this onto
 * specs that carry no `edition`, freezing which generation of default
 * aesthetics (theme role tokens, categorical palette) the spec was authored
 * against. @ggsvelte/core keys its theme/palette default tables by edition,
 * so when a future edition improves the defaults, already-stamped specs keep
 * their edition-1 look. Explicit theme/scale settings always win regardless.
 */
export const CURRENT_EDITION = 2;

/** Aesthetic channel names known to this schema version. */
export const CHANNELS = [
  "x",
  "y",
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "shape",
  "linetype",
  "group",
  "label",
  "weight",
  "ymin",
  "ymax",
  "xmin",
  "xmax",
  "xend",
  "yend",
  "width",
  "height",
  "z",
  "map_id",
  "angle",
  "radius",
  "sample",
] as const;
export type ChannelName = (typeof CHANNELS)[number];

/** Stat names known to this schema version. */
export const KNOWN_STATS = [
  "identity",
  "unique",
  "manual",
  "connect",
  "count",
  "bin",
  "bin_hex",
  "bin_2d",
  "smooth",
  "quantile",
  "boxplot",
  "density",
  "summary",
  "ecdf",
  "summary_bin",
  "contour",
  "align",
  "density_2d",
  "density_2d_filled",
  "bindot",
  "ellipse",
  "sf",
  "sf_coordinates",
  "qq",
  "qq_line",
] as const;
export type StatName = (typeof KNOWN_STATS)[number];

/** Position names known to this schema version. */
export const KNOWN_POSITIONS = ["identity", "stack", "fill", "dodge", "jitter", "nudge"] as const;
export type PositionName = (typeof KNOWN_POSITIONS)[number];

/**
 * Per-geom pipeline defaults, mirrored from ggplot2 (normalize() fills these):
 * geom bar counts (stat "count") and stacks; histogram bins and stacks;
 * freqpoly bins and draws as line (identity position); col/area stack
 * pre-computed values; boxplot dodges (ggplot2 defaults to dodge2 —
 * ggsvelte uses plain dodge, decision 0010); jitter aliases to
 * point+position jitter; hline/vline alias to rule; everything else is
 * identity/identity.
 */
export const GEOM_DEFAULTS: Record<GeomName, { stat: StatName; position: PositionName }> = {
  point: { stat: "identity", position: "identity" },
  line: { stat: "identity", position: "identity" },
  path: { stat: "identity", position: "identity" },
  col: { stat: "identity", position: "stack" },
  bar: { stat: "count", position: "stack" },
  histogram: { stat: "bin", position: "stack" },
  freqpoly: { stat: "bin", position: "identity" },
  area: { stat: "identity", position: "stack" },
  rule: { stat: "identity", position: "identity" },
  hline: { stat: "identity", position: "identity" },
  vline: { stat: "identity", position: "identity" },
  text: { stat: "identity", position: "identity" },
  smooth: { stat: "smooth", position: "identity" },
  quantile: { stat: "quantile", position: "identity" },
  boxplot: { stat: "boxplot", position: "dodge" },
  density: { stat: "density", position: "identity" },
  errorbar: { stat: "identity", position: "identity" },
  rect: { stat: "identity", position: "identity" },
  tile: { stat: "identity", position: "identity" },
  raster: { stat: "identity", position: "identity" },
  ribbon: { stat: "identity", position: "identity" },
  segment: { stat: "identity", position: "identity" },
  hex: { stat: "bin_hex", position: "identity" },
  abline: { stat: "identity", position: "identity" },
  curve: { stat: "identity", position: "identity" },
  contour: { stat: "contour", position: "identity" },
  density_2d: { stat: "density_2d", position: "identity" },
  density_2d_filled: { stat: "density_2d_filled", position: "identity" },
  dotplot: { stat: "bindot", position: "identity" },
  map: { stat: "identity", position: "identity" },
  sf: { stat: "sf", position: "identity" },
  sf_text: { stat: "sf_coordinates", position: "identity" },
  sf_label: { stat: "sf_coordinates", position: "identity" },
  blank: { stat: "identity", position: "identity" },
  jitter: { stat: "identity", position: "jitter" },
  spoke: { stat: "identity", position: "identity" },
  rug: { stat: "identity", position: "identity" },
  step: { stat: "identity", position: "identity" },
  qq: { stat: "qq", position: "identity" },
  qq_line: { stat: "qq_line", position: "identity" },
  bin_2d: { stat: "bin_2d", position: "identity" },
};
