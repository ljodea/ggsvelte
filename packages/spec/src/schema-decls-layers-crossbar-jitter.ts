/**
 * `$defs` partial — rect/annotation layer specs (CrossbarLayer…JitterLayer).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";

export const LayersCrossbarJitterDecls = {
  CrossbarLayer: Type.Object(
    {
      geom: Type.Literal("crossbar", {
        description:
          "Crossbar geometry: a vertical interval box from ymin to ymax with a mid horizontal line at y.",
      }),
      stat: Type.Optional(
        Type.Union([Type.Literal("identity"), Type.Literal("summary")], {
          description:
            "Identity (map y, ymin, ymax) or summary (center + mean_se bounds from aes.y).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "Crossbar layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(Type.Ref("DataRef")),
      params: Type.Optional(Type.Ref("CrossbarParams")),
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
        "A crossbar layer. Identity: x, y, ymin, ymax. Box width uses the same resolution rule as errorbar caps. Mid-line linewidth = linewidth * fatten.",
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
        "A tile layer. Requires x and y channels; optional width/height (params or aes) size each cell after position transform.",
    },
  ),

  Bin2dLayer: Type.Object(
    {
      geom: Type.Literal("bin_2d", {
        description:
          "2D rectangular bin heatmap: partitions continuous x×y into a grid and maps fill to bin count by default. Empty bins are dropped unless params.drop is false.",
      }),
      stat: Type.Optional(
        Type.Literal("bin_2d", {
          description: "2D binning stat (default for this geom).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "bin_2d layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("Bin2dParams")),
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
        "A 2D bin heatmap layer. Requires continuous x and y; fill defaults to after_stat count.",
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
        "A raster layer. Requires x and y (regular spacing); fill maps cell color. No stroke. interpolate must be false when set.",
    },
  ),

  HexLayer: Type.Object(
    {
      geom: Type.Literal("hex", {
        description:
          "Hexagonal bin heatmap: partitions continuous x×y into a hexagonal lattice and maps fill to bin count by default.",
      }),
      stat: Type.Optional(
        Type.Literal("bin_hex", {
          description: "Hexagonal binning stat (default for this geom).",
        }),
      ),
      position: Type.Optional(
        Type.Literal("identity", { description: "hex layers use identity positioning." }),
      ),
      render: Type.Optional(Type.Ref("RenderBackend")),
      aes: Type.Optional(Type.Ref("Aes")),
      data: Type.Optional(
        Type.Ref("DataRef", {
          description:
            "Optional layer-local data. When omitted, the layer inherits plot-level data. When present, it may use inline rows, inline columns, or a named dataset (spec.datasets or runtime).",
        }),
      ),
      params: Type.Optional(Type.Ref("HexParams")),
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
        "A hexagonal bin heatmap layer. Requires continuous x and y; fill defaults to after_stat count.",
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
              description:
                "Draw each data row as-is (default). Under position stack/fill, a group whose continuous x samples skip an interior grid point auto-aligns onto the shared x grid (align semantics: interpolate between observed samples, zero outside the group's range) with a stack-align-applied advisory, so sparse groups cannot render as floating bands.",
            }),
            Type.Literal("unique", {
              description: "Drop duplicate rows on mapped aesthetics before drawing (first wins).",
            }),
            Type.Literal("align", {
              description:
                "Interpolate each group onto the union of finite x values so continuous-x stack/fill aligns. Outside a group's x range y is 0.",
            }),
          ],
          {
            description:
              'Area stat: "identity" (default; sparse stacked groups auto-align), "unique" (first-wins dedupe), or "align" (shared x grid with interpolation).',
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
        'An area layer. Requires x and y channels; rows are sorted by x within each group. Default position "stack". Stacked groups whose continuous x samples leave interior holes auto-align onto the shared x grid; pre-fill the data to control every cell.',
    },
  ),

  RibbonLayer: Type.Object(
    {
      geom: Type.Literal("ribbon", {
        description:
          "Ribbon geometry: a filled interval between two varying boundaries along a running coordinate. Map x+ymin+ymax (x orientation) or y+xmin+xmax (y orientation). Not a zero-baseline area.",
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
        "A ribbon layer. Requires a running coordinate and both interval bounds (x+ymin+ymax or y+xmin+xmax). Rows are sorted along the running coordinate within each group.",
    },
  ),

  RuleLayer: Type.Object(
    {
      geom: Type.Literal("rule", {
        description:
          "Rule geometry: reference lines spanning the panel. Two forms: (1) annotation — set params.xintercept and/or params.yintercept to fixed data values and map neither aes.x nor aes.y; (2) data-driven — map exactly one of aes.x (vertical rules) or aes.y (horizontal rules) to a field. Never mix the forms in one layer.",
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
        "A reference-line layer. Annotation form: fixed intercepts in params. Data-driven form: map aes.x OR aes.y.",
    },
  ),

  HlineLayer: Type.Object(
    {
      geom: Type.Literal("hline", {
        description:
          "Horizontal reference-line alias. Canonicalized by normalize() to a rule layer. Annotation form: set params.yintercept. Data-driven form: map aes.y (inherited plot x is dropped so the one-axis rule contract holds).",
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
        "A horizontal reference-line layer alias (normalize() → rule). Annotation: params.yintercept. Data-driven: map aes.y.",
    },
  ),

  VlineLayer: Type.Object(
    {
      geom: Type.Literal("vline", {
        description:
          "Vertical reference-line alias. Canonicalized by normalize() to a rule layer. Annotation form: set params.xintercept. Data-driven form: map aes.x (inherited plot y is dropped so the one-axis rule contract holds).",
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
        "A vertical reference-line layer alias (normalize() → rule). Annotation: params.xintercept. Data-driven: map aes.x.",
    },
  ),

  JitterLayer: Type.Object(
    {
      geom: Type.Literal("jitter", {
        description:
          "Jittered point alias. Canonicalized by normalize() to a point layer with position jitter. Configure jitter amount via positionParams.width/height/seed.",
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
        'A scatter layer with position "jitter" (alias; normalize() → point). Requires x and y channels. Jitter width/height/seed live on positionParams.',
    },
  ),
};
