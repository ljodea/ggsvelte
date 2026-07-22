/**
 * Characterization lock for the schema facade: SpecModule re-root contract and
 * value exports used by the package barrel. Type-only exports are covered by
 * `bun run check` / type-tests, not runtime.
 */
import { describe, expect, it } from "bun:test";

import * as schema from "../src/schema.ts";

const VALUE_EXPORTS = [
  "AesSchema",
  "AreaLayerSchema",
  "BarLayerSchema",
  "BoxplotLayerSchema",
  "CATEGORICAL_SCHEME_NAMES",
  "CHANNELS",
  "COLOR_SCHEME_NAMES",
  "ChannelValueSchema",
  "ColLayerSchema",
  "CoordSpecSchema",
  "CoordTransformAxisSpecSchema",
  "CoordTransformSpecSchema",
  "CURRENT_EDITION",
  "DataRefSchema",
  "DensityLayerSchema",
  "ErrorbarLayerSchema",
  "RectLayerSchema",
  "TileLayerSchema",
  "RasterLayerSchema",
  "FacetSpecSchema",
  "GEOM_DEFAULTS",
  "HistogramLayerSchema",
  "KNOWN_GEOMS",
  "KNOWN_POSITIONS",
  "KNOWN_STATS",
  "LayerSpecSchema",
  "LineLayerSchema",
  "MAX_BINNED_BREAKS",
  "PlotSpecSchema",
  "PointLayerSchema",
  "RuleLayerSchema",
  "ScalesSchema",
  "SEQUENTIAL_SCHEME_NAMES",
  "TemporalParserSpecSchemaRef",
  "SmoothLayerSchema",
  "SpecModule",
  "TextLayerSchema",
  "THEME_NAMES",
] as const;

describe("schema facade surface", () => {
  it("exports every value re-exported by the package barrel", () => {
    for (const name of VALUE_EXPORTS) {
      expect(schema[name], name).toBeDefined();
    }
  });

  it("re-roots SpecModule.Import with shared $defs identity", () => {
    const plot = schema.SpecModule.Import("PlotSpec");
    const layer = schema.SpecModule.Import("LayerSpec");
    const scales = schema.SpecModule.Import("Scales");

    expect(plot.$ref).toBe("PlotSpec");
    expect(layer.$ref).toBe("LayerSpec");
    expect(scales.$ref).toBe("Scales");
    expect(plot.$defs).toBe(layer.$defs);
    expect(plot.$defs).toBe(scales.$defs);
    expect(plot.$defs).toBe(schema.PlotSpecSchema.$defs);
    expect(Object.keys(plot.$defs)).toContain("PlotSpec");
    expect(Object.keys(plot.$defs)).toContain("LayerSpec");
    expect(Object.keys(plot.$defs)).toContain("PositionScaleSpec");
  });

  it("keeps published Import schemas rooted at their def names", () => {
    expect(schema.PlotSpecSchema.$ref).toBe("PlotSpec");
    expect(schema.LayerSpecSchema.$ref).toBe("LayerSpec");
    expect(schema.AesSchema.$ref).toBe("Aes");
    expect(schema.ScalesSchema.$ref).toBe("Scales");
    expect(schema.CoordSpecSchema.$ref).toBe("CoordSpec");
    expect(schema.FacetSpecSchema.$ref).toBe("FacetSpec");
    expect(schema.DataRefSchema.$ref).toBe("DataRef");
    expect(schema.TemporalParserSpecSchemaRef.$ref).toBe("TemporalParserSpec");
  });
});
