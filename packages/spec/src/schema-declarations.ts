/**
 * Ordered TypeBox named `$defs` for the ggsvelte PortableSpec graph.
 *
 * Key **insertion order** is load-bearing: `Type.Cyclic` / the published
 * `schema/v0.json` serialize `$defs` in this order. Pure move from schema.ts —
 * do not reorder keys or edit field descriptions while relocating.
 *
 * Cross-refs use string `Type.Ref("Name")` and resolve only after this object
 * is passed to `Type.Cyclic` / `Type.Module` in schema.ts.
 */
import Type from "typebox";

import {
  TemporalIntervalSpecSchema,
  TemporalLabelSpecSchema,
  TemporalWeekStartSchema,
} from "./temporal-interval.js";

import { TemporalParserSpecSchema } from "./temporal-parse.js";
import { CURRENT_EDITION } from "./schema-catalog.js";

import {
  COLOR_SCHEME_NAME_SCHEMAS,
  LINETYPE_NAME_SCHEMAS,
  MAX_BINNED_BREAKS,
  MAX_GLOW_RADIUS,
  MAX_PAINT_STOPS,
  POINT_SHAPE_NAME_SCHEMAS,
  THEME_NAMES,
  THEME_NAME_SCHEMAS,
} from "./schema-names.js";

/** Portable #rgb / #rrggbb only — no CSS names, url(), or filter strings. */
const HEX_COLOR = Type.String({
  pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
  description: "A solid #rgb or #rrggbb color (no CSS names, url(), or filter strings).",
});

const forbiddenColorOption = () => Type.Optional(Type.Never());
const forbiddenStyleOption = () => Type.Optional(Type.Never());

/** Size aesthetic only (#830). Shared onto PositiveStyleScaleSpec (size+linewidth). */
const sizeUnitField = {
  /**
   * Size-only rescaling mode (ignored for linewidth). Default `area` matches
   * the existing continuous size map (area between range endpoints).
   * `radius` is linear; `area_zero` forces zero→zero area (ggplot2 scale_size_area).
   */
  sizeUnit: Type.Optional(
    Type.Union([Type.Literal("area"), Type.Literal("radius"), Type.Literal("area_zero")], {
      description:
        'Size encoding unit (size aesthetic only). "area" (default) interpolates by area between range endpoints; "radius" maps linearly to radius; "area_zero" maps value proportionally to area with zero→zero (ggplot2 scale_size_area / scale_size_binned_area).',
    }),
  ),
};

function numericStyleScaleSpec(
  rangeValue: ReturnType<typeof Type.Number>,
  description: string,
  /** Extra optional fields on the base object (e.g. sizeUnit for PositiveStyleScaleSpec). */
  extraFields: typeof sizeUnitField | Record<string, never> = {},
) {
  return Type.Intersect([
    Type.Object(
      {
        type: Type.Optional(
          Type.Union([
            Type.Literal("ordinal"),
            Type.Literal("sequential"),
            Type.Literal("binned"),
            Type.Literal("manual"),
            Type.Literal("identity"),
          ]),
        ),
        temporalKind: Type.Optional(Type.Union([Type.Literal("date"), Type.Literal("datetime")])),
        parse: Type.Optional(Type.Ref("TemporalParserSpec")),
        parseFailure: Type.Optional(Type.Union([Type.Literal("error"), Type.Literal("censor")])),
        timezone: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
        disambiguation: Type.Optional(
          Type.Union([
            Type.Literal("compatible"),
            Type.Literal("earlier"),
            Type.Literal("later"),
            Type.Literal("reject"),
          ]),
        ),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 1 })),
        domainMode: Type.Optional(Type.Union([Type.Literal("grow"), Type.Literal("data")])),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), { minItems: 2 }),
        ),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 1 })),
        reverse: Type.Optional(Type.Boolean()),
        oob: Type.Optional(Type.Union([Type.Literal("censor"), Type.Literal("squish")])),
        naValue: Type.Optional(rangeValue),
        unknownValue: Type.Optional(rangeValue),
        onExhaust: Type.Optional(Type.Union([Type.Literal("cycle"), Type.Literal("error")])),
        labels: Type.Optional(Type.String()),
        guide: Type.Optional(Type.Ref("GuideSpec")),
        ...extraFields,
      },
      { additionalProperties: false, description },
    ),
    Type.Union([
      Type.Object({
        type: Type.Literal("binned"),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 2, maxItems: 2 })),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), {
            minItems: 2,
            maxItems: MAX_BINNED_BREAKS + 1,
          }),
        ),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 2 })),
        domainMode: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("manual"),
        range: Type.Array(rangeValue, { minItems: 1 }),
        temporalKind: forbiddenStyleOption(),
        parse: forbiddenStyleOption(),
        parseFailure: forbiddenStyleOption(),
        timezone: forbiddenStyleOption(),
        disambiguation: forbiddenStyleOption(),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        oob: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("identity"),
        temporalKind: forbiddenStyleOption(),
        parse: forbiddenStyleOption(),
        parseFailure: forbiddenStyleOption(),
        timezone: forbiddenStyleOption(),
        disambiguation: forbiddenStyleOption(),
        domain: forbiddenStyleOption(),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        range: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        oob: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("ordinal"),
        temporalKind: forbiddenStyleOption(),
        parse: forbiddenStyleOption(),
        parseFailure: forbiddenStyleOption(),
        timezone: forbiddenStyleOption(),
        disambiguation: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        oob: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("sequential"),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 2, maxItems: 2 })),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 2 })),
        domainMode: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
      }),
      Type.Object({ type: forbiddenStyleOption() }),
    ]),
  ]);
}

function finiteStyleScaleSpec(rangeValue: ReturnType<typeof Type.Union>, description: string) {
  return Type.Intersect([
    Type.Object(
      {
        type: Type.Optional(
          Type.Union([
            Type.Literal("ordinal"),
            Type.Literal("binned"),
            Type.Literal("manual"),
            Type.Literal("identity"),
          ]),
        ),
        domain: Type.Optional(Type.Array(Type.Ref("DomainValue"), { minItems: 1 })),
        domainMode: Type.Optional(Type.Union([Type.Literal("grow"), Type.Literal("data")])),
        breaks: Type.Optional(Type.Array(Type.Number(), { minItems: 2 })),
        range: Type.Optional(Type.Array(rangeValue, { minItems: 1 })),
        reverse: Type.Optional(Type.Boolean()),
        naValue: Type.Optional(rangeValue),
        unknownValue: Type.Optional(rangeValue),
        onExhaust: Type.Optional(Type.Union([Type.Literal("cycle"), Type.Literal("error")])),
        labels: Type.Optional(Type.String()),
        guide: Type.Optional(Type.Ref("GuideSpec")),
      },
      { additionalProperties: false, description },
    ),
    Type.Union([
      Type.Object({
        type: Type.Literal("binned"),
        domain: Type.Optional(Type.Array(Type.Number(), { minItems: 2, maxItems: 2 })),
        breaks: Type.Optional(
          Type.Array(Type.Number(), { minItems: 2, maxItems: MAX_BINNED_BREAKS + 1 }),
        ),
        domainMode: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("manual"),
        range: Type.Array(rangeValue, { minItems: 1 }),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("identity"),
        domain: forbiddenStyleOption(),
        domainMode: forbiddenStyleOption(),
        breaks: forbiddenStyleOption(),
        range: forbiddenStyleOption(),
        reverse: forbiddenStyleOption(),
        onExhaust: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({
        type: Type.Literal("ordinal"),
        breaks: forbiddenStyleOption(),
        labels: forbiddenStyleOption(),
      }),
      Type.Object({ type: forbiddenStyleOption() }),
    ]),
  ]);
}

export const SpecDeclarations = {
  CellValue: Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()], {
    description:
      'A single data cell: string, number, boolean, or null. Dates travel as ISO 8601 strings (e.g. "2026-07-10"); non-finite numbers travel as null.',
  }),

  DataValues: Type.Object(
    {
      values: Type.Array(
        Type.Object(
          {},
          {
            additionalProperties: Type.Ref("CellValue"),
            description: "One data row: an object mapping field names to cell values.",
          },
        ),
        {
          description: "Row-oriented inline data: an array of row objects sharing field names.",
        },
      ),
    },
    {
      additionalProperties: false,
      description: 'Inline row-oriented data. Example: {"values": [{"x": 1, "y": 2}]}.',
    },
  ),

  DataColumns: Type.Object(
    {
      columns: Type.Record(Type.String(), Type.Array(Type.Ref("CellValue")), {
        description:
          "Column-oriented inline data: an object mapping each field name to an array of cell values. All arrays must have the same length.",
      }),
    },
    {
      additionalProperties: false,
      description: 'Inline column-oriented data. Example: {"columns": {"x": [1, 2], "y": [3, 4]}}.',
    },
  ),

  DataName: Type.Object(
    {
      name: Type.String({
        description:
          "Name of a dataset provided out-of-band: either a key of the spec's top-level `datasets`, or a dataset passed by the host at render time.",
      }),
    },
    {
      additionalProperties: false,
      description: 'A reference to a named dataset. Example: {"name": "cars"}.',
    },
  ),

  DataRef: Type.Union([Type.Ref("DataValues"), Type.Ref("DataColumns"), Type.Ref("DataName")], {
    description:
      "Where a plot's data comes from: inline rows ({values}), inline columns ({columns}), or a named dataset ({name}). Exactly one form.",
  }),

  InlineData: Type.Union([Type.Ref("DataValues"), Type.Ref("DataColumns")], {
    description: "Inline data only ({values} or {columns}); used for entries of `datasets`.",
  }),

  FieldRef: Type.Object(
    {
      field: Type.String({
        description: "Name of the data column this channel reads from.",
      }),
    },
    {
      additionalProperties: false,
      description:
        'Map this channel to a data field (column). Example: {"field": "displ"}. This is the canonical form — bare strings are NOT valid channel values.',
    },
  ),

  ValueRef: Type.Object(
    {
      value: Type.Union([Type.String(), Type.Number(), Type.Boolean()], {
        description: "The constant value applied to every mark.",
      }),
      scale: Type.Optional(
        Type.Boolean({
          description:
            "If true, the constant is passed THROUGH the channel's scale (like a data value). Default false: the constant is used literally (e.g. a CSS color).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        'Map this channel to a constant. Example: {"value": "steelblue"} sets a literal color; {"value": "treatment", "scale": true} routes the constant through the scale.',
    },
  ),

  StatRef: Type.Object(
    {
      stat: Type.String({
        description:
          "Name of a stat-generated column computed after the layer's stat runs (e.g. \"count\" for the count stat). ggplot2's after_stat().",
      }),
    },
    {
      additionalProperties: false,
      description:
        'Map this channel to a column generated by the layer\'s stat (after-stat form). Example: {"stat": "count"}.',
    },
  ),

  ChannelValue: Type.Union(
    [Type.Ref("FieldRef"), Type.Ref("ValueRef"), Type.Ref("StatRef"), Type.Null()],
    {
      description:
        "How one aesthetic channel gets its value: a data field ({field}), a constant ({value, scale?}), a stat output ({stat}), or null to UNSET a channel inherited from the plot-level mapping. Bare strings are not valid.",
    },
  ),

  Aes: Type.Object(
    {
      x: Type.Optional(Type.Ref("ChannelValue", { description: "Horizontal position channel." })),
      y: Type.Optional(Type.Ref("ChannelValue", { description: "Vertical position channel." })),
      color: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Stroke/point color channel. Discrete fields get a categorical palette; quantitative fields get a sequential ramp.",
        }),
      ),
      fill: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Fill color channel (areas, bars, filled shapes). Discrete fields get a categorical palette; quantitative fields get a sequential ramp.",
        }),
      ),
      size: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Mark size channel (AREA-scaled — sqrt scale; use `linewidth` for stroke width, which scales linearly).",
        }),
      ),
      linewidth: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Stroke width channel (LENGTH-scaled — linear; distinct from `size`, which scales by area).",
        }),
      ),
      alpha: Type.Optional(
        Type.Ref("ChannelValue", {
          description: "Opacity channel, 0 (transparent) to 1 (opaque).",
        }),
      ),
      shape: Type.Optional(
        Type.Ref("ChannelValue", {
          description: "Finite point-symbol channel. Continuous values require a binned scale.",
        }),
      ),
      linetype: Type.Optional(
        Type.Ref("ChannelValue", {
          description: "Finite stroke-pattern channel. Continuous values require a binned scale.",
        }),
      ),
      group: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            'Explicit grouping channel. Overrides the default grouping (the interaction of all discrete mapped aesthetics). A constant (e.g. {"value": 1}) forces a single group.',
        }),
      ),
      label: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Text label channel (used by the text geom; never participates in grouping).",
        }),
      ),
      weight: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Statistical weight channel. The count, bin, and density stats sum weights instead of counting rows. Never participates in grouping.",
        }),
      ),
      ymin: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Lower y bound (errorbar identity, rect edges, ribbon x-orientation). Quantitative values only.",
        }),
      ),
      ymax: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Upper y bound (errorbar identity, rect edges, ribbon x-orientation). Quantitative values only.",
        }),
      ),
      xmin: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Left edge / lower x bound (geom rect; ribbon y-orientation). Quantitative values only.",
        }),
      ),
      xmax: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Right edge / upper x bound (geom rect; ribbon y-orientation). Quantitative values only.",
        }),
      ),
      xend: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Segment end x (geom segment). Trains the x scale together with aes.x; may be discrete or continuous.",
        }),
      ),
      yend: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Segment end y (geom segment). Trains the y scale together with aes.y; may be discrete or continuous.",
        }),
      ),
      width: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Cell width for geom tile (data units after position transform; not a trained position scale). Prefer params.width for a constant.",
        }),
      ),
      height: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Cell height for geom tile (data units after position transform; not a trained position scale). Prefer params.height for a constant.",
        }),
      ),
      z: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Surface height for geom contour / stat contour (quantitative grid values over continuous x×y; #801).",
        }),
      ),
      map_id: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Region join key for geom_map (value-table column matched to the map data id column; #808).",
        }),
      ),
      angle: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Spoke direction in radians (geom spoke; 0 = +x, π/2 = +y). Quantitative only. May also be set as params.angle.",
        }),
      ),
      radius: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Spoke length in data units (geom spoke). Quantitative only. May also be set as params.radius.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Aesthetic mapping: which channels read which data fields/constants. Plot-level aes is inherited by every layer; a layer's aes overrides per channel, and null unsets an inherited channel.",
    },
  ),

  // --- within-mark paint (#591) ----------------------------------------------

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
            'Point shape. One of "circle", "triangle", "square", "diamond", "plus", "cross". Default "circle".',
        }),
      ),
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "STAT SUMMARY_BIN ONLY (#817): number of bins (integer ≥ 1). Default 30 — advisory. Overridden by binwidth.",
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
              'SUMMARY_BIN center fun (mean/median/sum; #817) or MANUAL named transform (first|last|mean|median|min|max|sum; #814). Required when stat is "manual".',
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
        "Styling parameters for the point geom, plus summary_bin (#817) and/or manual (#814) controls.",
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
        Type.Union([Type.Literal("linear"), Type.Literal("step")], {
          description:
            'Interpolation between points: "linear" (straight segments, default) or "step" (horizontal-then-vertical steps, changing at the midpoint between x positions).',
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
              'STAT CONNECT ONLY (#816): how successive points join — "hv" (default), "vh", "mid", or "linear". Ignored for other stats.',
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
              'SUMMARY_BIN center fun (mean/median/sum; #817) or MANUAL named transform (first|last|mean|median|min|max|sum; #814). Required when stat is "manual".',
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
        "Styling parameters for the line geom, plus optional stat-bin (freqpoly), summary_bin (#817), or manual (#814) controls.",
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
            'Step corner placement (ggplot2 geom_step): "hv" horizontal then vertical (default), "vh" vertical then horizontal, "mid" change at the midpoint between x positions.',
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
      description: "Styling parameters for the step geom (ggplot2 geom_step).",
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
              'STAT CONNECT ONLY (#816): how successive points join — "hv" (default), "vh", "mid", or "linear". Ignored for other stats.',
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
              'STAT MANUAL ONLY (#814): portable named transform (first|last|mean|median|min|max|sum). Required when stat is "manual".',
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
            'STAT BIN ONLY: which edge of each bin is inclusive: "right" (default, matches ggplot2) or "left".',
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
        "Parameters for the quantile geom (linear y~x quantile regression lines; #805). method rqss is intentionally omitted in v1.",
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
        "Parameters for geom_contour isolines (#801). v1: regular grid only; contour_filled deferred.",
    },
  ),

  BoxplotParams: Type.Object(
    {
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Box width as a fraction of the band step. Must be greater than 0 and at most 1. Default 0.75 (ggplot2). When omitted, width is also capped at 15% of the panel so few categories do not read as slabs.",
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
            'Point shape. One of "circle", "triangle", "square", "diamond", "plus", "cross". Default "circle".',
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Parameters for geom_dotplot (histodot binning + stacked dots; #803). method=dotdensity and binaxis=y are not in v1.",
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
        "Parameters for geom_density_2d / geom_density_2d_filled (bivariate KDE; #802). contour_var density only.",
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

  ErrorbarParams: Type.Object(
    {
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Cap width as a fraction of the band step. Must be greater than 0 and at most 1. Default 0.9.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Errorbar opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      fun: Type.Optional(
        Type.Union([Type.Literal("mean"), Type.Literal("median"), Type.Literal("sum")], {
          description:
            'STAT SUMMARY ONLY: the center summary of y per x group: "mean" (default), "median", or "sum". With "mean" and no funMin/funMax, the bounds default to mean ± standard error (ggplot2\'s mean_se).',
        }),
      ),
      funMin: Type.Optional(
        Type.Ref("SummaryFun", {
          description:
            "STAT SUMMARY ONLY: summary function for the lower bound (ymin). Overrides the mean_se default.",
        }),
      ),
      funMax: Type.Optional(
        Type.Ref("SummaryFun", {
          description:
            "STAT SUMMARY / SUMMARY_BIN: summary function for the upper bound (ymax). Overrides the mean_se default.",
        }),
      ),
      bins: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "STAT SUMMARY_BIN ONLY (#817): number of bins (integer ≥ 1). Default 30 — advisory. Overridden by binwidth.",
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
    },
    {
      additionalProperties: false,
      description:
        "Parameters for the errorbar geom: styling plus summary / summary_bin functions and summary_bin binning controls (#817).",
    },
  ),

  RectParams: Type.Object(
    {
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Outline stroke width in px when color is set. Must be greater than 0.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Rectangle opacity. Must be between 0 and 1 (inclusive). Default 1.",
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
            "Within-mark gradient outline paint (not a data scale). Requires a solid fallback.",
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
      description: "Styling parameters for the rect geom (arbitrary xmin/xmax/ymin/ymax regions).",
    },
  ),

  TileParams: Type.Object(
    {
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Constant tile width in data units after position transform (band axes: fraction of the band step). Default: resolution of unique x centers (continuous) or 1 (band).",
        }),
      ),
      height: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Constant tile height in data units after position transform (band axes: fraction of the band step). Default: resolution of unique y centers (continuous) or 1 (band).",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Outline stroke width in px when color is set. Must be greater than 0.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Tile opacity. Must be between 0 and 1 (inclusive). Default 1.",
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
            "Within-mark gradient outline paint (not a data scale). Requires a solid fallback.",
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
        "Parameters for the tile geom: center-sized cells (x/y + optional width/height).",
    },
  ),

  RasterParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Raster opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      hjust: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description:
            "Horizontal justification of each cell over its x center (0–1). Default 0.5.",
        }),
      ),
      vjust: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Vertical justification of each cell over its y center (0–1). Default 0.5.",
        }),
      ),
      interpolate: Type.Optional(
        Type.Literal(false, {
          description:
            "Interpolation between cells. Only false (nearest / no interpolation) is supported.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Parameters for the raster geom: equal-cell dense grid (no per-cell stroke).",
    },
  ),

  PositionParams: Type.Object(
    {
      width: Type.Optional(
        Type.Number({
          minimum: 0,
          description:
            "JITTER ONLY: maximum horizontal jitter amount — data units on continuous x, band-step fractions on discrete x. Default 40% of the data resolution.",
        }),
      ),
      height: Type.Optional(
        Type.Number({
          minimum: 0,
          description:
            "JITTER ONLY: maximum vertical jitter amount — data units on continuous y, band-step fractions on discrete y. Default 40% of the data resolution.",
        }),
      ),
      seed: Type.Optional(
        Type.Integer({
          minimum: 0,
          description:
            "JITTER ONLY: RNG seed (a non-negative integer). Default 42. ggsvelte jitter is ALWAYS seeded so renders are reproducible (deliberate divergence from ggplot2's random jitter).",
        }),
      ),
      x: Type.Optional(
        Type.Number({
          description:
            "NUDGE ONLY: horizontal offset — data units on continuous x, band-step fractions on discrete x. Default 0.",
        }),
      ),
      y: Type.Optional(
        Type.Number({
          description:
            "NUDGE ONLY: vertical offset — data units on continuous y, band-step fractions on discrete y. Default 0.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Parameters for the jitter (width, height, seed) and nudge (x, y) position adjustments.",
    },
  ),

  AreaParams: Type.Object(
    {
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
      description: "Styling parameters for the area geom.",
    },
  ),

  RibbonParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Ribbon fill opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Outline stroke width in px when an outline is drawn. Must be greater than 0. Default 1.",
        }),
      ),
      outline: Type.Optional(
        Type.Union(
          [
            Type.Literal("both"),
            Type.Literal("upper"),
            Type.Literal("lower"),
            Type.Literal("full"),
          ],
          {
            description:
              'Which edges receive an outline stroke: "both" (default — upper and lower), "upper", "lower", or "full" (closed outline of the band). Strokes appear when aes.color / a color constant is set, or when strokePaint is set.',
          },
        ),
      ),
      orientation: Type.Optional(
        Type.Union([Type.Literal("x"), Type.Literal("y")], {
          description:
            'Running-coordinate orientation: "x" (map x + ymin + ymax) or "y" (map y + xmin + xmax). When omitted, inferred from the complete channel contract; set explicitly if both contracts are mapped.',
        }),
      ),
      lineend: Type.Optional(
        Type.Union([Type.Literal("butt"), Type.Literal("round"), Type.Literal("square")], {
          description: 'SVG stroke-linecap for outlines. Default "butt".',
        }),
      ),
      linejoin: Type.Optional(
        Type.Union([Type.Literal("miter"), Type.Literal("round"), Type.Literal("bevel")], {
          description: 'SVG stroke-linejoin for outlines. Default "round".',
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
            "Within-mark gradient outline paint (not a data scale). Requires a solid fallback.",
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
      description: "Styling and orientation parameters for the ribbon geom.",
    },
  ),

  RuleIntercept: Type.Union(
    [
      Type.Number(),
      Type.String(),
      Type.Array(Type.Union([Type.Number(), Type.String()]), { minItems: 1 }),
    ],
    {
      description:
        'A fixed intercept (or array of intercepts) in data units. Numbers for linear/log scales; ISO 8601 date strings (e.g. "2026-01-01") for time scales; category strings for band scales.',
    },
  ),

  RuleParams: Type.Object(
    {
      xintercept: Type.Optional(
        Type.Ref("RuleIntercept", {
          description:
            "ANNOTATION FORM ONLY: draw a vertical rule at each of these fixed x positions. Mutually exclusive with mapping aes.x/aes.y on this layer.",
        }),
      ),
      yintercept: Type.Optional(
        Type.Ref("RuleIntercept", {
          description:
            "ANNOTATION FORM ONLY: draw a horizontal rule at each of these fixed y positions. Mutually exclusive with mapping aes.x/aes.y on this layer.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Rule opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
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
        "Styling parameters for the rule geom. The annotation form sets xintercept and/or yintercept here; the data-driven form maps aes.x OR aes.y instead (never both forms at once).",
    },
  ),

  HlineParams: Type.Object(
    {
      yintercept: Type.Optional(
        Type.Ref("RuleIntercept", {
          description:
            "ANNOTATION FORM ONLY: draw a horizontal rule at each of these fixed y positions. Mutually exclusive with mapping aes.y on this layer.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Rule opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
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
        "Parameters for the hline alias (ggplot2 geom_hline). Annotation form sets yintercept; data-driven form maps aes.y. Canonicalized by normalize() to a rule layer.",
    },
  ),

  VlineParams: Type.Object(
    {
      xintercept: Type.Optional(
        Type.Ref("RuleIntercept", {
          description:
            "ANNOTATION FORM ONLY: draw a vertical rule at each of these fixed x positions. Mutually exclusive with mapping aes.x on this layer.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Rule opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
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
        "Parameters for the vline alias (ggplot2 geom_vline). Annotation form sets xintercept; data-driven form maps aes.x. Canonicalized by normalize() to a rule layer.",
    },
  ),

  SegmentParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Segment opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
        }),
      ),
      lineend: Type.Optional(
        Type.Union([Type.Literal("butt"), Type.Literal("round"), Type.Literal("square")], {
          description: 'SVG stroke-linecap for segment ends. Default "butt".',
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
        "Styling parameters for the segment geom (finite line from (x,y) to (xend,yend)).",
    },
  ),

  RugParams: Type.Object(
    {
      sides: Type.Optional(
        Type.String({
          pattern: "^[bltr]+$",
          minLength: 1,
          description:
            'Which panel edges get ticks: any non-empty combination of "b" (bottom), "l" (left), "t" (top), "r" (right). Default "bl". Duplicates are treated as a set. Sides b/t require aes.x; sides l/r require aes.y.',
        }),
      ),
      length: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            'Tick length as a fraction of the panel size along the tick axis (panel-fraction npc analogue of ggplot2 unit(0.03, "npc")). Default 0.03.',
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Tick opacity. Must be between 0 and 1 (inclusive). Default 1.",
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
        "Parameters for geom_rug: panel-edge sides, panel-fraction length, and stroke styling.",
    },
  ),

  SpokeParams: Type.Object(
    {
      angle: Type.Optional(
        Type.Number({
          description:
            "Constant spoke direction in radians when aes.angle is not mapped. 0 = +x, π/2 = +y.",
        }),
      ),
      radius: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Constant spoke length in data units when aes.radius is not mapped. Must be greater than 0.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Spoke opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
        }),
      ),
      lineend: Type.Optional(
        Type.Union([Type.Literal("butt"), Type.Literal("round"), Type.Literal("square")], {
          description: 'SVG stroke-linecap for spoke ends. Default "butt".',
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
        "Parameters for geom spoke: optional constant angle/radius plus segment-like stroke styling.",
    },
  ),

  AblineParams: Type.Object(
    {
      slope: Type.Optional(
        Type.Number({
          description: "Line slope (rise/run). Default 1 (identity line when intercept is 0).",
        }),
      ),
      intercept: Type.Optional(
        Type.Number({
          description: "Y-intercept in data units. Default 0.",
        }),
      ),
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
        "Annotation parameters for geom abline: y = intercept + slope · x, clipped to the panel. Annotation-only in v1 (no data-mapped slope/intercept).",
    },
  ),

  AblineLayer: Type.Object(
    {
      geom: Type.Literal("abline", {
        description:
          "Abline geometry: one infinite reference line y = intercept + slope · x, clipped to the panel (ggplot2 geom_abline). Annotation form: fixed slope/intercept in params; does not inherit plot aes.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Abline layers use fixed params as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Abline layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description: "Optional layer-local data. Abline v1 ignores row data (annotation-only).",
        }),
      ),
      params: Type.Optional(Type.Ref("AblineParams")),
    },
    {
      additionalProperties: false,
      description:
        "A slope/intercept reference-line layer (ggplot2 geom_abline). Annotation-only: set params.slope and params.intercept.",
    },
  ),

  CurveParams: Type.Object(
    {
      curvature: Type.Optional(
        Type.Number({
          description:
            "Amount of bend away from the straight chord. 0 is a straight line; ggplot2 default 0.5. Positive bows to the right of the start→end direction when angle is 90.",
        }),
      ),
      angle: Type.Optional(
        Type.Number({
          description:
            "Control-point direction relative to the chord, in degrees. ggplot2 default 90 (perpendicular).",
        }),
      ),
      ncp: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: 50,
          description:
            "Smoothness density knob (ggplot2 ncp). Maps to tessellation sample count = max(8, ncp×8); not multi-control xspline. Default 5.",
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Curve opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px. Must be greater than 0. Default 1.",
        }),
      ),
      lineend: Type.Optional(
        Type.Union([Type.Literal("butt"), Type.Literal("round"), Type.Literal("square")], {
          description: 'SVG stroke-linecap for curve ends. Default "butt".',
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
        "Parameters for geom curve: curvature/angle/ncp plus segment-like stroke styling.",
    },
  ),

  MapParams: Type.Object(
    {
      map: Type.Ref("DataRef", {
        description:
          "Fortified map coordinates ({ values }, { columns }, or { name } against spec.datasets). Must include long+lat or x+y, plus a region id column.",
      }),
      mapId: Type.Optional(
        Type.String({
          minLength: 1,
          description:
            'Join column name in the map data (matched to aes.map_id). Default: "region", then "id".',
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Region fill opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Region outline stroke width in px. Must be greater than 0. Default 1.5.",
        }),
      ),
      fillPaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description: "Within-mark gradient fill paint (not a data scale).",
        }),
      ),
      strokePaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description: "Within-mark gradient stroke paint (not a data scale).",
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
        "Parameters for geom_map (#808): fortified map DataRef plus optional join column and polygon styling.",
    },
  ),

  SfParams: Type.Object(
    {
      geometry: Type.Optional(
        Type.String({
          minLength: 1,
          description:
            'Name of the data column holding GeoJSON Geometry JSON strings. Default "geometry". Already-projected coordinates only (#809 phase 1).',
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Mark opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Stroke width in px for lines/polygon outlines. Must be greater than 0.",
        }),
      ),
      size: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Point radius in px when geometries are Point/MultiPoint.",
        }),
      ),
      fillPaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description: "Within-mark gradient fill paint (polygon family; not a data scale).",
        }),
      ),
      strokePaint: Type.Optional(
        Type.Ref("GradientPaint", {
          description: "Within-mark gradient stroke paint (not a data scale).",
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
        "Parameters for geom_sf (#809): portable GeoJSON Geometry column plus styling. Interior rings are even-odd holes; GeometryCollection expands. Use coord_sf for fixed-aspect maps (CRS reproject deferred).",
    },
  ),

  TextParams: Type.Object(
    {
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Text opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      size: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Font size in px. Must be greater than 0. Default 11.",
        }),
      ),
      anchor: Type.Optional(
        Type.Union([Type.Literal("start"), Type.Literal("middle"), Type.Literal("end")], {
          description:
            'Horizontal text anchor relative to the (x, y) position: "start", "middle" (default), or "end".',
        }),
      ),
      dx: Type.Optional(
        Type.Number({
          description: "Horizontal offset in px applied after positioning. Default 0.",
        }),
      ),
      dy: Type.Optional(
        Type.Number({
          description:
            "Vertical offset in px applied after positioning (positive = down). Default 0.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Styling parameters for the text geom (no collision detection: labels draw exactly where placed).",
    },
  ),

  // --- rendering backend -------------------------------------------------------

  RenderBackend: Type.Union([Type.Literal("svg"), Type.Literal("canvas"), Type.Literal("auto")], {
    description:
      'Rendering backend for this layer: "svg" (DOM marks — accessible, copyable), "canvas" (fast raster for high mark counts), or "auto" (default — canvas above the mark-count threshold of 2000, with an advisory). Text layers always render as SVG. renderToSVGString ignores this and renders everything as SVG.',
  }),

  // --- positions ------------------------------------------------------------

  StackablePosition: Type.Union(
    [Type.Literal("stack"), Type.Literal("fill"), Type.Literal("dodge"), Type.Literal("identity")],
    {
      description:
        'Position adjustment: "stack" piles grouped values (positive up, negative down), "fill" stacks to proportions of 1, "dodge" places groups side by side, "identity" leaves positions unchanged.',
    },
  ),

  /** Identity-capable layers may also use unique (first-wins aesthetic dedupe). */
  IdentityOrUniqueStat: Type.Union(
    [
      Type.Literal("identity", {
        description: "Draw each data row as-is (no aggregation or row filter).",
      }),
      Type.Literal("unique", {
        description:
          "Drop duplicate rows on the combination of mapped aesthetic fields before drawing; first occurrence wins (ggplot2's stat_unique). Panel-local.",
      }),
    ],
    {
      description:
        'Layer stat: "identity" (default) or "unique" (dedupe mapped aesthetics, first wins).',
    },
  ),

  // --- layers (discriminated by geom) ----------------------------------------

  PointLayer: Type.Object(
    {
      geom: Type.Literal("point", {
        description:
          "Point geometry: one mark per data row. Use for scatter plots, dot plots, bubbles, correlation views. With summary_bin (#817) or manual (#814).",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default).",
            }),
            Type.Literal("unique", {
              description:
                "Drop duplicate rows on mapped aesthetics before drawing; first wins (#813).",
            }),
            Type.Literal("summary_bin", {
              description:
                "Bin continuous x and summarize y per (group × bin); default mean ± se (#817).",
            }),
            Type.Literal("manual", {
              description:
                "Portable named per-group transform (params.fun required: first|last|mean|median|min|max|sum; #814).",
            }),
          ],
          {
            description:
              'Point stat: "identity" (default), "unique", "summary_bin" (#817), or "manual" (#814).',
          },
        ),
      ),
      position: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("jitter"), Type.Literal("nudge")], {
          description:
            'Position adjustment: "identity" (default), "jitter" (seeded random offsets — configure with positionParams.width/height/seed), or "nudge" (fixed offsets — positionParams.x/y).',
        }),
      ),
      positionParams: Type.Optional(Type.Ref("PositionParams")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("PointParams")),
    },
    {
      additionalProperties: false,
      description:
        "A scatter/point layer. Requires x and y channels (inherited from plot aes or set in the layer's aes).",
    },
  ),

  LineLayer: Type.Object(
    {
      geom: Type.Literal("line", {
        description:
          "Line geometry: connects points in x order, one line per group (groups derive from discrete aesthetics such as color, or from aes.group). Use for time series, trends, line charts. With stat bin (freqpoly alias), y is computed from counts/density. With stat connect, successive points expand into named connection vertices (#816).",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default — map aes.y).",
            }),
            Type.Literal("unique", {
              description:
                "Drop duplicate rows on mapped aesthetics before drawing (first wins; #813).",
            }),
            Type.Literal("bin", {
              description:
                'Continuous x binned; the canonical form of geom freqpoly. Do NOT map aes.y to a field; y defaults to {"stat": "count"}.',
            }),
            Type.Literal("align", {
              description:
                "Interpolate each group onto the union of finite x values so continuous-x stack/fill aligns (#815). Outside a group's x range y is 0.",
            }),
            Type.Literal("connect", {
              description:
                "Expand successive points into connection vertices (params.connection: hv|vh|mid|linear; #816). Expands in x order; geometry does not re-sort after connect.",
            }),
            Type.Literal("summary_bin", {
              description:
                "Bin continuous x and summarize y per (group × bin); default mean ± se; connect centers in x order (#817).",
            }),
            Type.Literal("manual", {
              description:
                "Portable named per-group transform (params.fun required: first|last|mean|median|min|max|sum; #814).",
            }),
          ],
          {
            description:
              'Line stat: "identity" (default), "unique", "bin", "align", "connect", "summary_bin" (#817), or "manual" (#814).',
          },
        ),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Line layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("LineParams")),
    },
    {
      additionalProperties: false,
      description:
        "A line layer. Identity: requires x and y. Bin (freqpoly): requires continuous x; y is computed by the bin stat. Rows are sorted by x within each group before connecting.",
    },
  ),

  StepLayer: Type.Object(
    {
      geom: Type.Literal("step", {
        description:
          "Step-line geometry: connect points with hv/vh/mid stairs (ggplot2 geom_step). Same channels as line; ordered by x within groups.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Step layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Step layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("StepParams")),
    },
    {
      additionalProperties: false,
      description:
        "A step-line layer (ggplot2 geom_step). Requires x and y. params.direction is hv (default), vh, or mid.",
    },
  ),

  PathLayer: Type.Object(
    {
      geom: Type.Literal("path", {
        description:
          "Path geometry: connects points in data (row) order within each group — unlike line, which sorts by x. Use for trajectories, loops, connected scatterplots (ggplot2 geom_path), and ellipse rings (stat ellipse). With stat connect, successive points expand into named connection vertices (#816).",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default).",
            }),
            Type.Literal("unique", {
              description:
                "Drop duplicate rows on mapped aesthetics before drawing (first wins; #813).",
            }),
            Type.Literal("connect", {
              description:
                "Expand successive points into connection vertices (params.connection: hv|vh|mid|linear; default hv; #816). ggplot2 stat_connect default geom is path.",
            }),
            Type.Literal("manual", {
              description:
                "Portable named per-group transform (params.fun required: first|last|mean|median|min|max|sum; #814).",
            }),
            Type.Literal("ellipse", {
              description:
                "Bivariate normal confidence ellipse per group (ggplot2 stat_ellipse, type norm). Emits perimeter samples suitable for path; requires quantitative x and y (#812).",
            }),
          ],
          {
            description:
              'Path stat: "identity" (default), "unique", "connect", "manual" (#814), or "ellipse" (#812).',
          },
        ),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Path layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("PathParams")),
    },
    {
      additionalProperties: false,
      description:
        "A path layer. Identity/connect/manual: requires x and y; rows stay in data order. Ellipse: quantitative x and y; one closed ring per group.",
    },
  ),

  ColLayer: Type.Object(
    {
      geom: Type.Literal("col", {
        description:
          "Column geometry: one rectangle per data row, from the y baseline (zero) to the row's y value. Use when the data already contains the bar heights (ggplot2's geom_col).",
      }),
      stat: Type.Optional(Type.Ref("IdentityOrUniqueStat")),
      position: Type.Optional(Type.Ref("StackablePosition")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("ColParams")),
    },
    {
      additionalProperties: false,
      description:
        'A column (pre-computed bar) layer. Requires x (discrete) and y (the bar height) channels. Default position "stack".',
    },
  ),

  BarLayer: Type.Object(
    {
      geom: Type.Literal("bar", {
        description:
          "Bar geometry with counting or binning: one rectangle per distinct x value (stat count, discrete x) or per bin (stat bin, continuous x). Do NOT map aes.y — the stat computes it (ggplot2's geom_bar / geom_histogram).",
      }),
      stat: Type.Optional(
        Type.Union([Type.Literal("count"), Type.Literal("bin")], {
          description:
            'The bar layer\'s stat: "count" (default — rows counted per distinct x value and group) or "bin" (continuous x binned; the canonical form of the histogram geom). Map aes.weight to sum weights instead of counting. y defaults to {"stat": "count"}.',
        }),
      ),
      position: Type.Optional(Type.Ref("StackablePosition")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("BarParams")),
    },
    {
      additionalProperties: false,
      description:
        'A counting/binning bar layer. Requires the x channel; y is computed by the stat. Default position "stack". Use geom "col" when the data already contains the heights.',
    },
  ),

  HistogramLayer: Type.Object(
    {
      geom: Type.Literal("histogram", {
        description:
          "Histogram geometry: a continuous x variable divided into bins, one bar per bin whose height is the count of rows (or the sum of aes.weight). Do NOT map aes.y — the bin stat computes it. Canonicalized by normalize() to a bar layer with stat bin.",
      }),
      stat: Type.Optional(
        Type.Literal("bin", {
          description:
            'Histogram layers bin continuous x values. y defaults to {"stat": "count"}; set y to {"stat": "density"} for a normalized histogram.',
        }),
      ),
      position: Type.Optional(Type.Ref("StackablePosition")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("BarParams")),
    },
    {
      additionalProperties: false,
      description:
        'A histogram layer (alias for bar + stat bin). Requires a continuous x channel; y is computed by the bin stat. Default position "stack". Set params.binwidth or params.bins (default 30, with an advisory).',
    },
  ),

  FreqpolyLayer: Type.Object(
    {
      geom: Type.Literal("freqpoly", {
        description:
          "Frequency polygon (ggplot2 geom_freqpoly): continuous x binned like a histogram, drawn as a line through bin centers. Do NOT map aes.y — the bin stat computes it. Canonicalized by normalize() to a line layer with stat bin.",
      }),
      stat: Type.Optional(
        Type.Literal("bin", {
          description:
            'Freqpoly layers bin continuous x values. y defaults to {"stat": "count"}; set y to {"stat": "density"} for a density polygon.',
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Freqpoly layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("LineParams")),
    },
    {
      additionalProperties: false,
      description:
        'A frequency-polygon layer (alias for line + stat bin). Requires continuous x; y is computed by the bin stat. Default position "identity". Set params.binwidth or params.bins (default 30, with an advisory).',
    },
  ),

  SmoothLayer: Type.Object(
    {
      geom: Type.Literal("smooth", {
        description:
          "Smooth geometry: a fitted trend line (with an optional confidence ribbon) over an x/y scatter, one fit per group. Use to reveal trends (ggplot2's geom_smooth).",
      }),
      stat: Type.Optional(
        Type.Literal("smooth", {
          description:
            "Smooth layers fit lm or loess per group and evaluate the fit at params.n points.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Smooth layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("SmoothParams")),
    },
    {
      additionalProperties: false,
      description:
        "A fitted-trend layer. Requires quantitative x and y channels. Usually layered over a point layer of the same data.",
    },
  ),

  QuantileLayer: Type.Object(
    {
      geom: Type.Literal("quantile", {
        description:
          "Quantile geometry: linear quantile regression lines (y ~ x) at one or more conditional quantiles of y, one line per quantile per group (ggplot2 geom_quantile / #805).",
      }),
      stat: Type.Optional(
        Type.Literal("quantile", {
          description:
            "Quantile layers fit linear RQ per group × τ and evaluate on a grid of params.n points.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Quantile layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("QuantileParams")),
    },
    {
      additionalProperties: false,
      description:
        "A quantile-regression layer. Requires quantitative x and y. Default quantiles [0.25, 0.5, 0.75]. v1 is linear y~x only (no rqss).",
    },
  ),

  ContourLayer: Type.Object(
    {
      geom: Type.Literal("contour", {
        description:
          "Contour geometry: isolines of a continuous z surface over a regular x×y grid (ggplot2 geom_contour; #801). v1 draws open path polylines only (not filled bands).",
      }),
      stat: Type.Optional(
        Type.Literal("contour", {
          description:
            "Contour layers run clean-room marching-squares isolines per group over a complete rectangular grid.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Contour layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("ContourParams")),
    },
    {
      additionalProperties: false,
      description:
        "A contour isoline layer. Requires continuous x, y, and z on a regular complete grid. Levels from params.breaks, binwidth, or bins (default 10).",
    },
  ),

  BoxplotLayer: Type.Object(
    {
      geom: Type.Literal("boxplot", {
        description:
          "Box-and-whisker geometry: one box per x category (per group) summarizing the y distribution — hinges at the quartiles, whiskers to the furthest points within coef × IQR, outliers drawn individually.",
      }),
      stat: Type.Optional(
        Type.Literal("boxplot", {
          description:
            "Boxplot layers compute five-number summaries (type-7 quantiles, the R default) per group.",
        }),
      ),
      position: Type.Optional(
        Type.Union([Type.Literal("dodge"), Type.Literal("identity")], {
          description:
            'Position adjustment: "dodge" (default — grouped boxes sit side by side within each x band) or "identity".',
        }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("BoxplotParams")),
    },
    {
      additionalProperties: false,
      description: "A boxplot layer. Requires a discrete x channel and a quantitative y channel.",
    },
  ),

  DotplotLayer: Type.Object(
    {
      geom: Type.Literal("dotplot", {
        description:
          "Dotplot geometry: stacked dots along a continuous x axis (ggplot2 geom_dotplot, histodot subset). Do NOT map aes.y — the bindot stat computes stack positions.",
      }),
      stat: Type.Optional(
        Type.Literal("bindot", {
          description:
            'Histodot bindot: fixed bins, one mark per observation stacked within (group × bin). y defaults to {"stat": "stackpos"}.',
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Dotplot layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("DotplotParams")),
    },
    {
      additionalProperties: false,
      description:
        "A stacked-dot layer. Requires continuous x; y is stackpos from bindot. Map fill/color for groups. v1: method histodot only.",
    },
  ),

  DensityLayer: Type.Object(
    {
      geom: Type.Literal("density", {
        description:
          "Density geometry: a smooth kernel density estimate of a continuous x variable, drawn as a filled area — a smoothed histogram alternative. One curve per group. Do NOT map aes.y — the density stat computes it.",
      }),
      stat: Type.Optional(
        Type.Literal("density", {
          description:
            'Density layers run a gaussian KDE per group (bandwidth: R\'s bw.nrd0 unless params.bw is set). y defaults to {"stat": "density"}; set y to {"stat": "count"} for count scaling.',
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Density layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("DensityParams")),
    },
    {
      additionalProperties: false,
      description:
        "A kernel-density layer. Requires a continuous x channel; y is computed by the density stat. Map fill (with alpha) for overlaid group comparisons.",
    },
  ),

  Density2dLayer: Type.Object(
    {
      geom: Type.Literal("density_2d", {
        description:
          "2D density geometry: bivariate KDE isolines over continuous x and y (ggplot2 geom_density_2d; #802). Open path contours.",
      }),
      stat: Type.Optional(
        Type.Literal("density_2d", {
          description:
            "density_2d layers estimate a product-Gaussian KDE per group on an n×n grid and extract isolines.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "density_2d layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("Density2dParams")),
    },
    {
      additionalProperties: false,
      description:
        "A 2D density contour layer. Requires continuous x and y. Contours of estimated density (not a precomputed z grid).",
    },
  ),

  Density2dFilledLayer: Type.Object(
    {
      geom: Type.Literal("density_2d_filled", {
        description:
          "2D density filled bands: bivariate KDE closed isoline rings filled by density level (ggplot2 geom_density_2d_filled; #802 phase 2). Open rings dropped. Defaults fill to after_stat(level).",
      }),
      stat: Type.Optional(
        Type.Literal("density_2d_filled", {
          description:
            "Same KDE + isolines as density_2d, keeping closed rings only for filled paths.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", {
          description: "density_2d_filled layers use identity positioning.",
        }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("Density2dParams")),
    },
    {
      additionalProperties: false,
      description:
        "A filled 2D density layer. Requires continuous x and y. Fill defaults to after_stat(level).",
    },
  ),

  ErrorbarLayer: Type.Object(
    {
      geom: Type.Literal("errorbar", {
        description:
          "Errorbar geometry: a vertical range with caps at ymin and ymax, one per data row (identity stat) or per x group (summary stat).",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Map aes.ymin and aes.ymax to data fields (default).",
            }),
            Type.Literal("unique", {
              description: "Drop duplicate rows on mapped aesthetics before drawing; first wins.",
            }),
            Type.Literal("summary", {
              description:
                "Compute y/ymin/ymax per x group from aes.y; default mean ± standard error (ggplot2 mean_se).",
            }),
            Type.Literal("summary_bin", {
              description:
                "Bin continuous x and summarize y per (group × bin); default mean ± se (#817).",
            }),
          ],
          {
            description:
              'The errorbar\'s stat: "identity" (default), "unique", "summary" (per x group), or "summary_bin" (per bin; #817).',
          },
        ),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Errorbar layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("ErrorbarParams")),
    },
    {
      additionalProperties: false,
      description:
        "An errorbar layer. Identity: requires x, ymin, ymax. Summary / summary_bin: requires x and y (bounds from params.fun/funMin/funMax, default mean_se).",
    },
  ),

  RectLayer: Type.Object(
    {
      geom: Type.Literal("rect", {
        description:
          "Rectangle geometry: one rectangle per data row from mapped xmin/xmax/ymin/ymax edges. Use for arbitrary shaded regions and time bands.",
      }),
      stat: Type.Optional(Type.Ref("IdentityOrUniqueStat")),
      position: Type.Optional(
        Type.Literal("identity", { description: "Rect layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("RectParams")),
    },
    {
      additionalProperties: false,
      description:
        "A rectangle layer. Requires xmin, xmax, ymin, and ymax channels (quantitative edges).",
    },
  ),

  TileLayer: Type.Object(
    {
      geom: Type.Literal("tile", {
        description:
          "Tile geometry: center-sized cells at (x, y) with optional width/height. Use for heatmaps and gridded categorical cells; supports stroke outlines.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Tile layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Tile layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("TileParams")),
    },
    {
      additionalProperties: false,
      description:
        "A tile layer. Requires x and y channels; optional width/height (params or aes) size each cell after position transform.",
    },
  ),

  RasterLayer: Type.Object(
    {
      geom: Type.Literal("raster", {
        description:
          "Raster geometry: equal-cell grid at (x, y) with fill; optimized dense heatmaps without per-cell strokes. Irregular spacing warns and suggests geom tile.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Raster layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Raster layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("RasterParams")),
    },
    {
      additionalProperties: false,
      description:
        "A raster layer. Requires x and y (regular spacing); fill maps cell color. No stroke. interpolate must be false when set.",
    },
  ),

  AreaLayer: Type.Object(
    {
      geom: Type.Literal("area", {
        description:
          "Area geometry: a filled region from the y baseline (zero) to the y value, connected in x order per group. Use for stacked composition-over-time charts. With stat align, series with different x samples share a common grid for stack/fill.",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default).",
            }),
            Type.Literal("unique", {
              description: "Drop duplicate rows on mapped aesthetics before drawing (first wins).",
            }),
            Type.Literal("align", {
              description:
                "Interpolate each group onto the union of finite x values so continuous-x stack/fill aligns (#815). Outside a group's x range y is 0.",
            }),
          ],
          {
            description:
              'Area stat: "identity" (default), "unique" (first-wins dedupe), or "align" (shared x grid for stacking).',
          },
        ),
      ),
      position: Type.Optional(Type.Ref("StackablePosition")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("AreaParams")),
    },
    {
      additionalProperties: false,
      description:
        'An area layer. Requires x and y channels; rows are sorted by x within each group. Default position "stack". Use stat "align" when groups have different continuous x samples.',
    },
  ),

  RibbonLayer: Type.Object(
    {
      geom: Type.Literal("ribbon", {
        description:
          "Ribbon geometry: a filled interval between two varying boundaries along a running coordinate (ggplot2's geom_ribbon). Map x+ymin+ymax (x orientation) or y+xmin+xmax (y orientation). Not a zero-baseline area.",
      }),
      stat: Type.Optional(Type.Ref("IdentityOrUniqueStat")),
      position: Type.Optional(
        Type.Literal("identity", { description: "Ribbon layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("RibbonParams")),
    },
    {
      additionalProperties: false,
      description:
        "A ribbon layer. Requires a running coordinate and both interval bounds (x+ymin+ymax or y+xmin+xmax). Rows are sorted along the running coordinate within each group.",
    },
  ),

  RuleLayer: Type.Object(
    {
      geom: Type.Literal("rule", {
        description:
          "Rule geometry: reference lines spanning the panel. TWO HONEST FORMS: (1) annotation — set params.xintercept and/or params.yintercept to fixed data values and map neither aes.x nor aes.y; (2) data-driven — map exactly ONE of aes.x (vertical rules) or aes.y (horizontal rules) to a field. Never mix the forms in one layer.",
      }),
      stat: Type.Optional(Type.Ref("IdentityOrUniqueStat")),
      position: Type.Optional(
        Type.Literal("identity", { description: "Rule layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("RuleParams")),
    },
    {
      additionalProperties: false,
      description:
        "A reference-line layer (ggplot2's geom_vline/geom_hline, unified). Annotation form: fixed intercepts in params. Data-driven form: map aes.x OR aes.y.",
    },
  ),

  HlineLayer: Type.Object(
    {
      geom: Type.Literal("hline", {
        description:
          "Horizontal reference-line alias (ggplot2's geom_hline). Canonicalized by normalize() to a rule layer. Annotation form: set params.yintercept. Data-driven form: map aes.y (inherited plot x is dropped so the one-axis rule contract holds).",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Hline layers draw the given positions as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Hline layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("HlineParams")),
    },
    {
      additionalProperties: false,
      description:
        "A horizontal reference-line layer alias (normalize() → rule). Annotation: params.yintercept. Data-driven: map aes.y.",
    },
  ),

  VlineLayer: Type.Object(
    {
      geom: Type.Literal("vline", {
        description:
          "Vertical reference-line alias (ggplot2's geom_vline). Canonicalized by normalize() to a rule layer. Annotation form: set params.xintercept. Data-driven form: map aes.x (inherited plot y is dropped so the one-axis rule contract holds).",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Vline layers draw the given positions as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Vline layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("VlineParams")),
    },
    {
      additionalProperties: false,
      description:
        "A vertical reference-line layer alias (normalize() → rule). Annotation: params.xintercept. Data-driven: map aes.x.",
    },
  ),

  JitterLayer: Type.Object(
    {
      geom: Type.Literal("jitter", {
        description:
          "Jittered point alias (ggplot2's geom_jitter). Canonicalized by normalize() to a point layer with position jitter. Configure jitter amount via positionParams.width/height/seed.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Jitter layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("jitter", {
          description: 'Jitter layers always use position "jitter" (the alias purpose).',
        }),
      ),
      positionParams: Type.Optional(Type.Ref("PositionParams")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("PointParams")),
    },
    {
      additionalProperties: false,
      description:
        'A scatter layer with position "jitter" (alias; normalize() → point). Requires x and y channels. Jitter width/height/seed live on positionParams.',
    },
  ),

  TextLayer: Type.Object(
    {
      geom: Type.Literal("text", {
        description:
          "Text geometry: one label per data row at (x, y). No collision detection — labels draw exactly where placed. Requires x, y, and label channels.",
      }),
      stat: Type.Optional(Type.Ref("IdentityOrUniqueStat")),
      position: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("nudge")], {
          description:
            'Position adjustment: "identity" (default) or "nudge" (fixed offsets from the anchor — set positionParams.x/y; useful for labels beside marks).',
        }),
      ),
      positionParams: Type.Optional(Type.Ref("PositionParams")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("TextParams")),
    },
    {
      additionalProperties: false,
      description: "A text-label layer. Requires x, y, and label channels.",
    },
  ),

  SegmentLayer: Type.Object(
    {
      geom: Type.Literal("segment", {
        description:
          "Segment geometry: one finite line per data row from (x, y) to (xend, yend). Unlike rule, endpoints are data-mapped and do not span the panel.",
      }),
      stat: Type.Optional(Type.Ref("IdentityOrUniqueStat")),
      position: Type.Optional(
        Type.Literal("identity", { description: "Segment layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("SegmentParams")),
    },
    {
      additionalProperties: false,
      description:
        "A finite segment layer (ggplot2's geom_segment). Requires x, y, xend, and yend channels.",
    },
  ),

  CurveLayer: Type.Object(
    {
      geom: Type.Literal("curve", {
        description:
          "Curve geometry (ggplot2 geom_curve): one curved connector per row from (x, y) to (xend, yend). Tessellated as a quadratic Bezier (curvature/angle/ncp). Requires field-mapped x, y, xend, and yend.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Curve layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Curve layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("CurveParams")),
    },
    {
      additionalProperties: false,
      description:
        "A curved-segment layer. Requires x, y, xend, and yend field channels (like geom segment).",
    },
  ),

  MapLayer: Type.Object(
    {
      geom: Type.Literal("map", {
        description:
          "Map geometry (ggplot2 geom_map): join fortified region borders to value rows via aes.map_id and params.map. Renders closed filled paths per region (#808).",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Map layers expand joins then draw as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Map layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local value data (region ids + fill aesthetics). When omitted, inherits plot data.",
        }),
      ),
      params: Type.Ref("MapParams"),
    },
    {
      additionalProperties: false,
      description:
        "A choropleth/map layer. Requires aes.map_id and params.map. Coordinates come from the map data (long/lat or x/y).",
    },
  ),

  SfLayer: Type.Object(
    {
      geom: Type.Literal("sf", {
        description:
          "Simple-features geometry (ggplot2 geom_sf; #809): already-projected GeoJSON Geometry JSON strings in a data column. Point/line/polygon families (incl. GeometryCollection of one family) with even-odd holes; use coord_sf for fixed-aspect (CRS reproject deferred).",
      }),
      stat: Type.Optional(
        Type.Literal("sf", {
          description:
            "Geometry expand (ggplot2 stat_sf; #809): portable GeoJSON → drawable point/line/polygon parts.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "SF layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("SfParams")),
    },
    {
      additionalProperties: false,
      description:
        'An sf geometry layer. Requires a geometry column of GeoJSON Geometry JSON strings (params.geometry, default "geometry"). Coordinates must already be projected. Default stat is "sf".',
    },
  ),

  SfTextParams: Type.Object(
    {
      geometry: Type.Optional(
        Type.String({
          minLength: 1,
          description:
            'Name of the data column holding GeoJSON Geometry JSON strings. Default "geometry".',
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Text opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      size: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Font size in px. Must be greater than 0. Default 11.",
        }),
      ),
      anchor: Type.Optional(
        Type.Union([Type.Literal("start"), Type.Literal("middle"), Type.Literal("end")], {
          description:
            'Horizontal text anchor relative to the representative point: "start", "middle" (default), or "end".',
        }),
      ),
      dx: Type.Optional(
        Type.Number({
          description: "Horizontal offset in px applied after positioning. Default 0.",
        }),
      ),
      dy: Type.Optional(
        Type.Number({
          description:
            "Vertical offset in px applied after positioning (positive = down). Default 0.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Parameters for geom_sf_text (#809 phase 2): geometry column plus text styling.",
    },
  ),

  SfTextLayer: Type.Object(
    {
      geom: Type.Literal("sf_text", {
        description:
          "Simple-features text labels (ggplot2 geom_sf_text; #809): places aes.label at representative geometry points (Multi* → one label per part; stat_sf_coordinates).",
      }),
      stat: Type.Optional(
        Type.Literal("sf_coordinates", {
          description:
            "Extract (x,y) representative points from geometry (Multi* → one point per part).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "SF text layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("SfTextParams")),
    },
    {
      additionalProperties: false,
      description:
        'An sf text layer. Requires aes.label and a geometry column (params.geometry, default "geometry"). Does not require aes.x/y.',
    },
  ),

  SfLabelParams: Type.Object(
    {
      geometry: Type.Optional(
        Type.String({
          minLength: 1,
          description:
            'Name of the data column holding GeoJSON Geometry JSON strings. Default "geometry".',
        }),
      ),
      alpha: Type.Optional(
        Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Label opacity. Must be between 0 and 1 (inclusive). Default 1.",
        }),
      ),
      size: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Font size in px. Must be greater than 0. Default 11.",
        }),
      ),
      anchor: Type.Optional(
        Type.Union([Type.Literal("start"), Type.Literal("middle"), Type.Literal("end")], {
          description:
            'Horizontal text anchor relative to the representative point: "start", "middle" (default), or "end".',
        }),
      ),
      dx: Type.Optional(
        Type.Number({
          description: "Horizontal offset in px applied after positioning. Default 0.",
        }),
      ),
      dy: Type.Optional(
        Type.Number({
          description:
            "Vertical offset in px applied after positioning (positive = down). Default 0.",
        }),
      ),
      padding: Type.Optional(
        Type.Number({
          minimum: 0,
          description: "Box padding around the text in px. Default 3.",
        }),
      ),
      radius: Type.Optional(
        Type.Number({
          minimum: 0,
          description: "Box corner radius in px. Default 3.",
        }),
      ),
      linewidth: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Box stroke width in px. Default 0.5.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Parameters for geom_sf_label (#809 phase 3): geometry column, text styling, and label box chrome.",
    },
  ),

  SfLabelLayer: Type.Object(
    {
      geom: Type.Literal("sf_label", {
        description:
          "Simple-features labels with background boxes (ggplot2 geom_sf_label; #809): places aes.label at representative geometry points with a measured rounded rect (Multi* → one label per part). color=ink+box stroke; fill=box background.",
      }),
      stat: Type.Optional(
        Type.Literal("sf_coordinates", {
          description:
            "Extract (x,y) representative points from geometry (Multi* → one point per part).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "SF label layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("SfLabelParams")),
    },
    {
      additionalProperties: false,
      description:
        "An sf label layer with a background box. Requires aes.label and a geometry column. Does not require aes.x/y.",
    },
  ),

  BlankParams: Type.Object(
    {},
    {
      additionalProperties: false,
      description:
        "Blank layers have no paint/stat params; the object exists only so LayerSpec has a uniform optional params field.",
    },
  ),

  BlankLayer: Type.Object(
    {
      geom: Type.Literal("blank", {
        description:
          "Blank geometry (ggplot2's geom_blank): contributes mapped aesthetics to scale training and layout without drawing marks or hit targets. No channels are required; whatever is mapped trains its scale.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", {
          description: "Blank layers pass data through for scale training only.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Blank layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("BlankParams")),
    },
    {
      additionalProperties: false,
      description:
        "An empty layer that trains scales from mapped aesthetics without emitting geometry (ggplot2's geom_blank).",
    },
  ),

  RugLayer: Type.Object(
    {
      geom: Type.Literal("rug", {
        description:
          "Rug geometry: short ticks along panel edges for each observation (ggplot2 geom_rug). Map aes.x for bottom/top sides and/or aes.y for left/right sides.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Rug layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Rug layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("RugParams")),
    },
    {
      additionalProperties: false,
      description:
        'A marginal rug layer. Default sides "bl" require both x and y; restrict sides when only one channel is mapped.',
    },
  ),

  SpokeLayer: Type.Object(
    {
      geom: Type.Literal("spoke", {
        description:
          "Spoke geometry (ggplot2 geom_spoke): one finite segment per row from (x, y) in direction angle (radians) with length radius. Endpoints are derived as xend = x + radius·cos(angle), yend = y + radius·sin(angle) in data space, then transformed like x/y. Requires continuous x and y.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Spoke layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Spoke layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("SpokeParams")),
    },
    {
      additionalProperties: false,
      description:
        "A spoke layer. Requires x and y; angle and radius from aes and/or params (constants). Angle is radians.",
    },
  ),

  LayerSpec: Type.Union(
    [
      Type.Ref("PointLayer"),
      Type.Ref("LineLayer"),
      Type.Ref("PathLayer"),
      Type.Ref("StepLayer"),
      Type.Ref("ColLayer"),
      Type.Ref("BarLayer"),
      Type.Ref("HistogramLayer"),
      Type.Ref("FreqpolyLayer"),
      Type.Ref("AreaLayer"),
      Type.Ref("RibbonLayer"),
      Type.Ref("RuleLayer"),
      Type.Ref("HlineLayer"),
      Type.Ref("VlineLayer"),
      Type.Ref("JitterLayer"),
      Type.Ref("TextLayer"),
      Type.Ref("SmoothLayer"),
      Type.Ref("QuantileLayer"),
      Type.Ref("ContourLayer"),
      Type.Ref("BoxplotLayer"),
      Type.Ref("DensityLayer"),
      Type.Ref("Density2dLayer"),
      Type.Ref("Density2dFilledLayer"),
      Type.Ref("DotplotLayer"),
      Type.Ref("ErrorbarLayer"),
      Type.Ref("MapLayer"),
      Type.Ref("RectLayer"),
      Type.Ref("TileLayer"),
      Type.Ref("RasterLayer"),
      Type.Ref("SegmentLayer"),
      Type.Ref("AblineLayer"),
      Type.Ref("CurveLayer"),
      Type.Ref("SfLayer"),
      Type.Ref("SfTextLayer"),
      Type.Ref("SfLabelLayer"),
      Type.Ref("BlankLayer"),
      Type.Ref("SpokeLayer"),
      Type.Ref("RugLayer"),
    ],
    {
      description:
        "One plot layer. The `geom` field selects the geometry and determines which stat, position, and params are allowed.",
    },
  ),

  // --- scales -----------------------------------------------------------------

  DomainValue: Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()], {
    description:
      "One domain entry: a number (linear/log), an ISO 8601 date string (time), or a category value (band/ordinal).",
  }),

  TemporalParserSpec: TemporalParserSpecSchema,

  ScaleExpansion: Type.Object(
    {
      mult: Type.Optional(
        Type.Union(
          [
            Type.Number({ minimum: 0 }),
            Type.Array(Type.Number({ minimum: 0 }), { minItems: 2, maxItems: 2 }),
          ],
          {
            description:
              "Multiplicative display padding as a fraction of the (transformed) domain span. A scalar pads both ends; a [lower, upper] tuple pads each end. Non-negative and finite.",
          },
        ),
      ),
      add: Type.Optional(
        Type.Union(
          [
            Type.Number({ minimum: 0 }),
            Type.Array(Type.Number({ minimum: 0 }), { minItems: 2, maxItems: 2 }),
          ],
          {
            description:
              "Additive display padding in (transformed) scale units. A scalar pads both ends; a [lower, upper] tuple pads each end. Non-negative and finite.",
          },
        ),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Display-domain expansion. Padding is applied after nice in transformed space and never widens the OOB limits. `{ mult: 0, add: 0 }` disables padding.",
    },
  ),

  PositionScaleSpec: Type.Intersect([
    Type.Object(
      {
        type: Type.Optional(
          Type.Union(
            [
              Type.Literal("linear"),
              Type.Literal("log"),
              Type.Literal("time"),
              Type.Literal("band"),
              Type.Literal("binned"),
            ],
            {
              description:
                'Scale type: "linear" (default for numbers), "time" (temporal fields; ISO strings or Date values), "band" (discrete categories), "binned" (quantitative values assigned to ordered bins). "log" is an accepted authored alias that canonicalizes to { type: "linear", transform: "log10" }. Omit to infer from the field type.',
            },
          ),
        ),
        transform: Type.Optional(
          Type.Union([Type.Literal("identity"), Type.Literal("log10"), Type.Literal("sqrt")], {
            description:
              'Pre-stat position transform applied after parsing and before grouping-sensitive stats/positions. "identity" (default), "log10" (base-10; source values must be > 0), "sqrt" (source values must be >= 0). Only "identity" is permitted on time scales.',
          }),
        ),
        temporalKind: Type.Optional(
          Type.Union([Type.Literal("date"), Type.Literal("datetime"), Type.Literal("time")], {
            description:
              'Temporal precision intent. "date" uses calendar dates; "datetime" uses instants; "time" is time-of-day (portable numbers are seconds since midnight). Supplying this option requests a time scale.',
          }),
        ),
        parse: Type.Optional(
          Type.Ref("TemporalParserSpec", {
            description:
              "Explicit deterministic parser for temporal source values. Omit for value-driven inference.",
          }),
        ),
        parseFailure: Type.Optional(
          Type.Union([Type.Literal("error"), Type.Literal("censor")], {
            description:
              'Explicit parser failure policy: "error" (default) stops with bounded evidence; "censor" converts invalid values to missing and emits a warning.',
          }),
        ),
        timezone: Type.Optional(
          Type.String({
            minLength: 1,
            maxLength: 128,
            description:
              'IANA timezone used for timezone-less temporal input. Default "UTC". Invalid zones fail with an actionable diagnostic.',
          }),
        ),
        disambiguation: Type.Optional(
          Type.Union(
            [
              Type.Literal("compatible"),
              Type.Literal("earlier"),
              Type.Literal("later"),
              Type.Literal("reject"),
            ],
            {
              description:
                'DST gap/fold policy for IANA local times. Default "reject"; choose "earlier", "later", or Temporal-compatible behavior explicitly.',
            },
          ),
        ),
        dateBreaks: Type.Optional(TemporalIntervalSpecSchema),
        dateMinorBreaks: Type.Optional(TemporalIntervalSpecSchema),
        dateLabels: Type.Optional(TemporalLabelSpecSchema),
        locale: Type.Optional(
          Type.String({
            minLength: 1,
            maxLength: 128,
            description:
              'BCP 47 locale for temporal labels. Default "en-US". JSON Schema bounds the portable string shape; runtime validation canonicalizes the tag and verifies Intl support before rendering.',
          }),
        ),
        weekStart: Type.Optional(TemporalWeekStartSchema),
        domain: Type.Optional(
          Type.Array(Type.Ref("DomainValue"), {
            minItems: 1,
            description:
              "Explicit domain, PINNING the scale: [min, max] for continuous scales (numbers, or temporal strings for time); the full category list for band scales. Data outside the domain is dropped with a warning.",
          }),
        ),
        nice: Type.Optional(
          Type.Boolean({
            description:
              "Round the inferred domain to tick-friendly bounds. Default true. Ignored when `domain` is set.",
          }),
        ),
        zero: Type.Optional(
          Type.Boolean({
            description:
              "Force the domain to include zero. Bars, columns, and areas force this to true on the measure axis; set false explicitly to override. Ignored when `domain` is set.",
          }),
        ),
        reverse: Type.Optional(
          Type.Boolean({ description: "Reverse the scale's output direction. Default false." }),
        ),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), {
            minItems: 1,
            description:
              "Explicit tick positions in data units (numbers, or ISO date strings for time scales); for binned scales these are the bin boundaries. Omit for automatic ticks. Binned scales allow at most 65 boundaries (64 bins); non-binned explicit ticks are not capped.",
          }),
        ),
        labels: Type.Optional(
          Type.String({
            description:
              'Tick label format string. Time scales: strftime-style ("%Y-%m", "%b %d", "%H:%M"). Numeric scales: ",d" (grouped integer), ".1f" (fixed decimals), ".0%" (percent), "~s" (SI prefix). Omit for automatic formatting.',
          }),
        ),
        expand: Type.Optional(
          Type.Ref("ScaleExpansion", {
            description:
              "Display-domain padding. Non-temporal continuous/binned axes default to { mult: 0.05, add: 0 }; time axes default to zero. Pinned domains still receive display expansion.",
          }),
        ),
        oob: Type.Optional(
          Type.Union([Type.Literal("censor"), Type.Literal("squish")], {
            description:
              'Out-of-bounds policy for values outside explicit source limits, applied before stats. "censor" (default) drops them to missing; "squish" clamps them to the nearest source limit before transform.',
          }),
        ),
        naValue: Type.Optional(
          Type.Union([Type.Number(), Type.Null()], {
            description:
              "Replacement for missing/censored positional values, resolved after OOB and before transform. A finite number substitutes; null (default) keeps them missing. The replacement is itself checked against the transform/domain rules.",
          }),
        ),
        minorBreaks: Type.Optional(
          Type.Array(Type.Number(), {
            minItems: 1,
            description:
              "Explicit minor gridline positions in semantic source units. Coincident major/minor values render only the major tick. Time scales use dateMinorBreaks instead.",
          }),
        ),
        guide: Type.Optional(Type.Union([Type.Ref("GuideSpec"), Type.Ref("BandAxisGuideSpec")])),
      },
      {
        additionalProperties: false,
        description: "Configuration for a positional (x or y) scale.",
      },
    ),
    Type.Union([
      Type.Object({
        type: Type.Literal("binned"),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), {
            maxItems: MAX_BINNED_BREAKS + 1,
          }),
        ),
      }),
      Type.Object({
        type: Type.Optional(
          Type.Union([
            Type.Literal("linear"),
            Type.Literal("log"),
            Type.Literal("time"),
            Type.Literal("band"),
          ]),
        ),
      }),
    ]),
  ]),

  ColorScaleSpec: Type.Intersect([
    Type.Object(
      {
        type: Type.Optional(
          Type.Union(
            [
              Type.Literal("ordinal"),
              Type.Literal("sequential"),
              Type.Literal("binned"),
              Type.Literal("manual"),
              Type.Literal("identity"),
            ],
            {
              description:
                'Color scale family: "ordinal" for categories, "sequential" for a continuous ramp, "binned" for color steps, "manual" for an explicit domain/range mapping, or "identity" for validated source colors.',
            },
          ),
        ),
        transform: Type.Optional(
          Type.Union([Type.Literal("identity"), Type.Literal("log10"), Type.Literal("sqrt")], {
            description:
              "Pre-training quantitative transform for sequential/binned color values. log10/sqrt require non-temporal values; ordinal, manual, and identity families do not accept a transform.",
          }),
        ),
        temporalKind: Type.Optional(
          Type.Union([Type.Literal("date"), Type.Literal("datetime")], {
            description:
              'Temporal precision intent for sequential/binned colors. "date" uses calendar labels; "datetime" uses instant labels.',
          }),
        ),
        parse: Type.Optional(
          Type.Ref("TemporalParserSpec", {
            description:
              "Explicit deterministic parser for temporal color/fill source values. Omit for value-driven inference.",
          }),
        ),
        parseFailure: Type.Optional(
          Type.Union([Type.Literal("error"), Type.Literal("censor")], {
            description:
              'Explicit temporal parser failure policy: "error" (default) or "censor" with a bounded warning.',
          }),
        ),
        timezone: Type.Optional(
          Type.String({
            minLength: 1,
            maxLength: 128,
            description: 'IANA timezone for temporal color/fill input. Default "UTC".',
          }),
        ),
        disambiguation: Type.Optional(
          Type.Union([
            Type.Literal("compatible"),
            Type.Literal("earlier"),
            Type.Literal("later"),
            Type.Literal("reject"),
          ]),
        ),
        domain: Type.Optional(
          Type.Array(Type.Ref("DomainValue"), {
            minItems: 1,
            description:
              "Explicit semantic domain. Manual/ordinal scales use ordered values; sequential/binned scales use [min, max].",
          }),
        ),
        domainMode: Type.Optional(
          Type.Union([Type.Literal("grow"), Type.Literal("data")], {
            description:
              'Ordinal domain stability: "grow" (default) preserves assignments across filters; "data" rebuilds from current data.',
          }),
        ),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), {
            minItems: 2,
            description:
              "Explicit semantic reference ticks for sequential colorbars or ordered boundaries for binned colorsteps.",
          }),
        ),
        range: Type.Optional(
          Type.Array(Type.String({ pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" }), {
            minItems: 1,
            description:
              "Explicit #rgb/#rrggbb colors. Manual pairs them with domain values; sequential/binned interpolate or sample them.",
          }),
        ),
        scheme: Type.Optional(
          Type.Union(COLOR_SCHEME_NAME_SCHEMAS, {
            description:
              'Named color scheme: categorical "observable10" (default), "ipsum", "flexoki", "tableau10", "colorblind", "hue", "grey", and "gray"; or sequential family "viridis" (default), "magma", "plasma", "inferno", "cividis", "turbo". Sequential-family names may also be used with ordinal scales (discrete sampling). When type is omitted, the named scheme selects its ordinal or sequential scale family.',
          }),
        ),
        reverse: Type.Optional(
          Type.Boolean({ description: "Reverse the output color range. Default false." }),
        ),
        oob: Type.Optional(
          Type.Union([Type.Literal("censor"), Type.Literal("squish")], {
            description:
              'Out-of-bounds policy for an explicit continuous/binned domain: "censor" (default) or "squish".',
          }),
        ),
        naValue: Type.Optional(
          Type.String({
            pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
            description: "Color for null/missing values. Default #999999.",
          }),
        ),
        unknownValue: Type.Optional(
          Type.String({
            pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
            description: "Color for invalid, out-of-domain, or unmapped values. Default #999999.",
          }),
        ),
        onExhaust: Type.Optional(
          Type.Union([Type.Literal("cycle"), Type.Literal("error")], {
            description:
              'Ordinal palette exhaustion policy: "cycle" (default) with a warning, or "error".',
          }),
        ),
        labels: Type.Optional(
          Type.String({
            description:
              'Guide label format: numeric (".1f", ",d", ".0%") or temporal strftime-style text.',
          }),
        ),
        guide: Type.Optional(Type.Ref("GuideSpec")),
      },
      {
        additionalProperties: false,
        description: "Configuration for a color or fill scale.",
      },
    ),
    Type.Union([
      Type.Object({
        type: Type.Literal("binned"),
        breaks: Type.Optional(
          Type.Array(Type.Union([Type.Number(), Type.String()]), {
            minItems: 2,
            maxItems: MAX_BINNED_BREAKS + 1,
          }),
        ),
        domainMode: forbiddenColorOption(),
        onExhaust: forbiddenColorOption(),
      }),
      Type.Object({
        type: Type.Literal("manual"),
        range: Type.Array(Type.String({ pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" }), {
          minItems: 1,
        }),
        transform: forbiddenColorOption(),
        temporalKind: forbiddenColorOption(),
        parse: forbiddenColorOption(),
        parseFailure: forbiddenColorOption(),
        timezone: forbiddenColorOption(),
        disambiguation: forbiddenColorOption(),
        domainMode: forbiddenColorOption(),
        breaks: forbiddenColorOption(),
        scheme: forbiddenColorOption(),
        reverse: forbiddenColorOption(),
        oob: forbiddenColorOption(),
        onExhaust: forbiddenColorOption(),
        labels: forbiddenColorOption(),
      }),
      Type.Object({
        type: Type.Literal("identity"),
        transform: forbiddenColorOption(),
        temporalKind: forbiddenColorOption(),
        parse: forbiddenColorOption(),
        parseFailure: forbiddenColorOption(),
        timezone: forbiddenColorOption(),
        disambiguation: forbiddenColorOption(),
        domain: forbiddenColorOption(),
        domainMode: forbiddenColorOption(),
        breaks: forbiddenColorOption(),
        range: forbiddenColorOption(),
        scheme: forbiddenColorOption(),
        reverse: forbiddenColorOption(),
        oob: forbiddenColorOption(),
        onExhaust: forbiddenColorOption(),
        labels: forbiddenColorOption(),
      }),
      Type.Object({
        type: Type.Literal("ordinal"),
        transform: forbiddenColorOption(),
        temporalKind: forbiddenColorOption(),
        parse: forbiddenColorOption(),
        parseFailure: forbiddenColorOption(),
        timezone: forbiddenColorOption(),
        disambiguation: forbiddenColorOption(),
        breaks: forbiddenColorOption(),
        oob: forbiddenColorOption(),
        labels: forbiddenColorOption(),
      }),
      Type.Object({
        type: Type.Literal("sequential"),
        domainMode: forbiddenColorOption(),
        onExhaust: forbiddenColorOption(),
      }),
      Type.Object({ type: forbiddenColorOption() }),
    ]),
  ]),

  /**
   * Size + linewidth share this schema. `sizeUnit` is size-only at runtime
   * (ignored for linewidth); alpha uses AlphaScaleSpec without sizeUnit so
   * the option cannot validate as a silent no-op (#830).
   */
  PositiveStyleScaleSpec: numericStyleScaleSpec(
    // minimum 0 allows scale_size_area zero-area radii; linewidth 0 is also valid.
    Type.Number({ minimum: 0 }),
    "Configuration for a non-negative numeric size or linewidth scale.",
    sizeUnitField,
  ),

  AlphaScaleSpec: numericStyleScaleSpec(
    Type.Number({ minimum: 0, maximum: 1 }),
    "Configuration for an opacity scale constrained to [0, 1].",
  ),

  ShapeScaleSpec: finiteStyleScaleSpec(
    Type.Union(POINT_SHAPE_NAME_SCHEMAS),
    "Configuration for a finite point-shape scale.",
  ),

  LinetypeScaleSpec: finiteStyleScaleSpec(
    Type.Union(LINETYPE_NAME_SCHEMAS),
    "Configuration for a finite line-pattern scale.",
  ),

  Scales: Type.Object(
    {
      x: Type.Optional(Type.Ref("PositionScaleSpec")),
      y: Type.Optional(Type.Ref("PositionScaleSpec")),
      color: Type.Optional(Type.Ref("ColorScaleSpec")),
      fill: Type.Optional(Type.Ref("ColorScaleSpec")),
      size: Type.Optional(Type.Ref("PositiveStyleScaleSpec")),
      linewidth: Type.Optional(Type.Ref("PositiveStyleScaleSpec")),
      alpha: Type.Optional(Type.Ref("AlphaScaleSpec")),
      shape: Type.Optional(Type.Ref("ShapeScaleSpec")),
      linetype: Type.Optional(Type.Ref("LinetypeScaleSpec")),
    },
    {
      additionalProperties: false,
      description:
        "Per-scale configuration, keyed by aesthetic. Omitted scales use inference (type from field data, domain from data extent).",
    },
  ),

  // --- guide / legend / theme --------------------------------------------------

  GuideThemeSpec: Type.Object(
    {
      titleSize: Type.Optional(Type.Number({ minimum: 8, maximum: 32 })),
      labelSize: Type.Optional(Type.Number({ minimum: 8, maximum: 24 })),
      keyGap: Type.Optional(Type.Number({ minimum: 0, maximum: 32 })),
      rowGap: Type.Optional(Type.Number({ minimum: 0, maximum: 32 })),
      blockGap: Type.Optional(Type.Number({ minimum: 0, maximum: 64 })),
      colorbarThickness: Type.Optional(Type.Number({ minimum: 4, maximum: 48 })),
      colorbarLength: Type.Optional(Type.Number({ minimum: 48, maximum: 512 })),
    },
    {
      additionalProperties: false,
      description: "Bounded presentation overrides for one guide block.",
    },
  ),

  BandAxisGuideSpec: Type.Object(
    {
      mode: Type.Optional(
        Type.Union(
          [
            Type.Literal("auto"),
            Type.Literal("single"),
            Type.Literal("wrap"),
            Type.Literal("rotate"),
            Type.Literal("off"),
          ],
          {
            description: 'Band axis label layout: "auto", "single", "wrap", "rotate", or "off".',
          },
        ),
      ),
      angle: Type.Optional(
        Type.Number({ description: 'Rotation in degrees when mode is "rotate".' }),
      ),
      wrap: Type.Optional(
        Type.Number({
          minimum: 1,
          maximum: 8,
          description: 'Maximum wrapped lines when mode is "wrap".',
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Scale-local band-axis label layout override retained independently from guide appearance.",
    },
  ),

  AxisGuideSpec: Type.Object(
    {
      type: Type.Literal("axis"),
      title: Type.Optional(Type.String({ maxLength: 256 })),
      showTicks: Type.Optional(Type.Boolean()),
      showLabels: Type.Optional(Type.Boolean()),
      collision: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("preserve"), Type.Literal("ellipsis")]),
      ),
      theme: Type.Optional(Type.Ref("GuideThemeSpec")),
    },
    { additionalProperties: false },
  ),

  LegendGuideSpec: Type.Object(
    {
      type: Type.Literal("legend"),
      title: Type.Optional(Type.String({ maxLength: 256 })),
      order: Type.Optional(Type.Integer({ minimum: -1024, maximum: 1024 })),
      position: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("right"), Type.Literal("bottom")]),
      ),
      direction: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("vertical"), Type.Literal("horizontal")]),
      ),
      keySize: Type.Optional(Type.Number({ minimum: 4, maximum: 48 })),
      collision: Type.Optional(
        Type.Union([Type.Literal("ellipsis"), Type.Literal("wrap"), Type.Literal("error")]),
      ),
      force: Type.Optional(Type.Boolean()),
      theme: Type.Optional(Type.Ref("GuideThemeSpec")),
    },
    { additionalProperties: false },
  ),

  ColorbarGuideSpec: Type.Object(
    {
      type: Type.Literal("colorbar"),
      title: Type.Optional(Type.String({ maxLength: 256 })),
      order: Type.Optional(Type.Integer({ minimum: -1024, maximum: 1024 })),
      position: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("right"), Type.Literal("bottom")]),
      ),
      direction: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("vertical"), Type.Literal("horizontal")]),
      ),
      showTicks: Type.Optional(Type.Boolean()),
      showLabels: Type.Optional(Type.Boolean()),
      collision: Type.Optional(Type.Union([Type.Literal("ellipsis"), Type.Literal("error")])),
      force: Type.Optional(Type.Boolean()),
      theme: Type.Optional(Type.Ref("GuideThemeSpec")),
    },
    { additionalProperties: false },
  ),

  ColorstepsGuideSpec: Type.Object(
    {
      type: Type.Literal("colorsteps"),
      title: Type.Optional(Type.String({ maxLength: 256 })),
      order: Type.Optional(Type.Integer({ minimum: -1024, maximum: 1024 })),
      position: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("right"), Type.Literal("bottom")]),
      ),
      direction: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("vertical"), Type.Literal("horizontal")]),
      ),
      showLabels: Type.Optional(Type.Boolean()),
      collision: Type.Optional(Type.Union([Type.Literal("ellipsis"), Type.Literal("error")])),
      force: Type.Optional(Type.Boolean()),
      theme: Type.Optional(Type.Ref("GuideThemeSpec")),
    },
    { additionalProperties: false },
  ),

  NoneGuideSpec: Type.Object({ type: Type.Literal("none") }, { additionalProperties: false }),

  GuideSpec: Type.Union([
    Type.Ref("AxisGuideSpec"),
    Type.Ref("LegendGuideSpec"),
    Type.Ref("ColorbarGuideSpec"),
    Type.Ref("ColorstepsGuideSpec"),
    Type.Ref("NoneGuideSpec"),
  ]),

  GuidesSpec: Type.Object(
    {
      x: Type.Optional(Type.Ref("GuideSpec")),
      y: Type.Optional(Type.Ref("GuideSpec")),
      color: Type.Optional(Type.Ref("GuideSpec")),
      fill: Type.Optional(Type.Ref("GuideSpec")),
      size: Type.Optional(Type.Ref("GuideSpec")),
      linewidth: Type.Optional(Type.Ref("GuideSpec")),
      alpha: Type.Optional(Type.Ref("GuideSpec")),
      shape: Type.Optional(Type.Ref("GuideSpec")),
      linetype: Type.Optional(Type.Ref("GuideSpec")),
    },
    {
      additionalProperties: false,
      description: "Appearance-only guide configuration keyed by aesthetic.",
    },
  ),

  LegendSpec: Type.Object(
    {
      order: Type.Optional(
        Type.Union(
          [
            Type.Literal("stable-domain"),
            Type.Literal("present-first-seen"),
            Type.Literal("sorted"),
          ],
          {
            description:
              'Order of discrete legend entries: "stable-domain" (default — stored assignment order, stable across data changes), "present-first-seen" (first occurrence in the current data), "sorted" (alphabetical). Ordering NEVER changes color assignments.',
          },
        ),
      ),
    },
    {
      additionalProperties: false,
      description: "Legend options. Legends style only through the theme.",
    },
  ),

  ThemeName: Type.Union(THEME_NAME_SCHEMAS, {
    description: `A registered theme name: ${THEME_NAMES.map((name) => `"${name}"`).join(", ")}.`,
  }),

  ThemeSpec: Type.Object(
    {
      name: Type.Optional(
        Type.Ref("ThemeName", {
          description: 'Base theme to override. Default "default".',
        }),
      ),
      ink: Type.Optional(
        Type.String({
          description:
            "Foreground role (CSS color): axis lines, tick labels, titles, unmapped line/point/text marks.",
        }),
      ),
      paper: Type.Optional(
        Type.String({
          description:
            'Background role (CSS color) painted behind the plot. "none" for transparent.',
        }),
      ),
      accent: Type.Optional(
        Type.String({
          description:
            "Accent role (CSS color): default fill for unmapped bars, columns, and areas.",
        }),
      ),
      grid: Type.Optional(Type.String({ description: "Panel grid line color (CSS color)." })),
      panel: Type.Optional(Type.String({ description: "Panel background color (CSS color)." })),
      letterboxFill: Type.Optional(
        Type.String({
          description:
            "Fixed-aspect gutter color (CSS color). Defaults to the resolved paper role.",
        }),
      ),
      axisText: Type.Optional(Type.String({ description: "Axis tick-label color (CSS color)." })),
      axisLine: Type.Optional(Type.String({ description: "Axis-line color (CSS color)." })),
      tickColor: Type.Optional(Type.String({ description: "Axis-tick color (CSS color)." })),
      panelBorder: Type.Optional(Type.String({ description: "Panel-border color (CSS color)." })),
      interactionInk: Type.Optional(
        Type.String({ description: "Primary interaction-control and overlay ink (CSS color)." }),
      ),
      interactionMuted: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          exclusiveMaximum: 1,
          description: "Opacity for marks de-emphasized by an interaction.",
        }),
      ),
      focusRing: Type.Optional(Type.String({ description: "Focus-ring color (CSS color)." })),
      crosshair: Type.Optional(Type.String({ description: "Crosshair-guide color (CSS color)." })),
      selectionFill: Type.Optional(
        Type.String({ description: "Interval-selection fill (CSS color, normally translucent)." }),
      ),
      selectionStroke: Type.Optional(
        Type.String({ description: "Selection and zoom-target stroke (CSS color)." }),
      ),
      tooltipPaper: Type.Optional(
        Type.String({ description: "Opaque tooltip surface (CSS color)." }),
      ),
      tooltipInk: Type.Optional(Type.String({ description: "Tooltip foreground (CSS color)." })),
      tooltipBorder: Type.Optional(Type.String({ description: "Tooltip keyline (CSS color)." })),
      toolActive: Type.Optional(
        Type.String({ description: "Active-tool text and underline (CSS color)." }),
      ),
      fontFamily: Type.Optional(Type.String({ description: "Chart font-family stack." })),
      fontSize: Type.Optional(
        Type.Number({ minimum: 1, description: "Base and tick-label font size in px." }),
      ),
      axisTextSize: Type.Optional(Type.Number({ minimum: 1 })),
      fontWeight: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
      titleSize: Type.Optional(Type.Number({ minimum: 1 })),
      titleWeight: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
      subtitleSize: Type.Optional(Type.Number({ minimum: 1 })),
      subtitleWeight: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
      axisTitleSize: Type.Optional(Type.Number({ minimum: 1 })),
      axisTitleWeight: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
      guideTitleSize: Type.Optional(Type.Number({ minimum: 8, maximum: 32 })),
      legendKeySize: Type.Optional(Type.Number({ minimum: 4, maximum: 48 })),
      legendKeyGap: Type.Optional(Type.Number({ minimum: 0, maximum: 32 })),
      legendRowGap: Type.Optional(Type.Number({ minimum: 0, maximum: 32 })),
      guideBlockGap: Type.Optional(Type.Number({ minimum: 0, maximum: 64 })),
      colorbarThickness: Type.Optional(Type.Number({ minimum: 4, maximum: 48 })),
      colorbarLengthMin: Type.Optional(Type.Number({ minimum: 48, maximum: 512 })),
      captionSize: Type.Optional(Type.Number({ minimum: 1 })),
      stripSize: Type.Optional(Type.Number({ minimum: 1 })),
      stripWeight: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
      axisLineWidth: Type.Optional(Type.Number({ minimum: 0 })),
      tickWidth: Type.Optional(Type.Number({ minimum: 0 })),
      tickLength: Type.Optional(Type.Number({ minimum: 0 })),
      gridWidth: Type.Optional(Type.Number({ minimum: 0 })),
      panelBorderWidth: Type.Optional(Type.Number({ minimum: 0 })),
      gridDasharray: Type.Optional(
        Type.String({ description: "SVG stroke-dasharray for major grid lines." }),
      ),
      axisLineX: Type.Optional(Type.Boolean()),
      axisLineY: Type.Optional(Type.Boolean()),
      ticksX: Type.Optional(Type.Boolean()),
      ticksY: Type.Optional(Type.Boolean()),
      labelsX: Type.Optional(
        Type.Boolean({
          description: "When false, suppress x-axis tick labels (theme_void).",
        }),
      ),
      labelsY: Type.Optional(
        Type.Boolean({
          description: "When false, suppress y-axis tick labels (theme_void).",
        }),
      ),
      gridX: Type.Optional(Type.Boolean()),
      gridY: Type.Optional(Type.Boolean()),
      showPanelBorder: Type.Optional(Type.Boolean()),
    },
    {
      additionalProperties: false,
      description:
        "A theme object: a named base plus role overrides. Roles feed geom defaults (ink/paper/accent); every color rides a --gg-* CSS custom property so hosts can restyle without a re-render.",
    },
  ),

  Labs: Type.Object(
    {
      title: Type.Optional(Type.String({ description: "Plot title." })),
      subtitle: Type.Optional(Type.String({ description: "Plot subtitle, under the title." })),
      caption: Type.Optional(Type.String({ description: "Small caption under the plot." })),
      x: Type.Optional(
        Type.String({ description: "X axis title. Defaults to the mapped field name." }),
      ),
      y: Type.Optional(
        Type.String({ description: "Y axis title. Defaults to the mapped field name." }),
      ),
      color: Type.Optional(
        Type.String({ description: "Color legend title. Defaults to the mapped field name." }),
      ),
      fill: Type.Optional(
        Type.String({ description: "Fill legend title. Defaults to the mapped field name." }),
      ),
      size: Type.Optional(
        Type.String({ description: "Size legend title. Defaults to the mapped field name." }),
      ),
      linewidth: Type.Optional(
        Type.String({ description: "Linewidth legend title. Defaults to the mapped field name." }),
      ),
      alpha: Type.Optional(
        Type.String({ description: "Alpha legend title. Defaults to the mapped field name." }),
      ),
      shape: Type.Optional(
        Type.String({ description: "Shape legend title. Defaults to the mapped field name." }),
      ),
      linetype: Type.Optional(
        Type.String({ description: "Linetype legend title. Defaults to the mapped field name." }),
      ),
    },
    {
      additionalProperties: false,
      description: "Human-readable labels: titles, axis titles, legend titles, caption.",
    },
  ),

  // --- facets / coord ----------------------------------------------------------

  FacetScales: Type.Union(
    [Type.Literal("fixed"), Type.Literal("free"), Type.Literal("free_x"), Type.Literal("free_y")],
    {
      description:
        'How positional scales behave across facet panels: "fixed" (default — all panels share both scales, trained on the union of panel data), "free" (both positional scales train per panel), "free_x" (only x is per-panel), "free_y" (only y is per-panel). Discrete color/fill assignments are ALWAYS global (one legend), regardless of this setting.',
    },
  ),

  FacetFieldRef: Type.Object(
    {
      field: Type.String({
        description: "Name of the data column that partitions facet panels.",
      }),
      levels: Type.Optional(
        Type.Array(Type.Ref("DomainValue"), {
          minItems: 1,
          description:
            "Closed explicit panel order for this facet field. When set, panels appear in this order (including empty panels for levels absent from data). Values observed in data but omitted from levels are dropped from all panels and diagnosed. Omit for the default ascending sort of observed values.",
        }),
      ),
      labels: Type.Optional(
        Type.Record(Type.String(), Type.String(), {
          description:
            'Display-label map for authored facet values (JSON object). Keys are string forms of the semantic values ("west", "1", "true", "null"); values are human-readable strip/accessibility text. Labels never change panel IDs or semantic facet identity. Omit to use bandKey(value) as the strip text.',
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        'Facet field reference with optional closed order and display labels. Example: {"field": "region", "levels": ["west", "east"], "labels": {"west": "West Coast"}}. Bare strings are NOT valid here — normalize() expands "region" to {"field": "region"}.',
    },
  ),

  FacetStripSpec: Type.Object(
    {
      position: Type.Optional(
        Type.Union(
          [
            Type.Literal("top"),
            Type.Literal("bottom"),
            Type.Literal("left"),
            Type.Literal("right"),
          ],
          {
            description:
              'Where facet strip bands are reserved and drawn: "top" (default), "bottom", "left", or "right". Left/right strips participate in layout measurement rather than overlaying the panel.',
          },
        ),
      ),
      show: Type.Optional(
        Type.Boolean({
          description:
            "Whether to reserve and draw strip bands (default true). Set false when direct labels are authored elsewhere; panel identity and authored display labels remain available to accessibility and interaction consumers.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        'Facet strip chrome: position and visibility. Defaults: position "top", show true. Example: {"position": "left"} or {"show": false}.',
    },
  ),

  FacetSpec: Type.Object(
    {
      wrap: Type.Optional(
        Type.Ref("FacetFieldRef", {
          description:
            "Facet WRAP form: partition rows by this data field's distinct values, one panel per value, wrapped into a grid ncol wide (ggplot2's facet_wrap). Mutually exclusive with rows/cols. Optional levels/labels control order and strip text.",
        }),
      ),
      rows: Type.Optional(
        Type.Ref("FacetFieldRef", {
          description:
            "Facet GRID form: the field whose distinct values become grid rows (ggplot2's facet_grid rows). Combine with cols; mutually exclusive with wrap. Optional levels/labels control order and strip text.",
        }),
      ),
      cols: Type.Optional(
        Type.Ref("FacetFieldRef", {
          description:
            "Facet GRID form: the field whose distinct values become grid columns (ggplot2's facet_grid cols). Combine with rows; mutually exclusive with wrap. Optional levels/labels control order and strip text.",
        }),
      ),
      ncol: Type.Optional(
        Type.Integer({
          minimum: 1,
          description:
            "WRAP ONLY: number of panel columns (an integer of at least 1). Omit for an automatic near-square layout (ceil(sqrt(panels))).",
        }),
      ),
      scales: Type.Optional(Type.Ref("FacetScales")),
      strip: Type.Optional(Type.Ref("FacetStripSpec")),
    },
    {
      additionalProperties: false,
      description:
        "Facet the plot into small-multiple panels. Wrap form: set `wrap` (+ optional ncol). Grid form: set `rows` and/or `cols`. Panels partition the data BEFORE stats and positions run (each panel computes its own counts, bins, stacks). By default panel values sort ascending and strips sit on top; set field `levels`/`labels` and `strip.position`/`strip.show` for authored order, display text, and strip placement. Null values form their own panel when observed (or when listed in levels).",
    },
  ),

  CoordTransformAxisSpec: Type.Object(
    {
      transform: Type.Union(
        [Type.Literal("identity"), Type.Literal("log10"), Type.Literal("sqrt")],
        {
          description:
            "Post-stat coordinate transform for this axis: identity, base-10 logarithm, or square root.",
        },
      ),
      limits: Type.Optional(
        Type.Array(Type.Number(), {
          minItems: 2,
          maxItems: 2,
          description:
            "Optional coordinate viewport [min, max] in semantic/source units. Exactly two numbers. Unlike scale limits, coordinate limits do not remove rows or recompute statistics.",
        }),
      ),
      reverse: Type.Optional(
        Type.Boolean({
          description:
            "Reverse this coordinate axis after its transform without changing stat inputs or the trained semantic scale domain.",
        }),
      ),
      expand: Type.Optional(
        Type.Boolean({
          description:
            "Whether explicit coordinate limits receive the default 5% transformed-space display expansion (default true). Set false for exact viewport limits.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "One continuous coordinate axis projected after statistics and scale training. Non-identity transforms require a continuous, non-temporal position scale.",
    },
  ),

  CoordCartesianSpec: Type.Object(
    {
      type: Type.Union([Type.Literal("cartesian"), Type.Literal("flip")], {
        description:
          'Coordinate system: "cartesian" (default) or "flip" (swap the axes: x renders vertically, y horizontally — THE mechanism for horizontal bar charts; positions, stacking, dodging, and hit-testing all follow).',
      }),
    },
    {
      additionalProperties: false,
      description:
        'The plot\'s Cartesian coordinate system. {"type": "flip"} turns any vertical composition into its horizontal counterpart (ggplot2\'s coord_flip).',
    },
  ),

  CoordTransformSpec: Type.Object(
    {
      type: Type.Literal("transform", {
        description: "Project positions after stats/positions and scale training.",
      }),
      x: Type.Optional(Type.Ref("CoordTransformAxisSpec")),
      y: Type.Optional(Type.Ref("CoordTransformAxisSpec")),
      clip: Type.Optional(
        Type.Boolean({
          description:
            "Clip marks to the panel rectangle (default true). Set false only when intentional overflow should remain visible.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "A post-stat Cartesian coordinate transform with independent x/y projectors. It is intentionally distinct from pre-stat scale transforms.",
    },
  ),

  CoordFixedSpec: Type.Object(
    {
      type: Type.Literal("fixed", {
        description: "Cartesian coordinates with a fixed physical data-unit ratio.",
      }),
      ratio: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Physical y-unit length divided by physical x-unit length (default 1, equal units).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "A fixed-aspect Cartesian coordinate system. Layout fits the largest centered data rectangle after chart chrome is allocated.",
    },
  ),

  CoordSfSpec: Type.Object(
    {
      type: Type.Literal("sf", {
        description:
          "Simple-features coordinates for already-projected map data (ggplot2 coord_sf; #809). Fixed-aspect layout; no CRS transform in v1.",
      }),
      ratio: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description:
            "Physical y-unit length divided by physical x-unit length (default 1, equal projected units).",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Fixed-aspect coordinates for portable geom_sf maps. Data must already be projected; CRS reproject / graticules are deferred.",
    },
  ),

  CoordSpec: Type.Union(
    [
      Type.Ref("CoordCartesianSpec"),
      Type.Ref("CoordTransformSpec"),
      Type.Ref("CoordFixedSpec"),
      Type.Ref("CoordSfSpec"),
    ],
    {
      description:
        "The plot coordinate system: ordinary Cartesian, flipped Cartesian, post-stat transformed, fixed-aspect, or simple-features fixed-aspect.",
    },
  ),

  PlotSpec: Type.Object(
    {
      $schema: Type.Optional(
        Type.String({
          description: "URL of the ggsvelte spec JSON Schema version this spec targets.",
        }),
      ),
      edition: Type.Optional(
        Type.Integer({
          minimum: 1,
          description: `Defaults edition this spec was authored against (currently ${CURRENT_EDITION}). normalize() stamps the current edition when absent, so a spec keeps ITS edition's default look (theme roles, categorical palette) even after ggsvelte's defaults improve in a later edition. Explicit theme/scale settings always win over edition defaults.`,
        }),
      ),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description: "Default data for all layers.",
        }),
      ),
      datasets: Type.Optional(
        Type.Record(Type.String(), Type.Ref("InlineData"), {
          description: 'Named inline datasets referenced by {"name": ...} data refs.',
        }),
      ),
      aes: Type.Optional(
        Type.Ref("Aes", {
          description: "Plot-level aesthetic mapping, inherited by every layer.",
        }),
      ),
      layers: Type.Array(Type.Ref("LayerSpec"), {
        minItems: 1,
        description:
          "The plot's layers, drawn in array order (first = bottom). At least one layer.",
      }),
      facet: Type.Optional(Type.Ref("FacetSpec")),
      coord: Type.Optional(Type.Ref("CoordSpec")),
      scales: Type.Optional(Type.Ref("Scales")),
      guides: Type.Optional(Type.Ref("GuidesSpec")),
      legend: Type.Optional(Type.Ref("LegendSpec")),
      labs: Type.Optional(Type.Ref("Labs")),
      theme: Type.Optional(
        Type.Union([Type.Ref("ThemeName"), Type.Ref("ThemeSpec")], {
          description:
            "A registered theme name, or a theme object (named base + role overrides). Omit for the default theme.",
        }),
      ),
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Preferred plot width in px (greater than 0). The host may override.",
        }),
      ),
      height: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          description: "Preferred plot height in px (greater than 0). The host may override.",
        }),
      ),
      a11y: Type.Optional(
        Type.Union([Type.Literal("auto"), Type.Literal("force-svg")], {
          description:
            'Accessibility mode: "auto" (default — layers may render to canvas per their `render` hint, paired with an off-screen description block) or "force-svg" (every layer renders as SVG DOM marks — use for assistive-technology-critical charts; canvas layers do not expose per-mark accessibility).',
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "A complete ggsvelte plot specification: data + aesthetic mapping + one or more layers, in ggplot2's layered grammar. Strictly JSON (PortableSpec).",
    },
  ),
};
