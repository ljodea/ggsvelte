/**
 * The ggsvelte spec schema — TypeBox is the source of truth (decision 0004).
 *
 * These definitions ARE the published JSON Schema (via `Type.Module` for named
 * $defs, emitted to `schema/v0.json` by `scripts/emit-schema.ts`) AND the TS
 * types (via `Static<>`) AND the runtime validator input (`Value.Check`).
 * One artifact, no drift.
 *
 * Authoring rules (from decision 0004):
 * - Strict objects everywhere (`additionalProperties: false`).
 * - Every field carries a description written for LLMs; numeric constraints
 *   are ALSO stated in descriptions because constrained-decoding grammars may
 *   drop or reject numeric keywords.
 * - No bare-string channel shorthand in the schema: agents emit canonical
 *   channel forms only. The shorthand exists only in the TS builder/adapter.
 * - Unions are `anyOf` by construction (TypeBox default) — the form OpenAI
 *   structured outputs accept.
 * - `Type.Record` is used for `data.columns`/`datasets` only; the artifact
 *   emitter rewrites its `patternProperties` to `additionalProperties`
 *   (semantically identical for the `^(.*)$` pattern) so the published
 *   schema stays inside portable JSON Schema.
 *
 * M1 scope: geoms point/line/col/bar/area/rule/text; stats identity + count;
 * positions identity/stack/fill/dodge; a `scales` configuration surface
 * (linear/log/time/band + ordinal/sequential color); theme registry names +
 * object overrides; legend options. The union shapes extend additively.
 *
 * M2 additions (statistical layer, all additive): geoms histogram (alias —
 * normalize() canonicalizes to bar + stat bin), smooth, boxplot, density,
 * errorbar; stats bin/smooth/boxplot/density/summary; positions jitter
 * (SEEDED — deterministic by design) and nudge with a `positionParams`
 * object; aes channels ymin/ymax.
 *
 * M2 additions (facets + interaction, all additive): `facet` (wrap OR
 * rows/cols grid, fixed/free scales), `coord` ({ type: "flip" } — the single
 * orientation mechanism), a per-layer `render` backend hint
 * ("svg" | "canvas" | "auto"), and the plot-level `a11y` flag ("force-svg"
 * keeps every layer in the accessible SVG backend).
 */
import Type, { type Static, type TSchema } from "typebox";

// ---------------------------------------------------------------------------
// Named $defs (TypeBox 1.x Cyclic)
// ---------------------------------------------------------------------------
// TypeBox 1.x (`typebox` package) is the active line. 0.x lived as
// `@sinclair/typebox` under LTS in the sinclair-typebox support repo.
//
// In 0.x, `Type.Module(...).Import("Key")` produced a `$defs` + `$ref` schema.
// In 1.x, `Type.Module` returns an inlined property bag (no `.Import`);
// `Type.Cyclic(decls, key)` is the equivalent that preserves named `$defs`
// for the published JSON Schema artifact (decision 0004).

const SpecDeclarations = {
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
            "Lower bound channel (errorbar with the identity stat). Quantitative values only.",
        }),
      ),
      ymax: Type.Optional(
        Type.Ref("ChannelValue", {
          description:
            "Upper bound channel (errorbar with the identity stat). Quantitative values only.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "Aesthetic mapping: which channels read which data fields/constants. Plot-level aes is inherited by every layer; a layer's aes overrides per channel, and null unsets an inherited channel.",
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
        Type.Union([Type.Literal("circle"), Type.Literal("square"), Type.Literal("triangle")], {
          description: 'Point shape. One of "circle", "square", "triangle". Default "circle".',
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Styling parameters for the point geom.",
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
    },
    {
      additionalProperties: false,
      description: "Styling parameters for the line geom.",
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
    },
    {
      additionalProperties: false,
      description: "Parameters for the smooth geom (fitted trend line + optional se ribbon).",
    },
  ),

  BoxplotParams: Type.Object(
    {
      width: Type.Optional(
        Type.Number({
          exclusiveMinimum: 0,
          maximum: 1,
          description:
            "Box width as a fraction of the band step. Must be greater than 0 and at most 1. Default 0.9.",
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
    },
    {
      additionalProperties: false,
      description: "Parameters for the density geom (gaussian kernel density estimate).",
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
            "STAT SUMMARY ONLY: summary function for the upper bound (ymax). Overrides the mean_se default.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        'Parameters for the errorbar geom: styling plus the summary-stat functions (fun, funMin, funMax) used when stat is "summary".',
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
    },
    {
      additionalProperties: false,
      description: "Styling parameters for the area geom.",
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
    },
    {
      additionalProperties: false,
      description:
        "Styling parameters for the rule geom. The annotation form sets xintercept and/or yintercept here; the data-driven form maps aes.x OR aes.y instead (never both forms at once).",
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

  // --- layers (discriminated by geom) ----------------------------------------

  PointLayer: Type.Object(
    {
      geom: Type.Literal("point", {
        description:
          "Point geometry: one mark per data row. Use for scatter plots, dot plots, bubbles, correlation views.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Point layers draw the data as-is." }),
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
          "Line geometry: connects points in x order, one line per group (groups derive from discrete aesthetics such as color, or from aes.group). Use for time series, trends, line charts.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Line layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Line layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      params: Type.Optional(Type.Ref("LineParams")),
    },
    {
      additionalProperties: false,
      description:
        "A line layer. Requires x and y channels; rows are sorted by x within each group before connecting.",
    },
  ),

  ColLayer: Type.Object(
    {
      geom: Type.Literal("col", {
        description:
          "Column geometry: one rectangle per data row, from the y baseline (zero) to the row's y value. Use when the data already contains the bar heights (ggplot2's geom_col).",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Col layers draw the given y values as-is." }),
      ),
      position: Type.Optional(Type.Ref("StackablePosition")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
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
      params: Type.Optional(Type.Ref("BarParams")),
    },
    {
      additionalProperties: false,
      description:
        'A histogram layer (alias for bar + stat bin). Requires a continuous x channel; y is computed by the bin stat. Default position "stack". Set params.binwidth or params.bins (default 30, with an advisory).',
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
      params: Type.Optional(Type.Ref("SmoothParams")),
    },
    {
      additionalProperties: false,
      description:
        "A fitted-trend layer. Requires quantitative x and y channels. Usually layered over a point layer of the same data.",
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
      params: Type.Optional(Type.Ref("BoxplotParams")),
    },
    {
      additionalProperties: false,
      description: "A boxplot layer. Requires a discrete x channel and a quantitative y channel.",
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
      params: Type.Optional(Type.Ref("DensityParams")),
    },
    {
      additionalProperties: false,
      description:
        "A kernel-density layer. Requires a continuous x channel; y is computed by the density stat. Map fill (with alpha) for overlaid group comparisons.",
    },
  ),

  ErrorbarLayer: Type.Object(
    {
      geom: Type.Literal("errorbar", {
        description:
          "Errorbar geometry: a vertical range with caps at ymin and ymax, one per data row (identity stat) or per x group (summary stat).",
      }),
      stat: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("summary")], {
          description:
            'The errorbar\'s stat: "identity" (default — map aes.ymin and aes.ymax to data fields) or "summary" (compute y/ymin/ymax per x group from aes.y; default mean ± standard error, ggplot2\'s mean_se).',
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Errorbar layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      params: Type.Optional(Type.Ref("ErrorbarParams")),
    },
    {
      additionalProperties: false,
      description:
        "An errorbar layer. Identity stat: requires x, ymin, and ymax channels. Summary stat: requires x and y channels (bounds computed by params.fun/funMin/funMax, default mean_se).",
    },
  ),

  AreaLayer: Type.Object(
    {
      geom: Type.Literal("area", {
        description:
          "Area geometry: a filled region from the y baseline (zero) to the y value, connected in x order per group. Use for stacked composition-over-time charts.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Area layers draw the data as-is." }),
      ),
      position: Type.Optional(Type.Ref("StackablePosition")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      params: Type.Optional(Type.Ref("AreaParams")),
    },
    {
      additionalProperties: false,
      description:
        'An area layer. Requires x and y channels; rows are sorted by x within each group. Default position "stack".',
    },
  ),

  RuleLayer: Type.Object(
    {
      geom: Type.Literal("rule", {
        description:
          "Rule geometry: reference lines spanning the panel. TWO HONEST FORMS: (1) annotation — set params.xintercept and/or params.yintercept to fixed data values and map neither aes.x nor aes.y; (2) data-driven — map exactly ONE of aes.x (vertical rules) or aes.y (horizontal rules) to a field. Never mix the forms in one layer.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Rule layers draw the given positions as-is." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Rule layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      params: Type.Optional(Type.Ref("RuleParams")),
    },
    {
      additionalProperties: false,
      description:
        "A reference-line layer (ggplot2's geom_vline/geom_hline, unified). Annotation form: fixed intercepts in params. Data-driven form: map aes.x OR aes.y.",
    },
  ),

  TextLayer: Type.Object(
    {
      geom: Type.Literal("text", {
        description:
          "Text geometry: one label per data row at (x, y). No collision detection — labels draw exactly where placed. Requires x, y, and label channels.",
      }),
      stat: Type.Optional(
        Type.Literal("identity", { description: "Text layers draw the data as-is." }),
      ),
      position: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("nudge")], {
          description:
            'Position adjustment: "identity" (default) or "nudge" (fixed offsets from the anchor — set positionParams.x/y; useful for labels beside marks).',
        }),
      ),
      positionParams: Type.Optional(Type.Ref("PositionParams")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      params: Type.Optional(Type.Ref("TextParams")),
    },
    {
      additionalProperties: false,
      description: "A text-label layer. Requires x, y, and label channels.",
    },
  ),

  LayerSpec: Type.Union(
    [
      Type.Ref("PointLayer"),
      Type.Ref("LineLayer"),
      Type.Ref("ColLayer"),
      Type.Ref("BarLayer"),
      Type.Ref("HistogramLayer"),
      Type.Ref("AreaLayer"),
      Type.Ref("RuleLayer"),
      Type.Ref("TextLayer"),
      Type.Ref("SmoothLayer"),
      Type.Ref("BoxplotLayer"),
      Type.Ref("DensityLayer"),
      Type.Ref("ErrorbarLayer"),
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

  PositionScaleSpec: Type.Object(
    {
      type: Type.Optional(
        Type.Union(
          [Type.Literal("linear"), Type.Literal("log"), Type.Literal("time"), Type.Literal("band")],
          {
            description:
              'Scale type: "linear" (default for numbers), "log" (base 10; the whole domain must be positive), "time" (temporal fields; ISO strings or Date values), "band" (discrete categories). Omit to infer from the field type.',
          },
        ),
      ),
      domain: Type.Optional(
        Type.Array(Type.Ref("DomainValue"), {
          minItems: 1,
          description:
            "Explicit domain, PINNING the scale: [min, max] for continuous scales (numbers, or ISO date strings for time); the full category list for band scales. Data outside the domain is dropped with a warning.",
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
            "Explicit tick positions in data units (numbers, or ISO date strings for time scales). Omit for automatic ticks.",
        }),
      ),
      labels: Type.Optional(
        Type.String({
          description:
            'Tick label format string. Time scales: strftime-style ("%Y-%m", "%b %d", "%H:%M"). Numeric scales: ",d" (grouped integer), ".1f" (fixed decimals), ".0%" (percent), "~s" (SI prefix). Omit for automatic formatting.',
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Configuration for a positional (x or y) scale.",
    },
  ),

  ColorScaleSpec: Type.Object(
    {
      type: Type.Optional(
        Type.Union([Type.Literal("ordinal"), Type.Literal("sequential")], {
          description:
            'Color scale type: "ordinal" (discrete categories, default for discrete fields) or "sequential" (continuous ramp, default for quantitative fields).',
        }),
      ),
      domain: Type.Optional(
        Type.Array(Type.Ref("DomainValue"), {
          minItems: 1,
          description:
            "Explicit domain, PINNING the scale: the category list for ordinal scales (values outside it render the unknown color); [min, max] numbers for sequential scales.",
        }),
      ),
      domainMode: Type.Optional(
        Type.Union([Type.Literal("grow"), Type.Literal("data")], {
          description:
            'Ordinal domain stability: "grow" (default — first-seen order, assignments keyed by value; removing a series never recolors the others) or "data" (legacy rebuild-per-render). Ignored when `domain` is set.',
        }),
      ),
      range: Type.Optional(
        Type.Array(Type.String(), {
          minItems: 1,
          description:
            "Explicit output colors (CSS color strings). Ordinal: the palette, in domain order. Sequential: ramp stops, evenly spaced.",
        }),
      ),
      scheme: Type.Optional(
        Type.Union(
          [
            Type.Literal("observable10"),
            Type.Literal("ipsum"),
            Type.Literal("flexoki"),
            Type.Literal("tableau10"),
            Type.Literal("colorblind"),
            Type.Literal("viridis"),
          ],
          {
            description:
              'Named color scheme: categorical "observable10" (default), "ipsum" and "flexoki" (hrbrthemes), "tableau10" and "colorblind" (ggthemes), or sequential "viridis" (default).',
          },
        ),
      ),
      reverse: Type.Optional(
        Type.Boolean({ description: "Reverse the color range. Default false." }),
      ),
      onExhaust: Type.Optional(
        Type.Union([Type.Literal("cycle"), Type.Literal("error")], {
          description:
            'What happens when an ordinal scale runs out of palette entries: "cycle" (default — reuse colors and warn once) or "error" (fail the render; use for correctness-critical charts).',
        }),
      ),
      labels: Type.Optional(
        Type.String({
          description:
            'Legend label format string for sequential scales (numeric formats like ".1f", ",d", ".0%"). Omit for automatic formatting.',
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Configuration for a color or fill scale.",
    },
  ),

  Scales: Type.Object(
    {
      x: Type.Optional(Type.Ref("PositionScaleSpec")),
      y: Type.Optional(Type.Ref("PositionScaleSpec")),
      color: Type.Optional(Type.Ref("ColorScaleSpec")),
      fill: Type.Optional(Type.Ref("ColorScaleSpec")),
    },
    {
      additionalProperties: false,
      description:
        "Per-scale configuration, keyed by aesthetic. Omitted scales use inference (type from field data, domain from data extent).",
    },
  ),

  // --- legend / theme ----------------------------------------------------------

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

  ThemeName: Type.Union(
    [
      Type.Literal("default"),
      Type.Literal("light"),
      Type.Literal("dark"),
      Type.Literal("minimal"),
      Type.Literal("ggplot2"),
      Type.Literal("classic"),
      Type.Literal("hrbr"),
      Type.Literal("few"),
      Type.Literal("clean"),
      Type.Literal("fivethirtyeight"),
      Type.Literal("economist"),
      Type.Literal("tufte"),
    ],
    {
      description:
        'A registered theme name: "default" (inherits the page color via currentColor), "light", "dark", or "minimal".',
    },
  ),

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

  FacetSpec: Type.Object(
    {
      wrap: Type.Optional(
        Type.Ref("FieldRef", {
          description:
            "Facet WRAP form: partition rows by this data field's distinct values, one panel per value, wrapped into a grid ncol wide (ggplot2's facet_wrap). Mutually exclusive with rows/cols.",
        }),
      ),
      rows: Type.Optional(
        Type.Ref("FieldRef", {
          description:
            "Facet GRID form: the field whose distinct values become grid rows (ggplot2's facet_grid rows). Combine with cols; mutually exclusive with wrap.",
        }),
      ),
      cols: Type.Optional(
        Type.Ref("FieldRef", {
          description:
            "Facet GRID form: the field whose distinct values become grid columns (ggplot2's facet_grid cols). Combine with rows; mutually exclusive with wrap.",
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
    },
    {
      additionalProperties: false,
      description:
        "Facet the plot into small-multiple panels. Wrap form: set `wrap` (+ optional ncol). Grid form: set `rows` and/or `cols`. Panels partition the data BEFORE stats and positions run (each panel computes its own counts, bins, stacks). Panel values sort ascending; null values form their own panel.",
    },
  ),

  CoordSpec: Type.Object(
    {
      type: Type.Union([Type.Literal("cartesian"), Type.Literal("flip")], {
        description:
          'Coordinate system: "cartesian" (default) or "flip" (swap the axes: x renders vertically, y horizontally — THE mechanism for horizontal bar charts; positions, stacking, dodging, and hit-testing all follow).',
      }),
    },
    {
      additionalProperties: false,
      description:
        'The plot\'s coordinate system. {"type": "flip"} turns any vertical composition into its horizontal counterpart (ggplot2\'s coord_flip): map x to the category and y to the value as usual, then flip.',
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
          description:
            "Defaults edition this spec was authored against (currently 1). normalize() stamps the current edition when absent, so a spec keeps ITS edition's default look (theme roles, categorical palette) even after ggsvelte's defaults improve in a later edition. Explicit theme/scale settings always win over edition defaults.",
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

/**
 * Named-defs module surface (public).
 * `.Import(key)` returns a Cyclic schema rooted at `key` (`$defs` + `$ref`),
 * matching the TypeBox 0.x Module.Import JSON shape used by the artifact
 * emitter and by Value.Check / Value.Errors.
 *
 * Type inference uses `SpecStatic` (Type.Module) instead: Cyclic's Static<>
 * collapses large graphs to `never` under TypeScript 6, while Module inlines
 * refs into concrete object types.
 *
 * Build the `$defs` graph once (rooted at PlotSpec) and re-root by swapping
 * `$ref` — Type.Cyclic(decls, key) per import would rebuild the full graph
 * ~20× at module load.
 */
const SpecDefsRoot = Type.Cyclic(SpecDeclarations, "PlotSpec");

/** Cyclic schema: shared `$defs` bag + root `$ref` (TypeBox 0.x Import shape). */
export type SpecImportSchema = {
  $defs: (typeof SpecDefsRoot)["$defs"];
  $ref: string;
} & TSchema;

function reRootSpec(key: keyof typeof SpecDeclarations): SpecImportSchema {
  // One shared `$defs` graph; only the root `$ref` changes per import.
  const schema: SpecImportSchema = {
    $defs: SpecDefsRoot.$defs,
    $ref: key,
  };
  return schema;
}

export const SpecModule = {
  Import(key: keyof typeof SpecDeclarations): SpecImportSchema {
    return reRootSpec(key);
  },
};

/** Inlined declaration bag for Static<> extraction (not for JSON emission). */
const SpecStatic = Type.Module(SpecDeclarations);

type SpecType<K extends keyof typeof SpecStatic> = Static<(typeof SpecStatic)[K]>;

// ---------------------------------------------------------------------------
// Imported (validatable) schemas — Cyclic `$defs`+`$ref` for runtime/artifact
// ---------------------------------------------------------------------------

export const PlotSpecSchema = SpecModule.Import("PlotSpec");
export const LayerSpecSchema = SpecModule.Import("LayerSpec");
export const PointLayerSchema = SpecModule.Import("PointLayer");
export const LineLayerSchema = SpecModule.Import("LineLayer");
export const ColLayerSchema = SpecModule.Import("ColLayer");
export const BarLayerSchema = SpecModule.Import("BarLayer");
export const HistogramLayerSchema = SpecModule.Import("HistogramLayer");
export const AreaLayerSchema = SpecModule.Import("AreaLayer");
export const RuleLayerSchema = SpecModule.Import("RuleLayer");
export const TextLayerSchema = SpecModule.Import("TextLayer");
export const SmoothLayerSchema = SpecModule.Import("SmoothLayer");
export const BoxplotLayerSchema = SpecModule.Import("BoxplotLayer");
export const DensityLayerSchema = SpecModule.Import("DensityLayer");
export const ErrorbarLayerSchema = SpecModule.Import("ErrorbarLayer");
export const AesSchema = SpecModule.Import("Aes");
export const ChannelValueSchema = SpecModule.Import("ChannelValue");
export const DataRefSchema = SpecModule.Import("DataRef");
export const ScalesSchema = SpecModule.Import("Scales");
export const FacetSpecSchema = SpecModule.Import("FacetSpec");
export const CoordSpecSchema = SpecModule.Import("CoordSpec");

// ---------------------------------------------------------------------------
// Static types (the package's public TS types)
// ---------------------------------------------------------------------------

/** A single data cell (JSON scalar). */
export type CellValue = SpecType<"CellValue">;

// The data-container types are written out by hand: TypeBox's computed module
// types collapse `Type.Record`/`additionalProperties` value schemas to `{}`
// in Static<>, losing the record value type. Runtime validation and the
// emitted JSON Schema are unaffected (they come from the module above); these
// aliases restore the intended TS shapes and are covered by assignability
// tests against schema fixtures.

/** Inline row-oriented data. */
export interface DataValues {
  values: Record<string, CellValue>[];
}
/** Inline column-oriented data (equal-length arrays). */
export interface DataColumns {
  columns: Record<string, CellValue[]>;
}
/** A reference to a named dataset. */
export interface DataName {
  name: string;
}
/** Where a plot's data comes from. */
export type DataRef = DataValues | DataColumns | DataName;
/** Inline data only ({values} or {columns}). */
export type InlineData = DataValues | DataColumns;
/** Canonical channel value: {field} | {value, scale?} | {stat} | null. */
export type ChannelValue = SpecType<"ChannelValue">;
/** Aesthetic mapping (canonical channel forms only). */
export type Aes = SpecType<"Aes">;
/** Point layer params. */
export type PointParams = SpecType<"PointParams">;
/** Line layer params. */
export type LineParams = SpecType<"LineParams">;
/** Col layer params. */
export type ColParams = SpecType<"ColParams">;
/** Bar/histogram layer params (styling + stat-bin controls). */
export type BarParams = SpecType<"BarParams">;
/** Area layer params. */
export type AreaParams = SpecType<"AreaParams">;
/** Rule layer params (annotation intercepts + styling). */
export type RuleParams = SpecType<"RuleParams">;
/** Text layer params. */
export type TextParams = SpecType<"TextParams">;
/** Smooth layer params (method/se/level/span/degree/n + styling). */
export type SmoothParams = SpecType<"SmoothParams">;
/** Boxplot layer params. */
export type BoxplotParams = SpecType<"BoxplotParams">;
/** Density layer params (bw/adjust/n/cut + styling). */
export type DensityParams = SpecType<"DensityParams">;
/** A summary function name (stat summary). */
export type SummaryFun = SpecType<"SummaryFun">;
/** Errorbar layer params (styling + summary-stat functions). */
export type ErrorbarParams = SpecType<"ErrorbarParams">;
/** Jitter/nudge position parameters. */
export type PositionParams = SpecType<"PositionParams">;
/** A point layer. */
export type PointLayer = SpecType<"PointLayer">;
/** A line layer. */
export type LineLayer = SpecType<"LineLayer">;
/** A col layer (pre-computed bars). */
export type ColLayer = SpecType<"ColLayer">;
/** A bar layer (count or bin stat). */
export type BarLayer = SpecType<"BarLayer">;
/** A histogram layer (alias; normalize() canonicalizes to bar + stat bin). */
export type HistogramLayer = SpecType<"HistogramLayer">;
/** An area layer. */
export type AreaLayer = SpecType<"AreaLayer">;
/** A rule (reference line) layer. */
export type RuleLayer = SpecType<"RuleLayer">;
/** A text-label layer. */
export type TextLayer = SpecType<"TextLayer">;
/** A smooth (fitted trend) layer. */
export type SmoothLayer = SpecType<"SmoothLayer">;
/** A boxplot layer. */
export type BoxplotLayer = SpecType<"BoxplotLayer">;
/** A density (KDE) layer. */
export type DensityLayer = SpecType<"DensityLayer">;
/** An errorbar layer. */
export type ErrorbarLayer = SpecType<"ErrorbarLayer">;
/** One plot layer, discriminated by `geom`. */
export type LayerSpec = SpecType<"LayerSpec">;
/** Stackable position adjustment names. */
export type StackablePosition = SpecType<"StackablePosition">;
/** Position adjustments accepted by point layers. */
export type PointPosition = "identity" | "jitter" | "nudge";
/** Positional (x/y) scale configuration. */
export type PositionScaleSpec = SpecType<"PositionScaleSpec">;
/** Color/fill scale configuration. */
export type ColorScaleSpec = SpecType<"ColorScaleSpec">;
/** Per-scale configuration ({ x, y, color, fill }). */
export type Scales = SpecType<"Scales">;
/** Facet-panel scale behavior. */
export type FacetScales = SpecType<"FacetScales">;
/** Facet configuration (wrap OR rows/cols grid). */
export type FacetSpec = SpecType<"FacetSpec">;
/** Coordinate system ({ type: "cartesian" | "flip" }). */
export type CoordSpec = SpecType<"CoordSpec">;
/** Per-layer rendering backend hint. */
export type RenderBackend = SpecType<"RenderBackend">;
/** Plot-level accessibility mode. */
export type A11yMode = "auto" | "force-svg";
/** Legend options. */
export type LegendSpec = SpecType<"LegendSpec">;
/** Built-in theme names. */
export type ThemeName = SpecType<"ThemeName">;
/** Theme object: named base + role overrides. */
export type ThemeSpec = SpecType<"ThemeSpec">;
/** Plot labels. */
export type Labs = SpecType<"Labs">;
/** The canonical, strictly-JSON plot spec (what agents emit and schemas describe). */
export type PortableSpec = Omit<SpecType<"PlotSpec">, "data" | "datasets"> & {
  data?: DataRef;
  datasets?: Record<string, InlineData>;
};

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
] as const;
export type GeomName = (typeof KNOWN_GEOMS)[number];

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
  "group",
  "label",
  "weight",
  "ymin",
  "ymax",
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
};
