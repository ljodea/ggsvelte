/**
 * Scene + GeometryBatch — the renderer-facing output of the pipeline.
 *
 * Geometry is typed-array-friendly: Float32Array positions in PANEL-LOCAL
 * pixel coordinates, Uint32Array rowIndex back-references. M1 batch kinds:
 * points, paths (lines + filled areas), rects (bars/cols), segments (rules),
 * glyphs (text) — five of the plan's six-kind roster (arcs arrive with polar).
 *
 * Colors: `null` styling values mean "theme default" — renderers substitute
 * the theme role (ink for strokes/points/text, accent for fills) wrapped in
 * its --gg-* custom property. Data-mapped colors are literal color strings.
 *
 * NON-CONTRACTUAL pre-1.0 (Hadley lesson 7): Scene/GeometryBatch shapes are
 * internal plumbing between the pipeline and the two renderers; the public
 * contract is PortableSpec + the documented entry points.
 *
 * @internal
 */
import type { Linetype, PointShape } from "./scales/style.js";
import type { CellValue } from "./table.js";
import type { ThemeTokens } from "./theme.js";

// Interaction identity boundary (keep in sync with the implementation plan):
// source/spec -> pipeline geometry + interned lineage -> Scene + CandidateStore
// -> compact candidate ids -> semantic resolver -> reducer/presentation/events.

export interface PointsBatch {
  kind: "points";
  /** Index of the source layer in the normalized spec. */
  layerIndex: number;
  /** Index into Scene.panels (facet panel that owns this batch). */
  panelIndex: number;
  /** Interleaved x,y pairs, panel-local px. */
  positions: Float32Array;
  /** Source row per mark. */
  rowIndex: Uint32Array;
  /** Point radius in px. */
  size: number;
  /** Per-mark radii when aes.size is mapped; omitted keeps the scalar fast path. */
  sizes?: Float32Array;
  alpha: number;
  /** Per-mark opacity when aes.alpha is mapped. */
  alphas?: Float32Array;
  shape: PointShape;
  /** Canonical POINT_SHAPE_NAMES indexes when aes.shape is mapped. */
  shapeIndexes?: Uint8Array;
  /** Constant color, or null when `colors` carries per-mark values. */
  fill: string | null;
  /** Per-mark resolved colors (when the color channel is data-mapped). */
  colors?: string[];
}

export interface PathsBatch {
  kind: "paths";
  layerIndex: number;
  /** Index into Scene.panels. */
  panelIndex: number;
  /** Interleaved x,y pairs for all subpaths, panel-local px. */
  positions: Float32Array;
  /** Source row per render vertex (synthetic vertices inherit an adjacent row). */
  rowIndex: Uint32Array;
  /** Frame row per semantic vertex when render subpaths split one statistical group. */
  frameRowIndex?: Uint32Array;
  /**
   * Optional render-vertex mask: 1 for original/stat semantic anchors, 0 for
   * coordinate-tessellation vertices. CandidateStore ignores zero entries.
   */
  semanticAnchors?: Uint8Array;
  /** Original/stat primitive index for each render vertex. Candidate datum
   * resolution uses this instead of synthetic render topology indexes. */
  semanticIndex?: Uint32Array;
  /**
   * Closed ribbons only: frame-row id per **pre-projection** semantic vertex
   * (upper ascending, then lower descending). Matches emitted vertices after
   * non-finite edge filtering so coord `semanticIndex` maps to the correct
   * frame row (#502). Length = pre-projection vertex count.
   */
  closedFrameRows?: Uint32Array;
  /** Start offset (in points) of each subpath; length = subpathCount + 1. */
  pathOffsets: Uint32Array;
  /** Stroke color per subpath (null = theme ink). */
  strokes: (string | null)[];
  /** Fill color per subpath (area polygons; null entries = theme accent).
   *  Omitted entirely for pure line batches. */
  fills?: (string | null)[];
  /** Close each subpath (area polygons). */
  closed?: boolean;
  linewidth: number;
  linewidths?: Float32Array;
  alpha: number;
  alphas?: Float32Array;
  linetype?: Linetype;
  linetypeIndexes?: Uint8Array;
  /** Stroke line cap (ribbon outlines; default renderer round when omitted). */
  linecap?: "butt" | "round" | "square";
  /** Stroke line join (ribbon outlines; default renderer round when omitted). */
  linejoin?: "miter" | "round" | "bevel";
  /**
   * When false, candidate construction skips this batch (presentation-only
   * outline edges of a composite mark). Default true / omitted = candidates.
   */
  candidates?: boolean;
  curve: "linear" | "step";
}

export interface RectsBatch {
  kind: "rects";
  layerIndex: number;
  /** Index into Scene.panels. */
  panelIndex: number;
  /** x, y, width, height per rect (panel-local px, y = top edge). */
  rects: Float32Array;
  /** Source row per rect. */
  rowIndex: Uint32Array;
  /** Constant fill, or null when `fills` carries per-rect values
   *  (null = the theme role in `fillRole`). */
  fill: string | null;
  /** Per-rect resolved fills (when the fill/color channel is data-mapped). */
  fills?: string[];
  /** Theme role used when fill is null (default "accent"; boxplot boxes
   *  use "paper" so unmapped boxes render hollow-looking). */
  fillRole?: "accent" | "paper";
  /** Outline stroke: a color string, or null for theme ink. Omitted =
   *  no outline (bars/cols — decision 0008 note 7). */
  stroke?: string | null;
  /** Per-rect outline colors when aes.color is data-mapped (rect/tile). */
  strokes?: string[];
  /** Outline width in px (only with `stroke` / `strokes`). */
  strokeWidth?: number;
  strokeWidths?: Float32Array;
  /** Constant outline linetype (boxplot boxes; omitted = solid). */
  linetype?: Linetype;
  /** Per-rect outline linetype indexes when aes.linetype is mapped. */
  linetypeIndexes?: Uint8Array;
  alpha: number;
  alphas?: Float32Array;
  /**
   * Candidate/tooltip anchor: top-center (default, bars/boxplot) or geometric
   * center (rect/tile/raster).
   */
  anchor?: "top-center" | "center";
}

export interface SegmentsBatch {
  kind: "segments";
  layerIndex: number;
  /** Index into Scene.panels. */
  panelIndex: number;
  /** x1, y1, x2, y2 per segment (panel-local px). */
  segments: Float32Array;
  /** Source row per segment (0xffffffff for annotation-form rules). */
  rowIndex: Uint32Array;
  /** Optional tessellated render topology for nonlinear coordinate transforms.
   * `renderPathOffsets[j..j+1]` owns segment j; semantic candidates remain
   * one-per-entry in `segments`. */
  renderPositions?: Float32Array;
  renderPathOffsets?: Uint32Array;
  /** Projected semantic midpoint anchor per segment. */
  anchorPositions?: Float32Array;
  /** Constant stroke, or null when `strokes` carries per-segment values
   *  (null = theme ink). */
  stroke: string | null;
  strokes?: string[];
  linewidth: number;
  linewidths?: Float32Array;
  alpha: number;
  alphas?: Float32Array;
  linetype?: Linetype;
  linetypeIndexes?: Uint8Array;
  /** Optional stroke linecap (segment geom). Undefined leaves renderer default / no attribute. */
  linecap?: "butt" | "round" | "square";
}

export interface GlyphsBatch {
  kind: "glyphs";
  layerIndex: number;
  /** Index into Scene.panels. */
  panelIndex: number;
  /** Anchor x,y per glyph (panel-local px, dx/dy already applied). */
  positions: Float32Array;
  rowIndex: Uint32Array;
  /** Text per glyph. */
  texts: string[];
  /** Constant color, or null when `colors` carries per-glyph values
   *  (null = theme ink). */
  color: string | null;
  colors?: string[];
  /** Font size in px. */
  size: number;
  sizes?: Float32Array;
  anchor: "start" | "middle" | "end";
  alpha: number;
  alphas?: Float32Array;
}

export type GeometryBatch = PointsBatch | PathsBatch | RectsBatch | SegmentsBatch | GlyphsBatch;

export interface SceneTick {
  /** Position along the axis, panel-local px. */
  pos: number;
  /** Semantic scale value (epoch milliseconds for temporal axes). */
  value: CellValue;
  label: string;
  /** Standalone accessible text; contextual visible labels may be shorter. */
  fullLabel: string;
  kind: "major" | "minor";
  /** Appearance-only visibility flags; semantic value/fullLabel remain intact. */
  showTick?: boolean;
  showLabel?: boolean;
  labelSize?: number;
  /** Wrapped label lines (band axis, mode "wrapped"). */
  lines?: string[];
  /** Rotation in degrees (band axis, mode "rotated"): -45 | -90. */
  angle?: number;
}

export interface SceneAxis {
  ticks: SceneTick[];
  /** Axis title ("" = none). */
  title: string;
  titleSize?: number;
  /** Title offset below the panel grid, px (derived from a multi-line/rotated
   * band label band; falls back to the fixed default when absent). */
  titleOffset?: number;
}

export interface ScenePanel {
  /** Structured, typed identity derived from facet field/value identity. */
  identity: import("./facet-identity.js").FacetPanelIdentity;
  /** Stable key alias for `identity.key`, retained for interaction compatibility. */
  id: string;
  /** Panel origin/size in plot px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Facet strip display label ("" = unfaceted / no label). */
  strip: string;
  /**
   * Where the strip band is reserved and drawn (default "top" when faceted).
   * Left/right bands use `stripBand` as width; top/bottom as height.
   */
  stripPosition?: "top" | "bottom" | "left" | "right";
  /** Whether strip chrome is drawn (false when `strip.show: false`). */
  showStrip?: boolean;
  /** Reserved strip band size in px (0 when hidden). */
  stripBand?: number;
  /** Original panel allocation before a fixed-aspect data rectangle was fitted. */
  allocation?: { x: number; y: number; width: number; height: number };
  /** Whether renderers clip marks to this panel rectangle (default true). */
  clip?: boolean;
  /** Bottom-axis ticks for THIS panel (null = this panel draws no x axis:
   *  fixed facet scales show the axis on the bottom row only). */
  axisX: SceneTick[] | null;
  /** Left-axis ticks for this panel (null = no y axis on this panel). */
  axisY: SceneTick[] | null;
  /** Major/minor grid line positions (panel-local px; drawn on EVERY panel). */
  grid: { x: number[]; y: number[]; minorX: number[]; minorY: number[] };
}

/** Facet strip band height in px (drawn above each faceted panel). */
export const STRIP_BAND = 18;
/** Gap between facet panels in px. */
export const PANEL_SPACING = 8;

/** One discrete legend entry (swatch + label), legend-local coordinates. */
export interface SceneLegendEntry {
  /** Raw domain value, retained separately from its formatted label. */
  value: unknown;
  label: string;
  /** Complete semantic label when `label` is visually abbreviated. */
  fullLabel?: string;
  /** Visual lines when collision policy wraps without changing the semantic label. */
  lines?: string[];
  /** Measured line box used to position wrapped labels. */
  lineHeight?: number;
  color: string;
  /** True when a paint aesthetic supplied `color`, including literal sentinel-gray values. */
  hasPaint?: boolean;
  size?: number;
  linewidth?: number;
  alpha?: number;
  shape?: PointShape;
  linetype?: Linetype;
  /** Left/top of the entry row, legend-local px. */
  x?: number;
  y: number;
  /** Measured row height, including wrapped labels and oversized keys. */
  height?: number;
}

type SceneLegendScale = "color" | "fill" | "size" | "linewidth" | "alpha" | "shape" | "linetype";

/** A discrete (swatch list) legend. */
export interface SceneDiscreteLegend {
  type: "discrete";
  /** Primary aesthetic used for stable interaction identity. */
  scale: SceneLegendScale;
  /** Every aesthetic represented by a merged key. */
  aesthetics?: readonly SceneLegendScale[];
  position?: "right" | "bottom";
  direction?: "vertical" | "horizontal";
  titleSize?: number;
  /** Measured title band height, including descender gap. */
  titleHeight?: number;
  labelSize?: number;
  keyGap?: number;
  /** False when entries are representative ticks/bins rather than raw value identities. */
  interactive?: boolean;
  title: string;
  /** Legend box origin in plot px. */
  x: number;
  y: number;
  width: number;
  height: number;
  entries: SceneLegendEntry[];
  /** Swatch edge length in px. */
  swatchSize: number;
}

/** A continuous (gradient ramp) legend. */
export interface SceneRampLegend {
  type: "ramp";
  scale: string;
  aesthetics?: readonly string[];
  position?: "right" | "bottom";
  direction?: "vertical" | "horizontal";
  titleSize?: number;
  /** Measured title band height, including descender gap. */
  titleHeight?: number;
  labelSize?: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Gradient stops in rendered direction: horizontal low→high, vertical high→low. */
  stops: [number, string][];
  /** Whether renderer tick marks are visible independently of labels. */
  showTicks?: boolean;
  /** Labeled positions along the ramp's primary direction. */
  ticks: { pos?: number; y?: number; label: string; fullLabel?: string }[];
  /** Horizontal ramp inset reserved for the leading endpoint label. */
  rampX?: number;
  /** Ramp bar size in px. */
  rampWidth: number;
  rampHeight: number;
}

export interface SceneStepsLegend {
  type: "steps";
  scale: string;
  aesthetics?: readonly string[];
  position?: "right" | "bottom";
  direction?: "vertical" | "horizontal";
  titleSize?: number;
  /** Measured title band height, including descender gap. */
  titleHeight?: number;
  labelSize?: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  entries: { label: string; fullLabel?: string; color: string; x?: number; y: number }[];
  stepWidth: number;
  stepHeight: number;
}

export type SceneLegend = SceneDiscreteLegend | SceneRampLegend | SceneStepsLegend;

export interface Scene {
  width: number;
  height: number;
  /** Facet panels in row-major order (one panel when unfaceted). */
  panels: ScenePanel[];
  /** Declared responsive layout state; absent means the normal layout. */
  layout?: "degraded";
  batches: GeometryBatch[];
  /**
   * The shared-axis view: plot-level axis TITLES plus the ticks of the first
   * panel that draws each axis. Single-panel scenes read exactly like M1;
   * multi-panel renderers iterate panels[].axisX/axisY instead. Under
   * coord flip, `x` is whatever the BOTTOM axis displays (the y channel).
   */
  axes: { x: SceneAxis; y: SceneAxis };
  /** Panel-0 grid view (kept for single-panel compatibility; renderers use
   *  panels[].grid). */
  grid: { x: number[]; y: number[] };
  /** Legends, already placed by the layout (plot px). */
  legends: SceneLegend[];
  /** Resolved theme role tokens (renderers wrap them in --gg-* vars). */
  theme: ThemeTokens;
  title: string;
  subtitle: string;
  caption: string;
}
