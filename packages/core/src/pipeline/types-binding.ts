/**
 * Layer binding contract: aes field resolution result for one layer.
 */
import type { LayerSpec } from "@ggsvelte/spec";

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

export type RuleForm = "annotation" | "vertical" | "horizontal";

export interface LayerBinding {
  layer: LayerSpec;
  index: number;
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
  color: ColorBinding;
  fill: ColorBinding;
  labelField: string | null;
  labelConstant: string | null;
  weightField: string | null;
  ruleForm: RuleForm | null;
}
