/**
 * `$defs` partial — column/distribution layer specs (ColLayer…BoxplotLayer).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";

export const LayersColBoxplotDecls = {
  ColLayer: Type.Object(
    {
      geom: Type.Literal("col", {
        description:
          "Column geometry: one rectangle per data row, from the y baseline (zero) to the row's y value. Use when the data already contains the bar heights — prefer over GeomBar, which counts or bins.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
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
          "Bar geometry with counting or binning: one rectangle per distinct x value (stat count, discrete x) or per bin (stat bin, continuous x). Do not map aes.y — the stat computes it. Prefer GeomCol when bar heights are already in the data.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
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
          "Histogram geometry: a continuous x variable divided into bins, one bar per bin whose height is the count of rows (or the sum of aes.weight). Do not map aes.y — the bin stat computes it. Canonicalized by normalize() to a bar layer with stat bin.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
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
          "Frequency polygon: continuous x binned like a histogram, drawn as a line through bin centers. Do not map aes.y — the bin stat computes it. Canonicalized by normalize() to a line layer with stat bin.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
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
          "Smooth geometry: a fitted trend line (with an optional confidence ribbon) over an x/y scatter, one fit per group. Use to reveal trends.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
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
          "Quantile geometry: linear quantile regression lines (y ~ x) at one or more conditional quantiles of y, one line per quantile per group.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "A quantile-regression layer. Requires quantitative x and y. Default quantiles [0.25, 0.5, 0.75]. v1 is linear y~x only (no rqss).",
    },
  ),
  QqLayer: Type.Object(
    {
      geom: Type.Literal("qq", {
        description:
          "Q–Q scatter: sample quantiles vs theoretical normal quantiles. Requires aes.sample.",
      }),
      stat: Type.Optional(
        Type.Literal("qq", { description: "Q–Q quantile pairing (default for this geom)." }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "qq layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("QqParams")),
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "A Q–Q point layer. Requires the sample channel.",
    },
  ),
  QqLineLayer: Type.Object(
    {
      geom: Type.Literal("qq_line", {
        description:
          "Q–Q reference line: line through sample/theoretical quartile match, spanning the theoretical range of the Q–Q cloud. Requires aes.sample.",
      }),
      stat: Type.Optional(
        Type.Literal("qq_line", {
          description: "Q–Q line slope/intercept from quartile match (default for this geom).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "qq_line layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("QqLineParams")),
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "A Q–Q reference line layer. Requires the sample channel.",
    },
  ),

  ContourLayer: Type.Object(
    {
      geom: Type.Literal("contour", {
        description:
          "Contour geometry: isolines of a continuous z surface over a regular x×y grid. v1 draws open path polylines only (not filled bands).",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "A contour isoline layer. Requires continuous x, y, and z on a regular complete grid. Levels from params.breaks, binwidth, or bins (default 10).",
    },
  ),

  ViolinLayer: Type.Object(
    {
      geom: Type.Literal("violin", {
        description:
          "Violin geometry: mirrored kernel density of continuous y at each discrete x (stat ydensity). One polygon per x×group. Default position dodge.",
      }),
      stat: Type.Optional(
        Type.Literal("ydensity", {
          description: "Violin layers run a y-oriented KDE per x category and group.",
        }),
      ),
      position: Type.Optional(
        Type.Union([Type.Literal("dodge"), Type.Literal("identity")], {
          description: 'Position adjustment: "dodge" (default) or "identity".',
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
      params: Type.Optional(Type.Ref("ViolinParams")),
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description:
        "A violin layer. Requires discrete x and continuous y. Densities are computed by the ydensity stat.",
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
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "A boxplot layer. Requires a discrete x channel and a quantitative y channel.",
    },
  ),
};
