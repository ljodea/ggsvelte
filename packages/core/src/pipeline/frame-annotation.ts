/**
 * Annotation-rule LayerFrame (intercept lists, zero data rows).
 */
import type { ColumnTable } from "../table.js";

import { emptyFrameExtras, interceptList } from "./frame-helpers.js";
import type { LayerBinding, LayerFrame } from "./types.js";

export function buildAnnotationFrame(binding: LayerBinding, table: ColumnTable): LayerFrame {
  const params = (binding.layer.params ?? {}) as { xintercept?: unknown; yintercept?: unknown };
  return {
    binding,
    table,
    n: 0,
    xValues: null,
    xNumeric: null,
    yValues: null,
    yNumeric: null,
    groups: [],
    inputGroups: [],
    inputSourceRows: null,
    rowIndex: new Uint32Array(0),
    colorValues: null,
    fillValues: null,
    sizeValues: null,
    linewidthValues: null,
    alphaValues: null,
    shapeValues: null,
    linetypeValues: null,
    labelValues: null,
    ...emptyFrameExtras(),
    xIntercepts: interceptList(params.xintercept),
    yIntercepts: interceptList(params.yintercept),
  };
}
