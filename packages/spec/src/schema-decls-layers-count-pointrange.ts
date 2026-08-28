/**
 * `$defs` partial — statistical layer specs (CountLayer…PointrangeLayer).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";

export const LayersCountPointrangeDecls = {
  CountLayer: Type.Object(
    {
      geom: Type.Literal("count", {
        description:
          "Count geometry: point marks at unique (x, y) with size scaled by after_stat n (stat sum). Use for overplotting density on discrete or rounded coordinates.",
      }),
      stat: Type.Optional(
        Type.Literal("sum", {
          description:
            'Count layers run stat sum: n and prop per (group, x, y). size defaults to {"stat": "n"}.',
        }),
      ),
      position: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("jitter"), Type.Literal("nudge")], {
          description: 'Position: "identity" (default), "jitter", or "nudge".',
        }),
      ),
      positionParams: Type.Optional(Type.Ref("PositionParams")),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data.",
        }),
      ),
      params: Type.Optional(Type.Ref("PointParams")),
      inspect: Type.Optional(
        Type.Literal(false, {
          description:
            "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers (background bands, reference shading) whose marks would otherwise capture the pointer — an area mark contains the pointer everywhere it is painted, so it outranks every point and stroke beneath it. Portable: it travels with the spec, so headless renders and re-imported JSON agree.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "A count (overplotting) layer. Requires x and y. Default size is after_stat n.",
    },
  ),

  DotplotLayer: Type.Object(
    {
      geom: Type.Literal("dotplot", {
        description:
          "Dotplot geometry: stacked dots along a continuous x axis (histodot subset). Do not map aes.y — the bindot stat computes stack positions.",
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
        "A kernel-density layer. Requires a continuous x channel; y is computed by the density stat. Map fill (with alpha) for overlaid group comparisons.",
    },
  ),

  Density2dLayer: Type.Object(
    {
      geom: Type.Literal("density_2d", {
        description:
          "2D density geometry: bivariate KDE isolines over continuous x and y. Open path contours.",
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
        "A 2D density contour layer. Requires continuous x and y. Contours of estimated density (not a precomputed z grid).",
    },
  ),

  Density2dFilledLayer: Type.Object(
    {
      geom: Type.Literal("density_2d_filled", {
        description:
          "2D density filled bands: bivariate KDE closed isoline rings filled by density level. Open rings dropped. Defaults fill to after_stat(level).",
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
                "Compute y/ymin/ymax per x group from aes.y; default mean ± standard error.",
            }),
            Type.Literal("summary_bin", {
              description: "Bin continuous x and summarize y per (group × bin); default mean ± se.",
            }),
          ],
          {
            description:
              'The errorbar\'s stat: "identity" (default), "unique", "summary" (per x group), or "summary_bin" (per bin;).',
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
        "An errorbar layer. Identity: requires x, ymin, ymax. Summary / summary_bin: requires x and y (bounds from params.fun/funMin/funMax, default mean_se).",
    },
  ),

  LinerangeLayer: Type.Object(
    {
      geom: Type.Literal("linerange", {
        description: "Linerange geometry: a vertical stem from ymin to ymax without end caps.",
      }),
      stat: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("summary")], {
          description:
            "Identity (map ymin/ymax) or summary (mean_se from aes.y) — same contract as errorbar.",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Linerange layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(Type.Ref("DataRef")),
      params: Type.Optional(Type.Ref("LinerangeParams")),
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
        "A linerange layer. Identity: x, ymin, ymax. Summary: x, y. No caps (unlike errorbar).",
    },
  ),

  PointrangeLayer: Type.Object(
    {
      geom: Type.Literal("pointrange", {
        description: "Pointrange geometry: vertical stem from ymin to ymax plus a point at (x, y).",
      }),
      stat: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("summary")], {
          description:
            "Identity (map y, ymin, ymax) or summary (center + mean_se bounds from aes.y).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Pointrange layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(Type.Ref("DataRef")),
      params: Type.Optional(Type.Ref("PointrangeParams")),
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
        "A pointrange layer. Identity: x, y, ymin, ymax. Summary: x, y. Point size/shape via params or aes.",
    },
  ),
};
