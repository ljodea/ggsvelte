/**
 * Shared fixtures for pipeline scale-training characterization.
 */
import { ColumnTable } from "../../src/table.ts";
import { AUTO_POSITION_CONVERSION } from "../../src/pipeline/temporal-position.ts";
import type { LayerBinding, LayerFrame } from "../../src/pipeline/types.ts";

export const size = { width: 640, height: 400 };

export function emptyExtras(): Pick<
  LayerFrame,
  | "ymin"
  | "ymax"
  | "xmin"
  | "xmax"
  | "xend"
  | "yend"
  | "xendValues"
  | "yendValues"
  | "dodgeSlot"
  | "dodgeSlotCounts"
  | "offsetX"
  | "offsetY"
  | "box"
  | "smoothBand"
  | "xIntercepts"
  | "yIntercepts"
> {
  return {
    ymin: null,
    ymax: null,
    xmin: null,
    xmax: null,
    xend: null,
    yend: null,
    xendValues: null,
    yendValues: null,
    dodgeSlot: null,
    dodgeSlotCounts: null,
    offsetX: null,
    offsetY: null,
    box: null,
    smoothBand: false,
    xIntercepts: [],
    yIntercepts: [],
  };
}

export function pointFrame(table: ColumnTable): LayerFrame {
  const style = {
    field: null,
    statColumn: null,
    constant: null,
    scaledConstant: null,
  };
  const binding: LayerBinding = {
    layer: { geom: "point", aes: { x: { field: "x" }, y: { field: "y" } } },
    index: 0,
    xField: "x",
    yField: "y",
    yStatColumn: null,
    xConversion: AUTO_POSITION_CONVERSION,
    yConversion: AUTO_POSITION_CONVERSION,
    yminField: null,
    ymaxField: null,
    xminField: null,
    xmaxField: null,
    widthField: null,
    heightField: null,
    xendField: null,
    yendField: null,
    color: { field: null, constant: null, scaledConstant: null },
    fill: { field: null, constant: null, scaledConstant: null },
    size: style,
    linewidth: style,
    alpha: style,
    shape: style,
    linetype: style,
    labelField: null,
    labelConstant: null,
    weightField: null,
    ruleForm: null,
  };
  const groups = Array.from({ length: table.rowCount }, () => 0);
  return {
    binding,
    table,
    n: table.rowCount,
    xValues: null,
    xNumeric: table.numeric("x"),
    yNumeric: table.numeric("y"),
    groups,
    inputGroups: groups,
    rowIndex: Uint32Array.from({ length: table.rowCount }, (_, i) => i),
    colorValues: null,
    fillValues: null,
    labelValues: null,
    ...emptyExtras(),
  };
}
