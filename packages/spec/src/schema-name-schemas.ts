/**
 * TypeBox literals for closed name registries (schema graph only).
 * Runtime name arrays live in schema-names.ts without a typebox import.
 */
import Type, { type TLiteral } from "typebox";

import {
  COLOR_SCHEME_NAMES,
  LINETYPE_NAMES,
  POINT_SHAPE_NAMES,
  THEME_NAMES,
  type LinetypeName,
  type PointShapeName,
} from "./schema-names.js";

type ColorSchemeNameValue = (typeof COLOR_SCHEME_NAMES)[number];
/** TypeBox literals for color scheme names (used by ColorScaleSpec). */
export const COLOR_SCHEME_NAME_SCHEMAS = COLOR_SCHEME_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<ColorSchemeNameValue>, ...TLiteral<ColorSchemeNameValue>[]];

type PointShapeNameValue = PointShapeName;
export const POINT_SHAPE_NAME_SCHEMAS = POINT_SHAPE_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<PointShapeNameValue>, ...TLiteral<PointShapeNameValue>[]];

type LinetypeNameValue = LinetypeName;
export const LINETYPE_NAME_SCHEMAS = LINETYPE_NAMES.map((name) =>
  Type.Literal(name),
) as unknown as [TLiteral<LinetypeNameValue>, ...TLiteral<LinetypeNameValue>[]];

type ThemeNameValue = (typeof THEME_NAMES)[number];
/** TypeBox literals for theme names (used by ThemeName def). */
export const THEME_NAME_SCHEMAS = THEME_NAMES.map((name) => Type.Literal(name)) as unknown as [
  TLiteral<ThemeNameValue>,
  ...TLiteral<ThemeNameValue>[],
];
