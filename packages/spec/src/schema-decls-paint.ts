/**
 * `$defs` partial — paint family (ColorStop…GlowSpec).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";
import { MAX_GLOW_RADIUS, MAX_PAINT_STOPS } from "./schema-names.js";

/** Portable #rgb / #rrggbb only — no CSS names, url(), or filter strings. */
const HEX_COLOR = Type.String({
  pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
  description: "A solid #rgb or #rrggbb color (no CSS names, url(), or filter strings).",
});

export const PaintDecls = {
  ColorStop: Type.Object(
    {
      offset: Type.Number({
        minimum: 0,
        maximum: 1,
        description: "Stop position along the gradient, between 0 and 1 inclusive.",
      }),
      color: HEX_COLOR,
      opacity: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Optional stop opacity between 0 and 1 inclusive. Default 1.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "One ordered gradient color stop. Stops must be non-decreasing by offset (validated structurally).",
    },
  ),

  PaintSpace: Type.Union([Type.Literal("mark"), Type.Literal("panel"), Type.Literal("plot")], {
    description:
      'Gradient coordinate space: "mark" (object bounding box, default), "panel" (panel-local px), or "plot" (plot-local px including panels).',
  }),

  LinearGradientPaint: Type.Object(
    {
      type: Type.Literal("linear"),
      x1: Type.Number({ description: "Gradient start x in the chosen space." }),
      y1: Type.Number({ description: "Gradient start y in the chosen space." }),
      x2: Type.Number({ description: "Gradient end x in the chosen space." }),
      y2: Type.Number({ description: "Gradient end y in the chosen space." }),
      space: Type.Optional(Type.Ref("PaintSpace")),
      stops: Type.Array(Type.Ref("ColorStop"), {
        minItems: 2,
        maxItems: MAX_PAINT_STOPS,
        description: `Ordered color stops (at least 2, at most ${String(MAX_PAINT_STOPS)}).`,
      }),
      fallback: Type.String({
        pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description:
          "Required solid #rgb/#rrggbb used for a11y, forced-SVG, and reduced-effects paths.",
      }),
    },
    {
      additionalProperties: false,
      description:
        "Deterministic linear gradient paint for within-mark fill or stroke. Not a data scale.",
    },
  ),

  RadialGradientPaint: Type.Object(
    {
      type: Type.Literal("radial"),
      cx: Type.Number({ description: "Gradient center x in the chosen space." }),
      cy: Type.Number({ description: "Gradient center y in the chosen space." }),
      r: Type.Number({
        exclusiveMinimum: 0,
        description: "Gradient radius in the chosen space. Must be greater than 0.",
      }),
      space: Type.Optional(Type.Ref("PaintSpace")),
      stops: Type.Array(Type.Ref("ColorStop"), {
        minItems: 2,
        maxItems: MAX_PAINT_STOPS,
        description: `Ordered color stops (at least 2, at most ${String(MAX_PAINT_STOPS)}).`,
      }),
      fallback: Type.String({
        pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description:
          "Required solid #rgb/#rrggbb used for a11y, forced-SVG, and reduced-effects paths.",
      }),
    },
    {
      additionalProperties: false,
      description:
        "Deterministic radial gradient paint for within-mark fill or stroke. Not a data scale.",
    },
  ),

  GradientPaint: Type.Union([Type.Ref("LinearGradientPaint"), Type.Ref("RadialGradientPaint")], {
    description: "Closed portable gradient paint: linear or radial with solid fallback.",
  }),

  GlowSpec: Type.Object(
    {
      color: HEX_COLOR,
      radius: Type.Number({
        exclusiveMinimum: 0,
        maximum: MAX_GLOW_RADIUS,
        description: `Blur radius in CSS px, greater than 0 and at most ${String(MAX_GLOW_RADIUS)}.`,
      }),
      opacity: Type.Number({
        minimum: 0,
        maximum: 1,
        description: "Glow opacity between 0 and 1 inclusive.",
      }),
    },
    {
      additionalProperties: false,
      description:
        "Bounded glow treatment (explicit color, radius, opacity). Opt-in mark appearance, not theme decoration.",
    },
  ),

  // --- per-geom params -------------------------------------------------------
};
