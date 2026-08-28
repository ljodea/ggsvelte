/**
 * `$defs` partial — column/stat geom params (ColParams…ContourParams).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";
import { POINT_SHAPE_NAME_SCHEMAS } from "./schema-name-schemas.js";

export const ParamsColContourDecls = {
  ColParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Bar opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Bar width as a fraction of the band step. Must be greater than 0 and at most 1. Default 0.9.",
        }),
      ),
      fillPaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description:
            "Within-mark gradient fill paint (not a data scale). Requires a solid fallback.",
        }),
      ),
      glow: Type.Optional(
        Type.Ref("GlowSpec", {
          description: "Bounded within-mark glow treatment (not theme decoration).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Styling parameters for the col geom.",
    },
  ),

  BarParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Bar opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Bar width as a fraction of the band step (count-stat bars only; binned bars span their bin). Must be greater than 0 and at most 1. Default 0.9.",
        }),
      ),
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "STAT BIN ONLY: number of bins (an integer of at least 1). Default 30 — an advisory reminds you to pick a real value. Overridden by binwidth.",
        }),
      ),
      binwidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "STAT BIN ONLY: bin width in data units (must be greater than 0). Takes precedence over bins. Usually the better knob: pick a width meaningful for the data.",
        }),
      ),
      boundary: Type.Optional(
        Type.Number({
          description:
            "STAT BIN ONLY: align a bin EDGE with this x value (e.g. 0 puts bin edges at multiples of the width). Mutually exclusive with center.",
        }),
      ),
      center: Type.Optional(
        Type.Number({
          description:
            "STAT BIN ONLY: align a bin CENTER with this x value. Mutually exclusive with boundary.",
        }),
      ),
      closed: Type.Optional(
        Type.Union([Type.Literal("right"), Type.Literal("left")], {
          description:
            'STAT BIN ONLY: which edge of each bin is inclusive: "right" (default, matches) or "left".',
        }),
      ),
      fillPaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description:
            "Within-mark gradient fill paint (not a data scale). Requires a solid fallback.",
        }),
      ),
      glow: Type.Optional(
        Type.Ref("GlowSpec", {
          description: "Bounded within-mark glow treatment (not theme decoration).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Parameters for the bar and histogram geoms: styling (alpha, width) plus stat-bin binning controls (bins, binwidth, boundary, center, closed).",
    },
  ),

  SmoothParams: Type.Object(
    {
      method: Type.Optional(
        Type.Union([Type.Literal("lm"), Type.Literal("loess")], {
          description:
            'Smoothing method: "lm" (least-squares line) or "loess" (local polynomial regression). Omit to infer: loess for fewer than 1000 rows, lm above (an advisory reports the choice).',
        }),
      ),
      se: Type.Optional(
        Type.Boolean({
          description: "Draw the confidence-interval ribbon around the fit. Default true.",
        }),
      ),
      level: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          exclusiveMaximum: 1,
          description: "Confidence level of the ribbon, strictly between 0 and 1. Default 0.95.",
        }),
      ),
      span: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "LOESS ONLY: fraction of points in each local neighborhood, greater than 0 and at most 1. Default 0.75. Smaller = wigglier.",
        }),
      ),
      degree: Type.Optional(
        Type.Union([Type.Literal(1), Type.Literal(2)], {
          description:
            "LOESS ONLY: degree of the local polynomial, 1 or 2. Default 2 (the R default).",
        }),
      ),
      n: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: 5000,
          description:
            "Number of evaluation points along x (an integer between 2 and 5000). Default 80.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width of the fitted line in px. Must be greater than 0. Default 1.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Line opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      strokePaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description: "Within-mark gradient stroke paint for the fitted line (not a data scale).",
        }),
      ),
      glow: Type.Optional(
        Type.Ref("GlowSpec", {
          description: "Bounded within-mark glow treatment (not theme decoration).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Parameters for the smooth geom (fitted trend line + optional se ribbon).",
    },
  ),

  QuantileParams: Type.Object(
    {
      quantiles: Type.Optional(
        Type.Array(
          Type.Number({
            exclusiveMinimum: 0,
            exclusiveMaximum: 1,
            description: "One conditional quantile τ strictly between 0 and 1.",
          }),
          {
            minItems: 1,
            description:
              "Conditional quantiles of y to fit and draw. Each entry must be in (0, 1). Default [0.25, 0.5, 0.75].",
          },
        ),
      ),
      n: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: 5000,
          description:
            "Number of evaluation points along x (integer 2–5000). Default 80. Linear fits need only endpoints; denser grids help nonlinear coords.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width of quantile lines in px. Must be greater than 0. Default 1.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Line opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      strokePaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description: "Within-mark gradient stroke paint for quantile lines (not a data scale).",
        }),
      ),
      glow: Type.Optional(
        Type.Ref("GlowSpec", {
          description: "Bounded within-mark glow treatment (not theme decoration).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Parameters for the quantile geom (linear y~x quantile regression lines;). method rqss is intentionally omitted in v1.",
    },
  ),
  QqParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Point opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      size: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Point size in px. Must be greater than 0.",
        }),
      ),
      shape: Type.Optional(
        Type.Union(POINT_SHAPE_NAME_SCHEMAS, {
          description:
            'Point shape. One of "circle", "triangle", "square", "diamond", "plus", "cross", "circle-open". Default "circle".',
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Styling for geom_qq (Q–Q scatter). Requires aes.sample; x/y become theoretical and sample quantiles.",
    },
  ),
  QqLineParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Line opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Styling for geom_qq_line (reference line through sample/theoretical quartile match).",
    },
  ),

  ContourParams: Type.Object(
    {
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "Number of evenly spaced contour levels from min(z) to max(z) inclusive (integer ≥ 1). Default 10. Overridden by breaks or binwidth.",
        }),
      ),
      binwidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Contour level step in z units (must be greater than 0). Takes precedence over bins; overridden by breaks.",
        }),
      ),
      breaks: Type.Optional(
        Type.Array(Type.Number(), {
          minItems: 1,
          description:
            "Explicit contour levels (finite numbers). Overrides bins and binwidth when non-empty.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width of contour lines in px. Must be greater than 0. Default 1.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Line opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Parameters for geom_contour isolines. v1: regular grid only; contour_filled deferred.",
    },
  ),
};
