/**
 * Layer binding contract: aes field resolution result for one layer.
 */
import type { LayerSpec, TemporalParserSpec } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";
import type { ColumnTransformConfig } from "../scales/transform.js";

import type { BinnedBoundaries } from "./binned-scale.js";
import type { PositionConversionContext } from "./temporal-position.js";

export interface ColorBinding {
  field: string | null;
  /** Literal (non-scaled) constant, if any. */
  constant: string | null;
  /** Scaled constant ({value, scale: true}), if any. */
  scaledConstant: CellValue | null;
  /** Explicit ordinal scale override for grouping semantics. */
  forcedDiscrete?: boolean;
}

export interface StyleBinding {
  field: string | null;
  /** Stat-generated column mapped with { stat }. */
  statColumn: string | null;
  /** Literal (non-scaled) constant, if any. */
  constant: CellValue | null;
  /** Scaled constant ({ value, scale: true }), if any. */
  scaledConstant: CellValue | null;
  /** Explicit discrete family override for grouping semantics. */
  forcedDiscrete?: boolean;
  forcedContinuous?: boolean;
  /** Binned family groups on bin ids, not raw numeric values. */
  binned?: boolean;
  binBreaks?: readonly CellValue[];
  binDomain?: readonly CellValue[];
  /**
   * Global semantic [low, high] captured before faceting, used as the default
   * bin extent so panel-local grouping matches the globally-trained style scale
   * when neither binDomain nor binBreaks is authored.
   */
  binExtent?: readonly [number, number];
  binCount?: number;
  binTemporal?: boolean;
  binParse?: TemporalParserSpec;
  binTimezone?: string;
  binDisambiguation?: "compatible" | "earlier" | "later" | "reject";
  binOob?: "censor" | "squish";
}

export type RuleForm = "annotation" | "vertical" | "horizontal";

export interface LayerBinding {
  layer: LayerSpec;
  index: number;
  /**
   * Unfiltered source table this layer owns (plot inheritance or layer DataRef).
   * Used for style/color catalogs and temporal preflight (#589).
   */
  sourceTable: import("../table.js").ColumnTable;
  /** SourceRegistry id for this layer's sourceTable (global row namespace). */
  sourceId: number;
  xField: string | null;
  yField: string | null;
  /** The stat-generated column the y channel maps ({ stat: ... }), if any. */
  yStatColumn: string | null;
  /** Parser/timezone semantics for every x position read. */
  xConversion: PositionConversionContext;
  /** Parser/timezone semantics for y, ymin, and ymax position reads. */
  yConversion: PositionConversionContext;
  /** Pre-stat x transform (OOB/NA/forward); undefined = read semantic (identity). */
  xTransform?: ColumnTransformConfig | undefined;
  /** Pre-stat y transform (OOB/NA/forward); undefined = read semantic (identity). */
  yTransform?: ColumnTransformConfig | undefined;
  /** type: "binned" x boundaries (transformed space); undefined = not binned. */
  xBinning?: BinnedBoundaries | undefined;
  /** type: "binned" y boundaries (transformed space); undefined = not binned. */
  yBinning?: BinnedBoundaries | undefined;
  yminField: string | null;
  ymaxField: string | null;
  /** Left edge field (geom rect); null when unused. */
  xminField: string | null;
  /** Right edge field (geom rect); null when unused. */
  xmaxField: string | null;
  /** Tile width field (optional); null when unused or constant via params. */
  widthField: string | null;
  /** Tile height field (optional); null when unused or constant via params. */
  heightField: string | null;
  /** Segment end x field; null when unused. */
  xendField: string | null;
  /** Segment end y field; null when unused. */
  yendField: string | null;
  /** Ribbon only: resolved running-coordinate orientation. */
  ribbonOrientation?: "x" | "y";
  color: ColorBinding;
  fill: ColorBinding;
  size: StyleBinding;
  linewidth: StyleBinding;
  alpha: StyleBinding;
  shape: StyleBinding;
  linetype: StyleBinding;
  labelField: string | null;
  labelConstant: string | null;
  weightField: string | null;
  ruleForm: RuleForm | null;
}
