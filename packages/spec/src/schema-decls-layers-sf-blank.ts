/**
 * `$defs` partial — sf/blank layer specs (SfLayer…LayerSpec).
 * Composed by schema-declarations.ts via spread; key insertion order is load-bearing.
 */

import Type from "typebox";

export const LayersSfBlankDecls = {
  SfLayer: Type.Object(
    {
      geom: Type.Literal("sf", {
        description:
          "Simple-features geometry: already-projected GeoJSON Geometry JSON strings in a data column. Point/line/polygon families (incl. GeometryCollection of one family) with even-odd holes; use coord_sf for fixed-aspect (CRS reproject deferred).",
      }),
      stat: Type.Optional(
        Type.Literal("sf", {
          description: "Geometry expand: portable GeoJSON → drawable point/line/polygon parts.",
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
      description: "Parameters for geom_sf_text: geometry column plus text styling.",
    },
  ),

  SfTextLayer: Type.Object(
    {
      geom: Type.Literal("sf_text", {
        description:
          "Simple-features text labels: places aes.label at representative geometry points (Multi* → one label per part; stat_sf_coordinates).",
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
        "Parameters for geom_sf_label: geometry column, text styling, and label box chrome.",
    },
  ),

  SfLabelLayer: Type.Object(
    {
      geom: Type.Literal("sf_label", {
        description:
          "Simple-features labels with background boxes: places aes.label at representative geometry points with a measured rounded rect (Multi* → one label per part). color=ink+box stroke; fill=box background.",
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
          "Blank geometry: contributes mapped aesthetics to scale training and layout without drawing marks or hit targets. No channels are required; whatever is mapped trains its scale.",
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
        "An empty layer that trains scales from mapped aesthetics without emitting geometry.",
    },
  ),

  RugLayer: Type.Object(
    {
      geom: Type.Literal("rug", {
        description:
          "Rug geometry: short ticks along panel edges for each observation. Map aes.x for bottom/top sides and/or aes.y for left/right sides.",
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
        'A marginal rug layer. Default sides "bl" require both x and y; restrict sides when only one channel is mapped.',
    },
  ),

  SpokeLayer: Type.Object(
    {
      geom: Type.Literal("spoke", {
        description:
          "Spoke geometry: one finite segment per row from (x, y) in direction angle (radians) with length radius. Endpoints are derived as xend = x + radius·cos(angle), yend = y + radius·sin(angle) in data space, then transformed like x/y. Requires continuous x and y.",
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
      Type.Ref("LabelLayer"),
      Type.Ref("SmoothLayer"),
      Type.Ref("QuantileLayer"),
      Type.Ref("QqLayer"),
      Type.Ref("QqLineLayer"),
      Type.Ref("ContourLayer"),
      Type.Ref("BoxplotLayer"),
      Type.Ref("ViolinLayer"),
      Type.Ref("DensityLayer"),
      Type.Ref("Density2dLayer"),
      Type.Ref("Density2dFilledLayer"),
      Type.Ref("DotplotLayer"),
      Type.Ref("CountLayer"),
      Type.Ref("ErrorbarLayer"),
      Type.Ref("LinerangeLayer"),
      Type.Ref("PointrangeLayer"),
      Type.Ref("CrossbarLayer"),
      Type.Ref("MapLayer"),
      Type.Ref("RectLayer"),
      Type.Ref("TileLayer"),
      Type.Ref("Bin2dLayer"),
      Type.Ref("RasterLayer"),
      Type.Ref("HexLayer"),
      Type.Ref("SegmentLayer"),
      Type.Ref("FunctionLayer"),
      Type.Ref("PolygonLayer"),
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
};
