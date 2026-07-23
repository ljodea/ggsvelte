/**
 * Named registries shared by the TypeBox schema graph and runtime catalogs.
 * Kept separate from the `$defs` object so scale/theme name lists can change
 * without editing the full declarations bag.
 */
import Type, { type TLiteral } from "typebox";

/**
 * Hard cap on a binned position scale's bins (automatic or explicit). This is
 * the single shared source of truth: the TypeBox `breaks` `maxItems` below,
 * the core runtime boundary resolver, and the `binned-scale-break-limit`
 * pipeline error all key off it. `n` boundaries produce `n − 1` bins, so the
 * schema allows at most `MAX_BINNED_BREAKS + 1` break values.
 */
export const MAX_BINNED_BREAKS = 64;

/** Maximum gradient color stops in a portable paint (closed, bounded). */
export const MAX_PAINT_STOPS = 16;

/** Maximum glow blur radius in CSS px (bounded filter work). */
export const MAX_GLOW_RADIUS = 32;

/** Named categorical color schemes known to this schema version. */
export const CATEGORICAL_SCHEME_NAMES = [
  "observable10",
  "ipsum",
  "flexoki",
  "tableau10",
  "colorblind",
] as const;

/** Named sequential color schemes known to this schema version. */
export const SEQUENTIAL_SCHEME_NAMES = ["viridis"] as const;

export const COLOR_SCHEME_NAMES = [
  ...CATEGORICAL_SCHEME_NAMES,
  ...SEQUENTIAL_SCHEME_NAMES,
] as const;

type ColorSchemeNameValue = (typeof COLOR_SCHEME_NAMES)[number];
/** TypeBox literals for color scheme names (used by ColorScaleSpec). */
export const COLOR_SCHEME_NAME_SCHEMAS = COLOR_SCHEME_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<ColorSchemeNameValue>, ...TLiteral<ColorSchemeNameValue>[]];

/** Audited finite point symbols, ordered by default assignment priority. */
export const POINT_SHAPE_NAMES = [
  "circle",
  "triangle",
  "square",
  "diamond",
  "plus",
  "cross",
] as const;
export type PointShapeName = (typeof POINT_SHAPE_NAMES)[number];
type PointShapeNameValue = PointShapeName;
export const POINT_SHAPE_NAME_SCHEMAS = POINT_SHAPE_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<PointShapeNameValue>, ...TLiteral<PointShapeNameValue>[]];

/** Audited finite stroke patterns, ordered by default assignment priority. */
export const LINETYPE_NAMES = [
  "solid",
  "dashed",
  "dotted",
  "dotdash",
  "longdash",
  "twodash",
] as const;
export type LinetypeName = (typeof LINETYPE_NAMES)[number];
type LinetypeNameValue = LinetypeName;
export const LINETYPE_NAME_SCHEMAS = LINETYPE_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<LinetypeNameValue>, ...TLiteral<LinetypeNameValue>[]];

/** Built-in theme names known to this schema version. */
export const THEME_NAMES = [
  "default",
  "light",
  "dark",
  "minimal",
  "ggplot2",
  "classic",
  "hrbr",
  "few",
  "clean",
  "fivethirtyeight",
  "economist",
  "tufte",
] as const;

type ThemeNameValue = (typeof THEME_NAMES)[number];
/** TypeBox literals for theme names (used by ThemeName def). */
export const THEME_NAME_SCHEMAS = THEME_NAMES.map((name) => Type.Literal(name)) as unknown as [
  TLiteral<ThemeNameValue>,
  ...TLiteral<ThemeNameValue>[],
];
