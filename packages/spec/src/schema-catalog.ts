/**
 * Pipeline catalogs keyed off the schema version: geoms, stats, positions,
 * channels, edition stamp, and per-geom defaults (normalize fills these).
 */
/** Geom names known to this schema version (discriminator values of LayerSpec). */
export const KNOWN_GEOMS = [
  "point",
  "line",
  "col",
  "bar",
  "histogram",
  "area",
  "rule",
  "text",
  "smooth",
  "boxplot",
  "density",
  "errorbar",
  "rect",
  "tile",
  "raster",
  "ribbon",
  "segment",
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
] as const;
export type ChannelName = (typeof CHANNELS)[number];

/** Stat names known to this schema version. */
export const KNOWN_STATS = [
  "identity",
  "count",
  "bin",
  "smooth",
  "boxplot",
  "density",
  "summary",
] as const;
export type StatName = (typeof KNOWN_STATS)[number];

/** Position names known to this schema version. */
export const KNOWN_POSITIONS = ["identity", "stack", "fill", "dodge", "jitter", "nudge"] as const;
export type PositionName = (typeof KNOWN_POSITIONS)[number];

/**
 * Per-geom pipeline defaults, mirrored from ggplot2 (normalize() fills these):
 * geom bar counts (stat "count") and stacks; histogram bins and stacks;
 * col/area stack pre-computed values; boxplot dodges (ggplot2 defaults to
 * dodge2 — ggsvelte uses plain dodge, decision 0010); everything else is
 * identity/identity.
 */
export const GEOM_DEFAULTS: Record<GeomName, { stat: StatName; position: PositionName }> = {
  point: { stat: "identity", position: "identity" },
  line: { stat: "identity", position: "identity" },
  col: { stat: "identity", position: "stack" },
  bar: { stat: "count", position: "stack" },
  histogram: { stat: "bin", position: "stack" },
  area: { stat: "identity", position: "stack" },
  rule: { stat: "identity", position: "identity" },
  text: { stat: "identity", position: "identity" },
  smooth: { stat: "smooth", position: "identity" },
  boxplot: { stat: "boxplot", position: "dodge" },
  density: { stat: "density", position: "identity" },
  errorbar: { stat: "identity", position: "identity" },
  rect: { stat: "identity", position: "identity" },
  tile: { stat: "identity", position: "identity" },
  raster: { stat: "identity", position: "identity" },
  ribbon: { stat: "identity", position: "identity" },
  segment: { stat: "identity", position: "identity" },
};
