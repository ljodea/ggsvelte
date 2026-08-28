/**
 * `$defs` partial — point/path layer specs (PointLayer…PathLayer).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";

export const LayersPointPathDecls = {
  PointLayer: Type.Object(
    {
      geom: Type.Literal("point", {
        description:
          "Point geometry: one mark per data row. Use for scatter plots, dot plots, bubbles, and correlation views.",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default).",
            }),
            Type.Literal("unique", {
              description: "Drop duplicate rows on mapped aesthetics before drawing; first wins.",
            }),
            Type.Literal("summary_bin", {
              description: "Bin continuous x and summarize y per (group × bin); default mean ± se.",
            }),
            Type.Literal("summary_rolling", {
              description:
                "Centered rolling window over continuous x (params.window required, in x units); summarize y per (group, unique x). Partial windows at the ends are kept.",
            }),
            Type.Literal("manual", {
              description:
                "Portable named per-group transform (params.fun required: first|last|mean|median|min|max|sum;).",
            }),
            Type.Literal("sum", {
              description:
                'Aggregate coincident (x, y); size defaults to {stat: "n"} (geom_count).',
            }),
          ],
          {
            description:
              'Point stat: "identity" (default), "unique", "summary_bin", "summary_rolling", "manual", or "sum".',
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
        "A scatter/point layer. Requires x and y channels (inherited from plot aes or set in the layer's aes).",
    },
  ),

  LineLayer: Type.Object(
    {
      geom: Type.Literal("line", {
        description:
          "Line geometry: connects points in x order, one line per group (groups derive from discrete aesthetics such as color, or from aes.group). Use for time series, trends, and line charts. With stat ecdf, pair with step curves; with stat bin (freqpoly alias), y is computed from counts/density; with stat connect, successive points expand into connection vertices.",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default — map aes.y).",
            }),
            Type.Literal("unique", {
              description: "Drop duplicate rows on mapped aesthetics before drawing (first wins;).",
            }),
            Type.Literal("bin", {
              description:
                'Continuous x binned; the canonical form of geom freqpoly. Do NOT map aes.y to a field; y defaults to {"stat": "count"}.',
            }),
            Type.Literal("align", {
              description:
                "Interpolate each group onto the union of finite x values so continuous-x stack/fill aligns. Outside a group's x range y is 0.",
            }),
            Type.Literal("connect", {
              description:
                "Expand successive points into connection vertices (params.connection: hv|vh|mid|linear;). Expands in x order; geometry does not re-sort after connect.",
            }),
            Type.Literal("summary_bin", {
              description:
                "Bin continuous x and summarize y per (group × bin); default mean ± se; connect centers in x order.",
            }),
            Type.Literal("summary_rolling", {
              description:
                "Centered rolling window over continuous x (params.window required, in x units); summarize y per (group, unique x) and connect in x order. Partial windows at the ends are kept — a running line reaches both ends of the data.",
            }),
            Type.Literal("manual", {
              description:
                "Portable named per-group transform (params.fun required: first|last|mean|median|min|max|sum;).",
            }),
            Type.Literal("ecdf", {
              description:
                'Empirical CDF of x; y defaults to {"stat": "ecdf"} — do NOT map aes.y to a field. Prefer params.curve "step-hv" for ECDF stairs.',
            }),
          ],
          {
            description:
              'Line stat: "identity" (default), "unique", "bin", "align", "connect", "summary_bin", "summary_rolling", "manual", or "ecdf".',
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
        "A line layer. Identity: requires x and y. Bin (freqpoly): requires continuous x; y is computed by the bin stat. Ecdf: requires x only (y is computed). Rows are sorted by x within each group before connecting.",
    },
  ),

  StepLayer: Type.Object(
    {
      geom: Type.Literal("step", {
        description:
          "Step-line geometry: connect points with hv/vh/mid stairs. Same channels as line; ordered by x within groups.",
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
        "A step-line layer. Requires x and y. params.direction is hv (default), vh, or mid.",
    },
  ),

  PathLayer: Type.Object(
    {
      geom: Type.Literal("path", {
        description:
          "Path geometry: connects points in data (row) order within each group — unlike line, which sorts by x. Use for trajectories, loops, connected scatterplots, and ellipse rings (stat ellipse). With stat connect, successive points expand into connection vertices.",
      }),
      stat: Type.Optional(
        Type.Union(
          [
            Type.Literal("identity", {
              description: "Draw each data row as-is (default).",
            }),
            Type.Literal("unique", {
              description: "Drop duplicate rows on mapped aesthetics before drawing (first wins;).",
            }),
            Type.Literal("connect", {
              description:
                "Expand successive points into connection vertices (params.connection: hv|vh|mid|linear; default hv;). stat_connect default geom is path.",
            }),
            Type.Literal("manual", {
              description:
                "Portable named per-group transform (params.fun required: first|last|mean|median|min|max|sum;).",
            }),
            Type.Literal("ellipse", {
              description:
                "Bivariate normal confidence ellipse per group. Emits perimeter samples suitable for path; requires quantitative x and y.",
            }),
          ],
          {
            description:
              'Path stat: "identity" (default), "unique", "connect", "manual", or "ellipse".',
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
        "A path layer. Identity/connect/manual: requires x and y; rows stay in data order. Ellipse: quantitative x and y; one closed ring per group.",
    },
  ),
};
