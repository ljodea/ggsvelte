/**
 * Geom-children shell ledger + completeness helpers for
 * scripts/gen-geom-children.ts (#1039).
 *
 * Manifest-driven: component order matches the pre-generation index export
 * order (lifecycle.json is order-sensitive). Naming is derived
 * (snake_case → GeomPascal); the manifest asserts that derivation.
 *
 * Emission / FS generate stay in gen-geom-children.ts.
 */
import { KNOWN_GEOMS, type GeomName } from "@ggsvelte/spec";

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export type ShellKind = "default" | "jitter";

export interface ShellSpec {
  /** Wire geom name, e.g. "bin_2d". */
  geom: GeomName;
  /** PascalCase component name, e.g. "GeomBin2d". */
  component: string;
  /** Params type export, e.g. "HexParams". */
  paramsType: string;
  /** LayerInput type export, e.g. "HexLayerInput". */
  layerInput: string;
  /** Special shell template (jitter merges flat width/height/seed). */
  kind: ShellKind;
}

/** snake_case geom → PascalCase stem (LayerInput prefix without LayerInput). */
function pascalGeom(geom: string): string {
  return geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** snake_case geom → GeomPascalCase component name. */
export function componentNameForGeom(geom: string): string {
  return `Geom${pascalGeom(geom)}`;
}

/**
 * Params type name for each geom (must match SpecDeclarations layer refs).
 * histogram/freqpoly/count/jitter share another geom's params type.
 */
const PARAMS_TYPE: Record<GeomName, string> = {
  point: "PointParams",
  line: "LineParams",
  path: "PathParams",
  col: "ColParams",
  bar: "BarParams",
  histogram: "BarParams",
  freqpoly: "LineParams",
  area: "AreaParams",
  rule: "RuleParams",
  hline: "HlineParams",
  vline: "VlineParams",
  text: "TextParams",
  label: "LabelParams",
  smooth: "SmoothParams",
  quantile: "QuantileParams",
  boxplot: "BoxplotParams",
  density: "DensityParams",
  errorbar: "ErrorbarParams",
  linerange: "LinerangeParams",
  pointrange: "PointrangeParams",
  crossbar: "CrossbarParams",
  rect: "RectParams",
  tile: "TileParams",
  raster: "RasterParams",
  ribbon: "RibbonParams",
  segment: "SegmentParams",
  count: "PointParams",
  violin: "ViolinParams",
  function: "FunctionParams",
  polygon: "PolygonParams",
  hex: "HexParams",
  bin_2d: "Bin2dParams",
  abline: "AblineParams",
  curve: "CurveParams",
  contour: "ContourParams",
  density_2d: "Density2dParams",
  density_2d_filled: "Density2dParams",
  dotplot: "DotplotParams",
  map: "MapParams",
  sf: "SfParams",
  sf_text: "SfTextParams",
  sf_label: "SfLabelParams",
  blank: "BlankParams",
  jitter: "PointParams",
  spoke: "SpokeParams",
  rug: "RugParams",
  step: "StepParams",
  qq: "QqParams",
  qq_line: "QqLineParams",
};

/**
 * Export order matches the pre-#1039 index (lifecycle.json is order-sensitive).
 * Every KNOWN_GEOMS entry appears exactly once.
 */
const EXPORT_ORDER: readonly GeomName[] = [
  "point",
  "count",
  "contour",
  "dotplot",
  "line",
  "path",
  "col",
  "bar",
  "area",
  "rule",
  "hline",
  "vline",
  "jitter",
  "text",
  "label",
  "histogram",
  "freqpoly",
  "smooth",
  "quantile",
  "boxplot",
  "density",
  "density_2d",
  "density_2d_filled",
  "errorbar",
  "linerange",
  "pointrange",
  "crossbar",
  "rect",
  "tile",
  "bin_2d",
  "raster",
  "hex",
  "ribbon",
  "segment",
  "violin",
  "function",
  "polygon",
  "abline",
  "curve",
  "map",
  "sf",
  "sf_text",
  "sf_label",
  "blank",
  "spoke",
  "rug",
  "step",
  "qq",
  "qq_line",
];

function shell(geom: GeomName): ShellSpec {
  return {
    geom,
    component: componentNameForGeom(geom),
    paramsType: PARAMS_TYPE[geom],
    layerInput: `${pascalGeom(geom)}LayerInput`,
    kind: geom === "jitter" ? "jitter" : "default",
  };
}

export const SHELL_MANIFEST: readonly ShellSpec[] = EXPORT_ORDER.map((geom) => shell(geom));

// ---------------------------------------------------------------------------
// Completeness helpers (exported for tests)
// ---------------------------------------------------------------------------

export function manifestGeoms(): Set<string> {
  return new Set(SHELL_MANIFEST.map((s) => s.geom));
}

export function expectedGeoms(): Set<string> {
  return new Set(KNOWN_GEOMS);
}
