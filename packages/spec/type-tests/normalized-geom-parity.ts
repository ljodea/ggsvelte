/**
 * The post-normalize geom contract, checked by tsc (#1042).
 *
 * `tsc` is the only thing that can catch a pipeline switch missing a geom once
 * its silent `default:` arm is gone, so the union those switches narrow over
 * has to be pinned here rather than in a runtime test.
 */
import type { normalize } from "../src/normalize.js";
import type {
  AliasGeomName,
  GeomName,
  LayerSpec,
  NormalizedGeomName,
  NormalizedLayerSpec,
  NormalizedSpec,
  PortableSpec,
} from "../src/schema.js";

type Assert<Condition extends true> = Condition;
/** Mutual assignability, tuple-wrapped so a union never distributes. */
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Every alias is a real geom name, so excluding them cannot silently no-op. */
export type AliasesAreGeoms = Assert<AliasGeomName extends GeomName ? true : false>;

/** The pipeline union is the geom names minus the aliases — nothing else. */
export type NormalizedIsGeomsMinusAliases = Assert<
  Equal<NormalizedGeomName, Exclude<GeomName, AliasGeomName>>
>;

/** No alias survives into the layer union normalize() returns. */
export type NoAliasLayers = Assert<
  Equal<Extract<NormalizedLayerSpec, { geom: AliasGeomName }>, never>
>;
export type NoHistogramLayer = Assert<
  Equal<Extract<NormalizedLayerSpec, { geom: "histogram" }>, never>
>;
export type NoVlineLayer = Assert<Equal<Extract<NormalizedLayerSpec, { geom: "vline" }>, never>>;

/**
 * Real layers survive the Extract. `blank` earns its own check: it is the one
 * member wrapped in an extra Omit<> for its empty params bag, so it is where a
 * structural Extract would drop a layer without anyone noticing.
 */
export type BlankLayerSurvives = Assert<
  Extract<NormalizedLayerSpec, { geom: "blank" }> extends never ? false : true
>;
export type PointLayerSurvives = Assert<
  Extract<NormalizedLayerSpec, { geom: "point" }> extends never ? false : true
>;

/** The extracted union covers every non-alias geom, not just some of them. */
export type NormalizedLayersCoverEveryGeom = Assert<
  Equal<NormalizedLayerSpec["geom"], NormalizedGeomName>
>;

/** normalize() promises the narrow union; core keys its tables off that promise. */
export type NormalizeReturnsNormalizedSpec = Assert<
  Equal<ReturnType<typeof normalize>, NormalizedSpec>
>;
export type NormalizeLayerGeomIsNarrow = Assert<
  Equal<ReturnType<typeof normalize>["layers"][number]["geom"], NormalizedGeomName>
>;

/** Narrowing the return type must not stop callers passing it on as portable. */
export const staysPortable = (spec: NormalizedSpec): PortableSpec => spec;
export const staysALayer = (layer: NormalizedLayerSpec): LayerSpec => layer;
