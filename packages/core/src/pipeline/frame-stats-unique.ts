/**
 * stat_unique → LayerFrame: first-wins dedupe of identity frames on mapped
 * aesthetic fields (#813). Builds a full identity frame, then slices every
 * post-stat column to the kept panel-local rows so segment/rect/ribbon
 * extras stay aligned with frame-identity.ts.
 */
import type { CellValue, ColumnTable } from "../table.js";

import { statUnique } from "../stats/unique.js";
import { buildIdentityFrame } from "./frame-identity.js";
import type { LayerBinding, LayerFrame } from "./types.js";

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

/** Mapped aesthetic field names that participate in unique keying. */
function uniqueKeyFields(binding: LayerBinding): string[] {
  const fields: string[] = [];
  const push = (field: string | null) => {
    if (field !== null && !fields.includes(field)) fields.push(field);
  };
  push(binding.xField);
  push(binding.yField);
  push(binding.color.field);
  push(binding.fill.field);
  push(binding.size.field);
  push(binding.linewidth.field);
  push(binding.alpha.field);
  push(binding.shape.field);
  push(binding.linetype.field);
  push(binding.labelField);
  push(binding.weightField);
  // group aesthetic is only on layer.aes (no dedicated binding field).
  const groupAes = binding.layer.aes?.group;
  if (
    groupAes !== undefined &&
    groupAes !== null &&
    typeof groupAes === "object" &&
    "field" in groupAes
  ) {
    push(groupAes.field);
  }
  push(binding.yminField);
  push(binding.ymaxField);
  push(binding.xminField);
  push(binding.xmaxField);
  push(binding.xendField);
  push(binding.yendField);
  push(binding.widthField);
  push(binding.heightField);
  return fields;
}

function buildKeys(table: ColumnTable, fields: readonly string[]): readonly (readonly unknown[])[] {
  const n = table.rowCount;
  if (fields.length === 0) {
    // No mapped aesthetics: every row shares one empty key → keep first only.
    return Array.from({ length: n }, () => []);
  }
  const columns = fields.map((field) => table.column(field));
  const keys: unknown[][] = Array.from({ length: n }, () => []);
  for (let row = 0; row < n; row++) {
    const key: unknown[] = [];
    for (let c = 0; c < columns.length; c++) key.push(columns[c]![row]!);
    keys[row] = key;
  }
  return keys;
}

/**
 * Dedupe an identity frame on mapped aesthetic columns (first occurrence wins).
 * Keeps the panel table reference; rowIndex holds panel-local keep indices for
 * finalizeFrameSourceRows.
 */
export function buildUniqueFrame(
  binding: LayerBinding,
  table: ColumnTable,
  groups: readonly number[],
): LayerFrame {
  const full = buildIdentityFrame(binding, table, groups);
  const keys = buildKeys(table, uniqueKeyFields(binding));
  const { keep } = statUnique({ keys });
  if (keep.length === full.n) {
    // No duplicates — return identity frame as-is (still unique-stat semantics).
    return full;
  }

  const groupsKept = keep.map((row) => groups[row]!);
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
    groups: groupsKept,
    // Pre-stat groups stay full-table length for identity-index consumers.
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
    sf: null,
  };
}
