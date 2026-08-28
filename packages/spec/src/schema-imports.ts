/**
 * Named-defs module surface (public).
 * `.Import(key)` returns a Cyclic schema rooted at `key` (`$defs` + `$ref`),
 * matching the TypeBox 0.x Module.Import JSON shape used by the artifact
 * emitter and by Value.Check / Value.Errors.
 *
 * Type inference uses `Static<>` on `SpecDeclarations` (not Cyclic Import):
 * Cyclic's Static<> collapses large graphs to `never` under TypeScript 6.
 * We avoid `Type.Module(SpecDeclarations)` for Static extraction — the Module
 * surface hits TS7056 on composite .d.ts emit once geom unions grow large.
 *
 * Build the `$defs` graph once (rooted at PlotSpec) and re-root by swapping
 * `$ref` — Type.Cyclic(decls, key) per import would rebuild the full graph
 * ~20× at module load. The re-root trick is load-bearing as a unit: the root
 * graph, the re-root helper, `SpecModule`, and every `SpecModule.Import`
 * constant share one `$defs` bag and stay together here (`schema-types.ts`
 * is type-level only).
 */
import Type, { type TSchema } from "typebox";

import { SpecDeclarations } from "./schema-declarations.js";

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
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- preserves TypeBox 0.x instantiation-expression compatibility
  Import<Key extends keyof typeof SpecDeclarations>(key: Key): SpecImportSchema {
    return reRootSpec(key);
  },
};

// ---------------------------------------------------------------------------
// Imported (validatable) schemas — Cyclic `$defs`+`$ref` for runtime/artifact
// ---------------------------------------------------------------------------

export const PlotSpecSchema = SpecModule.Import("PlotSpec");
export const LayerSpecSchema = SpecModule.Import("LayerSpec");
export const PointLayerSchema = SpecModule.Import("PointLayer");
export const LineLayerSchema = SpecModule.Import("LineLayer");
export const PathLayerSchema = SpecModule.Import("PathLayer");
export const ColLayerSchema = SpecModule.Import("ColLayer");
export const BarLayerSchema = SpecModule.Import("BarLayer");
export const HistogramLayerSchema = SpecModule.Import("HistogramLayer");
export const FreqpolyLayerSchema = SpecModule.Import("FreqpolyLayer");
export const AreaLayerSchema = SpecModule.Import("AreaLayer");
export const RibbonLayerSchema = SpecModule.Import("RibbonLayer");
export const SegmentLayerSchema = SpecModule.Import("SegmentLayer");
export const CountLayerSchema = SpecModule.Import("CountLayer");
export const ViolinLayerSchema = SpecModule.Import("ViolinLayer");
export const FunctionLayerSchema = SpecModule.Import("FunctionLayer");
export const PolygonLayerSchema = SpecModule.Import("PolygonLayer");
export const AblineLayerSchema = SpecModule.Import("AblineLayer");
export const CurveLayerSchema = SpecModule.Import("CurveLayer");
export const MapLayerSchema = SpecModule.Import("MapLayer");
export const BlankLayerSchema = SpecModule.Import("BlankLayer");
export const SfLayerSchema = SpecModule.Import("SfLayer");
export const SfTextLayerSchema = SpecModule.Import("SfTextLayer");
export const SfLabelLayerSchema = SpecModule.Import("SfLabelLayer");

export const SpokeLayerSchema = SpecModule.Import("SpokeLayer");
export const RugLayerSchema = SpecModule.Import("RugLayer");
export const StepLayerSchema = SpecModule.Import("StepLayer");
export const QqLayerSchema = SpecModule.Import("QqLayer");
export const QqLineLayerSchema = SpecModule.Import("QqLineLayer");
export const RuleLayerSchema = SpecModule.Import("RuleLayer");
export const HlineLayerSchema = SpecModule.Import("HlineLayer");
export const VlineLayerSchema = SpecModule.Import("VlineLayer");
export const JitterLayerSchema = SpecModule.Import("JitterLayer");
export const TextLayerSchema = SpecModule.Import("TextLayer");
export const LabelLayerSchema = SpecModule.Import("LabelLayer");
export const SmoothLayerSchema = SpecModule.Import("SmoothLayer");
export const QuantileLayerSchema = SpecModule.Import("QuantileLayer");
export const ContourLayerSchema = SpecModule.Import("ContourLayer");
export const BoxplotLayerSchema = SpecModule.Import("BoxplotLayer");
export const DensityLayerSchema = SpecModule.Import("DensityLayer");
export const Density2dLayerSchema = SpecModule.Import("Density2dLayer");
export const Density2dFilledLayerSchema = SpecModule.Import("Density2dFilledLayer");
export const DotplotLayerSchema = SpecModule.Import("DotplotLayer");
export const ErrorbarLayerSchema = SpecModule.Import("ErrorbarLayer");
export const LinerangeLayerSchema = SpecModule.Import("LinerangeLayer");
export const PointrangeLayerSchema = SpecModule.Import("PointrangeLayer");
export const CrossbarLayerSchema = SpecModule.Import("CrossbarLayer");
export const RectLayerSchema = SpecModule.Import("RectLayer");
export const TileLayerSchema = SpecModule.Import("TileLayer");
export const Bin2dLayerSchema = SpecModule.Import("Bin2dLayer");
export const RasterLayerSchema = SpecModule.Import("RasterLayer");
export const HexLayerSchema = SpecModule.Import("HexLayer");
export const AesSchema = SpecModule.Import("Aes");
export const ChannelValueSchema = SpecModule.Import("ChannelValue");
export const DataRefSchema = SpecModule.Import("DataRef");
export const ScalesSchema = SpecModule.Import("Scales");
export const TemporalParserSpecSchemaRef = SpecModule.Import("TemporalParserSpec");
export const FacetFieldRefSchema = SpecModule.Import("FacetFieldRef");
export const FacetStripSpecSchema = SpecModule.Import("FacetStripSpec");
export const FacetSpecSchema = SpecModule.Import("FacetSpec");
export const CoordTransformAxisSpecSchema = SpecModule.Import("CoordTransformAxisSpec");
export const CoordTransformSpecSchema = SpecModule.Import("CoordTransformSpec");
export const CoordFixedSpecSchema = SpecModule.Import("CoordFixedSpec");
export const CoordSfSpecSchema = SpecModule.Import("CoordSfSpec");
export const CoordRadialSpecSchema = SpecModule.Import("CoordRadialSpec");
export const CoordSpecSchema = SpecModule.Import("CoordSpec");
