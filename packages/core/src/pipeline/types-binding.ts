/**
 * Layer binding contract: aes field resolution result for one layer.
 */
import type { LayerSpec } from "@ggsvelte/spec";

import type { CellValue } from "../table.js";

export interface ColorBinding {
  field: string | null;
  /** Literal (non-scaled) constant, if any. */
  constant: string | null;
  /** Scaled constant ({value, scale: true}), if any. */
  scaledConstant: CellValue | null;
}

export type RuleForm = "annotation" | "vertical" | "horizontal";

export interface LayerBinding {
  layer: LayerSpec;
  index: number;
  xField: string | null;
  yField: string | null;
  /** The stat-generated column the y channel maps ({ stat: ... }), if any. */
  yStatColumn: string | null;
  yminField: string | null;
  ymaxField: string | null;
  color: ColorBinding;
  fill: ColorBinding;
  labelField: string | null;
  labelConstant: string | null;
  weightField: string | null;
  ruleForm: RuleForm | null;
}
