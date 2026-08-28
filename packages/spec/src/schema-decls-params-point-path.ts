/**
 * `$defs` partial — point/path geom params (PointParams…PathParams).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";
import { POINT_SHAPE_NAME_SCHEMAS } from "./schema-name-schemas.js";

export const ParamsPointPathDecls = {
  PointParams: Type.Object(
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
          description: "Point radius in px. Must be greater than 0. Default 2.5.",
        }),
      ),
      shape: Type.Optional(
        Type.Union(POINT_SHAPE_NAME_SCHEMAS, {
          description:
            'Point shape. One of "circle", "triangle", "square", "diamond", "plus", "cross", "circle-open". Default "circle".',
        }),
      ),
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "STAT SUMMARY_BIN ONLY: number of bins (integer ≥ 1). Default 30 — advisory. Overridden by binwidth.",
        }),
      ),
      binwidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "STAT SUMMARY_BIN ONLY: bin width in data units (must be greater than 0). Takes precedence over bins.",
        }),
      ),
      boundary: Type.Optional(
        Type.Number({
          description:
            "STAT SUMMARY_BIN ONLY: align a bin EDGE with this x value. Mutually exclusive with center.",
        }),
      ),
      center: Type.Optional(
        Type.Number({
          description:
            "STAT SUMMARY_BIN ONLY: align a bin CENTER with this x value. Mutually exclusive with boundary.",
        }),
      ),
      closed: Type.Optional(
        Type.Union([Type.Literal("right"), Type.Literal("left")], {
          description:
            'STAT SUMMARY_BIN ONLY: which edge of each bin is inclusive: "right" (default) or "left".',
        }),
      ),
      window: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            'STAT SUMMARY_ROLLING ONLY: centered rolling-window width in x data units (must be greater than 0). Required when stat is "summary_rolling".',
        }),
      ),
      fun: Type.Optional(
        Type.Union(
          [
            Type.Literal("first"),
            Type.Literal("last"),
            Type.Literal("mean"),
            Type.Literal("median"),
            Type.Literal("min"),
            Type.Literal("max"),
            Type.Literal("sum"),
          ],
          {
            description:
              'SUMMARY_BIN / SUMMARY_ROLLING center fun (mean/median/sum;) or MANUAL named transform (first|last|mean|median|min|max|sum;). Required when stat is "manual".',
          },
        ),
      ),
      funMin: Type.Optional(
        Type.Ref("SummaryFun", {
          description: "STAT SUMMARY_BIN ONLY: lower bound summary (ymin).",
        }),
      ),
      funMax: Type.Optional(
        Type.Ref("SummaryFun", {
          description: "STAT SUMMARY_BIN ONLY: upper bound summary (ymax).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Styling parameters for the point geom, plus summary_bin, summary_rolling, and/or manual controls.",
    },
  ),

  LineParams: Type.Object(
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
          description: "Stroke width in px. Must be greater than 0. Default 1.5.",
        }),
      ),
      curve: Type.Optional(
        Type.Union(
          [
            Type.Literal("linear"),
            Type.Literal("step"),
            Type.Literal("step-hv"),
            Type.Literal("step-vh"),
          ],
          {
            description:
              'Interpolation: "linear" (default), "step" (mid-x corners), "step-hv" (horizontal then vertical — correct for ECDF), or "step-vh".',
          },
        ),
      ),
      pad: Type.Optional(
        Type.Boolean({
          description:
            "With stat ecdf: when true (default), prepend (xmin, 0) so step stairs start at zero. Finite-clamped.",
        }),
      ),
      n: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "With stat ecdf: evaluate on n equally spaced x in [min, max] per group; omit for one point per unique x.",
        }),
      ),
      connection: Type.Optional(
        Type.Union(
          [
            Type.Literal("hv", {
              description: "STAT CONNECT: horizontal then vertical (default).",
            }),
            Type.Literal("vh", {
              description: "STAT CONNECT: vertical then horizontal.",
            }),
            Type.Literal("mid", {
              description: "STAT CONNECT: step at the midpoint between adjacent x values.",
            }),
            Type.Literal("linear", {
              description: "STAT CONNECT: straight segment (identity vertices).",
            }),
          ],
          {
            description:
              'STAT CONNECT ONLY: how successive points join — "hv" (default), "vh", "mid", or "linear". Ignored for other stats.',
          },
        ),
      ),
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "STAT BIN / SUMMARY_BIN: number of bins (integer ≥ 1). Default 30 — an advisory reminds you to pick a real value. Overridden by binwidth.",
        }),
      ),
      binwidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "STAT BIN / SUMMARY_BIN: bin width in data units (must be greater than 0). Takes precedence over bins.",
        }),
      ),
      boundary: Type.Optional(
        Type.Number({
          description:
            "STAT BIN / SUMMARY_BIN: align a bin EDGE with this x value. Mutually exclusive with center.",
        }),
      ),
      center: Type.Optional(
        Type.Number({
          description:
            "STAT BIN / SUMMARY_BIN: align a bin CENTER with this x value. Mutually exclusive with boundary.",
        }),
      ),
      closed: Type.Optional(
        Type.Union([Type.Literal("right"), Type.Literal("left")], {
          description:
            'STAT BIN / SUMMARY_BIN: which edge of each bin is inclusive: "right" (default) or "left".',
        }),
      ),
      window: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            'STAT SUMMARY_ROLLING ONLY: centered rolling-window width in x data units (must be greater than 0). Required when stat is "summary_rolling".',
        }),
      ),
      fun: Type.Optional(
        Type.Union(
          [
            Type.Literal("first"),
            Type.Literal("last"),
            Type.Literal("mean"),
            Type.Literal("median"),
            Type.Literal("min"),
            Type.Literal("max"),
            Type.Literal("sum"),
          ],
          {
            description:
              'SUMMARY_BIN / SUMMARY_ROLLING center fun (mean/median/sum;) or MANUAL named transform (first|last|mean|median|min|max|sum;). Required when stat is "manual".',
          },
        ),
      ),
      funMin: Type.Optional(
        Type.Ref("SummaryFun", {
          description: "STAT SUMMARY_BIN ONLY: lower bound summary (ymin).",
        }),
      ),
      funMax: Type.Optional(
        Type.Ref("SummaryFun", {
          description: "STAT SUMMARY_BIN ONLY: upper bound summary (ymax).",
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
        "Styling parameters for the line geom, plus optional stat-bin (freqpoly), summary_bin, summary_rolling, manual, or ecdf pad/n controls.",
    },
  ),

  /** Path stroke params (no bin knobs — path never uses stat bin). */
  StepParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Step-line opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.5.",
        }),
      ),
      direction: Type.Optional(
        Type.Union([Type.Literal("hv"), Type.Literal("vh"), Type.Literal("mid")], {
          description:
            'Step corner placement: "hv" horizontal then vertical (default), "vh" vertical then horizontal, "mid" change at the midpoint between x positions.',
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
      description: "Styling parameters for the step geom.",
    },
  ),

  PathParams: Type.Object(
    {
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
      curve: Type.Optional(
        Type.Union([Type.Literal("linear"), Type.Literal("step")], {
          description:
            'Interpolation between points: "linear" (straight segments, default) or "step" (horizontal-then-vertical steps).',
        }),
      ),
      connection: Type.Optional(
        Type.Union(
          [
            Type.Literal("hv", {
              description: "STAT CONNECT: horizontal then vertical (default).",
            }),
            Type.Literal("vh", {
              description: "STAT CONNECT: vertical then horizontal.",
            }),
            Type.Literal("mid", {
              description: "STAT CONNECT: step at the midpoint between adjacent x values.",
            }),
            Type.Literal("linear", {
              description: "STAT CONNECT: straight segment (identity vertices).",
            }),
          ],
          {
            description:
              'STAT CONNECT ONLY: how successive points join — "hv" (default), "vh", "mid", or "linear". Ignored for other stats.',
          },
        ),
      ),
      fun: Type.Optional(
        Type.Union(
          [
            Type.Literal("first"),
            Type.Literal("last"),
            Type.Literal("mean"),
            Type.Literal("median"),
            Type.Literal("min"),
            Type.Literal("max"),
            Type.Literal("sum"),
          ],
          {
            description:
              'STAT MANUAL ONLY: portable named transform (first|last|mean|median|min|max|sum). Required when stat is "manual".',
          },
        ),
      ),
      level: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          exclusiveMaximum: 1,
          description:
            "STAT ELLIPSE ONLY: confidence level of the bivariate normal ellipse, strictly between 0 and 1. Default 0.95.",
        }),
      ),
      type: Type.Optional(
        Type.Literal("norm", {
          description:
            'STAT ELLIPSE ONLY: construction type. Only "norm" (bivariate normal) is supported in v1.',
        }),
      ),
      segments: Type.Optional(
        Type.Integer({
          minimum: 3,
          maximum: 500,
          description:
            "STAT ELLIPSE ONLY: number of perimeter samples before the closing duplicate (output length = segments + 1). Default 51.",
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
        "Styling parameters for the path geom (data-order polylines), plus optional connect/manual/ellipse controls.",
    },
  ),
};
