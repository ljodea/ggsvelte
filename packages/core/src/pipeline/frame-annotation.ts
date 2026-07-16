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
    yNumeric: null,
    groups: [],
    rowIndex: new Uint32Array(0),
    colorValues: null,
    fillValues: null,
    labelValues: null,
    ...emptyFrameExtras(),
    xIntercepts: interceptList(params.xintercept),
    yIntercepts: interceptList(params.yintercept),
  };
}
