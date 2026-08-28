/**
 * `$defs` partial — distribution/stat geom params (ViolinParams…SummaryFun).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";
import { POINT_SHAPE_NAME_SCHEMAS } from "./schema-name-schemas.js";

export const ParamsViolinSummaryDecls = {
  ViolinParams: Type.Object(
    {
      bw: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Kernel bandwidth in data units (must be greater than 0). Omit for R's bw.nrd0 rule-of-thumb default.",
        }),
      ),
      adjust: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Bandwidth multiplier (must be greater than 0). Default 1.",
        }),
      ),
      n: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: 4096,
          description: "Number of density grid points (2–4096). Default 512.",
        }),
      ),
      trim: Type.Optional(
        Type.Boolean({
          description:
            "When true (default), trim the density to the data range; when false, extend cut·bw tails like density().",
        }),
      ),
      scale: Type.Optional(
        Type.Union([Type.Literal("area"), Type.Literal("count"), Type.Literal("width")], {
          description:
            'Relative violin max-width scaling: "area" (default), "count", or "width" (equal max width).',
        }),
      ),
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Max violin width as a fraction of the discrete x band (like boxplot). Default 0.75.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Fill opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Outline stroke width in px. Must be greater than 0. Default 0.5.",
        }),
      ),
      fillPaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description:
            "Within-mark gradient fill paint (not a data scale). Requires a solid fallback.",
        }),
      ),
      strokePaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description:
            "Within-mark gradient stroke paint (not a data scale). Requires a solid fallback.",
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
      description: "Parameters for the violin geom (mirrored y-density polygons).",
    },
  ),

  BoxplotParams: Type.Object(
    {
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Box width as a fraction of the band step. Must be greater than 0 and at most 1. Default 0.75. When omitted, width is also capped at 15% of the panel so few categories do not read as slabs.",
        }),
      ),
      coef: Type.Optional(
        Type.Number({
          minimum: 0,
          description:
            "Whisker length as a multiple of the IQR (values beyond it are outliers). Must be at least 0. Default 1.5.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Stroke width of the box, whiskers, and median line in px (the median draws at twice this). Must be greater than 0. Default 1.",
        }),
      ),
      outlierSize: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Outlier point radius in px. Must be greater than 0. Default 1.5.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Layer opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Styling parameters for the boxplot geom.",
    },
  ),

  FunctionRegistryName: Type.Union(
    [
      Type.Literal("identity"),
      Type.Literal("dnorm"),
      Type.Literal("pnorm"),
      Type.Literal("linear"),
    ],
    {
      description:
        'Portable named function for stat/geom function: "identity", "dnorm" (normal PDF), "pnorm" (normal CDF), or "linear" (a + b·x).',
    },
  ),

  FunctionArgs: Type.Object(
    {
      mean: Type.Optional(Type.Number({ description: "Mean for dnorm/pnorm. Default 0." })),
      sd: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Standard deviation for dnorm/pnorm (must be > 0). Default 1.",
        }),
      ),
      a: Type.Optional(
        Type.Number({ description: "Intercept for linear (y = a + b·x). Default 0." }),
      ),
      b: Type.Optional(Type.Number({ description: "Slope for linear (y = a + b·x). Default 1." })),
    },
    {
      additionalProperties: false,
      description: "Named arguments for the registry function.",
    },
  ),

  FunctionParams: Type.Object(
    {
      fun: Type.Ref("FunctionRegistryName", {
        description: "Required named function from the portable registry.",
      }),
      n: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: 10000,
          description: "Number of evaluation grid points (2–10000). Default 101.",
        }),
      ),
      xlim: Type.Optional(
        Type.Array(Type.Number(), {
          minItems: 2,
          maxItems: 2,
          description:
            "Evaluation domain [min, max] (min < max). When omitted, uses continuous aes.x extent or peer-layer x domain.",
        }),
      ),
      args: Type.Optional(
        Type.Ref("FunctionArgs", {
          description:
            "Optional named arguments for the registry function (e.g. mean and sd for dnorm). Keys and values must be portable JSON.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Path opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.5.",
        }),
      ),
      strokePaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description:
            "Within-mark gradient stroke paint (not a data scale). Requires a solid fallback.",
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
        "Parameters for geom/stat function: named fun, grid size n, optional xlim and args.",
    },
  ),

  DotplotParams: Type.Object(
    {
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "Number of bins (integer ≥ 1). Default 30 — advisory when neither bins nor binwidth is set. Overridden by binwidth.",
        }),
      ),
      binwidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Histodot bin width in data units (must be greater than 0). Takes precedence over bins. Also drives default point diameter via the x scale.",
        }),
      ),
      boundary: Type.Optional(
        Type.Number({
          description: "Align a bin edge to this value (mutually exclusive with center).",
        }),
      ),
      center: Type.Optional(
        Type.Number({
          description: "Align a bin center to this value (mutually exclusive with boundary).",
        }),
      ),
      closed: Type.Optional(
        Type.Union([Type.Literal("right"), Type.Literal("left")], {
          description:
            'Which side of each bin is closed: "right" (default, (lo, hi]) or "left" ([lo, hi)).',
        }),
      ),
      stackdir: Type.Optional(
        Type.Union(
          [
            Type.Literal("up"),
            Type.Literal("down"),
            Type.Literal("center"),
            Type.Literal("centerwhole"),
          ],
          {
            description:
              'Stack direction: "up" (default), "down", "center", or "centerwhole" (integer-aligned center).',
          },
        ),
      ),
      stackratio: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Relative spacing between stacked dots (must be greater than 0). Default 1.",
        }),
      ),
      dotsize: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Multiplier on diameter derived from binwidth × x-scale (must be greater than 0). Default 1. Ignored when params.size is set.",
        }),
      ),
      size: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Point radius in px (must be greater than 0). When set, overrides binwidth-derived sizing.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Point opacity. Must be between 0 and 1 (inclusive). Default 1.",
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
        "Parameters for geom_dotplot (histodot binning + stacked dots;). method=dotdensity and binaxis=y are not in v1.",
    },
  ),

  DensityParams: Type.Object(
    {
      bw: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Kernel bandwidth in data units (must be greater than 0). Omit for R's bw.nrd0 rule-of-thumb default.",
        }),
      ),
      adjust: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Bandwidth multiplier (must be greater than 0). Default 1. 0.5 = half the default bandwidth (wigglier), 2 = double (smoother).",
        }),
      ),
      n: Type.Optional(
        Type.Integer({
          minimum: 2,
          maximum: 4096,
          description:
            "Number of grid points the density is evaluated at (an integer between 2 and 4096). Default 512 (the R default).",
        }),
      ),
      cut: Type.Optional(
        Type.Number({
          minimum: 0,
          description:
            "The grid extends cut * bandwidth beyond the data extremes (at least 0). Default 3 (the R default).",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Area fill opacity. Must be between 0 and 1 (inclusive). Default 1.",
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
      description: "Parameters for the density geom (gaussian kernel density estimate).",
    },
  ),

  Density2dParams: Type.Object(
    {
      h: Type.Optional(
        Type.Union(
          [
            Type.Number({ exclusiveMinimum: 0 }),
            Type.Array(Type.Number({ exclusiveMinimum: 0 }), { minItems: 2, maxItems: 2 }),
          ],
          {
            description:
              "Kernel bandwidth: one positive number for both axes, or [hx, hy]. Omit for MASS bandwidth.nrd per axis (then kde2d h/4 scaling).",
          },
        ),
      ),
      adjust: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Bandwidth multiplier (must be greater than 0). Default 1.",
        }),
      ),
      n: Type.Optional(
        Type.Integer({
          minimum: 10,
          maximum: 200,
          description:
            "Grid resolution per axis for the KDE surface (integer 10–200). Default 100.",
        }),
      ),
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "Number of contour levels of the density surface (integer ≥ 1). Default 10. Overridden by breaks.",
        }),
      ),
      binwidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Contour level step in density units. Overridden by breaks.",
        }),
      ),
      breaks: Type.Optional(
        Type.Array(Type.Number(), {
          minItems: 1,
          description: "Explicit density contour levels. Overrides bins and binwidth.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width of density contours in px. Must be greater than 0. Default 1.",
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
        "Parameters for geom_density_2d / geom_density_2d_filled (bivariate KDE;). contour_var density only.",
    },
  ),

  SummaryFun: Type.Union(
    [
      Type.Literal("mean"),
      Type.Literal("median"),
      Type.Literal("sum"),
      Type.Literal("min"),
      Type.Literal("max"),
    ],
    {
      description: 'A summary function: "mean", "median", "sum", "min", or "max".',
    },
  ),
};
