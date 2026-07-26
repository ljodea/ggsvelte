/**
 * stat_manual → LayerFrame (#814 portable named registry).
 *
 * first/last: slice identity frame (real rowIndex).
 * aggregate funs: one synthetic row per group (NO_ROW); x/y aggregated in
 * transformed numeric space; discrete aesthetics from sample row.
 */
import type { CellValue, ColumnTable } from "../table.js";

import { isManualFun, isManualKeepFun, statManual, type ManualFunName } from "../stats/manual.js";
import { PipelineError } from "./types.js";
import { NO_ROW, type LayerBinding, type LayerFrame, type PipelineWarning } from "./types.js";
import { buildIdentityFrame } from "./frame-identity.js";
import { emptyFrameExtras } from "./frame-helpers.js";

function sliceCells(
  values: readonly CellValue[] | null,
  keep: readonly number[],
): readonly CellValue[] | null {
  if (values === null) return null;
  return keep.map((row) => values[row]!);
}

function sliceFloat(values: Float64Array | null, keep: readonly number[]): Float64Array | null {
  if (values === null) return null;
  const out = new Float64Array(keep.length);
  for (let i = 0; i < keep.length; i++) out[i] = values[keep[i]!]!;
  return out;
}

function sliceStyle(
  values: readonly CellValue[] | Float64Array | null,
  keep: readonly number[],
): readonly CellValue[] | Float64Array | null {
  if (values === null) return null;
  if (values instanceof Float64Array) return sliceFloat(values, keep);
  return sliceCells(values, keep);
}

function sliceBinIds(values: Int32Array | null, keep: readonly number[]): Int32Array | null {
  if (values === null) return null;
  const out = new Int32Array(keep.length);
  for (let i = 0; i < keep.length; i++) out[i] = values[keep[i]!]!;
  return out;
}

function resolveManualFun(binding: LayerBinding): ManualFunName {
  const params = (binding.layer.params ?? {}) as { fun?: unknown };
  const fun = params.fun;
  if (fun === undefined || fun === null || fun === "") {
    throw new PipelineError(
      "manual-fun-required",
      `/layers/${binding.index}/params/fun`,
      `The manual stat requires params.fun (one of first|last|mean|median|min|max|sum).`,
    );
  }
  if (!isManualFun(fun)) {
    throw new PipelineError(
      "manual-fun-unknown",
      `/layers/${binding.index}/params/fun`,
      `Unknown manual fun "${String(fun)}". Allowed: first, last, mean, median, min, max, sum.`,
    );
  }
  return fun;
}

function pickCells(
  values: readonly CellValue[] | null,
  sampleRows: readonly number[],
): readonly CellValue[] | null {
  if (values === null) return null;
  return sampleRows.map((row) => values[row]!);
}

function pickStyle(
  values: readonly CellValue[] | Float64Array | null,
  sampleRows: readonly number[],
): readonly CellValue[] | Float64Array | null {
  if (values === null) return null;
  if (values instanceof Float64Array) {
    const out = new Float64Array(sampleRows.length);
    for (let i = 0; i < sampleRows.length; i++) out[i] = values[sampleRows[i]!]!;
    return out;
  }
  return pickCells(values, sampleRows);
}

export function buildManualFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
  warnings: PipelineWarning[],
): LayerFrame {
  const fun = resolveManualFun(binding);
  const full = buildIdentityFrame(binding, table, groups);
  const x = full.xNumeric ?? Float64Array.from({ length: full.n }, () => Number.NaN);
  const y = full.yNumeric ?? Float64Array.from({ length: full.n }, () => Number.NaN);
  const result = statManual({ groups, x, y, fun });

  if (result.kind === "keep") {
    const { keep } = result;
    if (keep.length === full.n) return full;
    const bin =
      full.bin === null
        ? null
        : {
            xId: sliceBinIds(full.bin.xId, keep),
            yId: sliceBinIds(full.bin.yId, keep),
          };
    return {
      binding,
      table,
      n: keep.length,
      xValues: sliceCells(full.xValues, keep),
      xNumeric: sliceFloat(full.xNumeric, keep),
      yValues: sliceCells(full.yValues, keep),
      yNumeric: sliceFloat(full.yNumeric, keep),
      groups: result.groups,
      inputGroups: groups,
      inputSourceRows: null,
      rowIndex: Uint32Array.from(keep),
      colorValues: sliceCells(full.colorValues, keep),
      fillValues: sliceCells(full.fillValues, keep),
      sizeValues: sliceStyle(full.sizeValues, keep),
      linewidthValues: sliceStyle(full.linewidthValues, keep),
      alphaValues: sliceStyle(full.alphaValues, keep),
      shapeValues: sliceStyle(full.shapeValues, keep),
      linetypeValues: sliceStyle(full.linetypeValues, keep),
      labelValues: sliceCells(full.labelValues, keep),
      ymin: sliceFloat(full.ymin, keep),
      ymax: sliceFloat(full.ymax, keep),
      xmin: sliceFloat(full.xmin, keep),
      xmax: sliceFloat(full.xmax, keep),
      xend: sliceFloat(full.xend, keep),
      yend: sliceFloat(full.yend, keep),
      xendValues: sliceCells(full.xendValues, keep),
      yendValues: sliceCells(full.yendValues, keep),
      offsetX: sliceFloat(full.offsetX, keep),
      offsetY: sliceFloat(full.offsetY, keep),
      xIntercepts: full.xIntercepts,
      yIntercepts: full.yIntercepts,
      bin,
      dodge: null,
      box: null,
      smooth: null,
    };
  }

  if (result.droppedGroups > 0) {
    warnings.push({
      code: "manual-group-dropped",
      message: `Layer ${binding.index} (manual): ${result.droppedGroups} group(s) with no finite x or y were dropped.`,
    });
  }

  const n = result.x.length;
  const sample = result.sampleRows;
  return {
    binding,
    table,
    n,
    xValues: null,
    xNumeric: result.x,
    yValues: null,
    yNumeric: result.y,
    groups: result.groups,
    inputGroups: groups,
    inputSourceRows: null,
    rowIndex: Uint32Array.from({ length: n }, () => NO_ROW),
    colorValues: pickCells(full.colorValues, sample),
    fillValues: pickCells(full.fillValues, sample),
    sizeValues: pickStyle(full.sizeValues, sample),
    linewidthValues: pickStyle(full.linewidthValues, sample),
    alphaValues: pickStyle(full.alphaValues, sample),
    shapeValues: pickStyle(full.shapeValues, sample),
    linetypeValues: pickStyle(full.linetypeValues, sample),
    labelValues: pickCells(full.labelValues, sample),
    ...emptyFrameExtras(),
  };
}

export { isManualKeepFun };
