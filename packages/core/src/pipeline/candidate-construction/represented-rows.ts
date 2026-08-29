import { bandKey } from "../../scales/train.js";
import { binIndexOf } from "../../stats/bin-breaks.js";
import type { ColumnTable } from "../../table.js";
import { shouldAggregateOnSemanticTemporalX } from "../frame-stats-shared.js";
import { positionColumn, xConversionOf, yConversionOf } from "../temporal-position.js";
import type { LayerBinding, LayerFrame } from "../types.js";

export function filterAggregateXRows(input: {
  table: ColumnTable;
  field: string;
  outputX: unknown;
  baseRows: readonly number[];
  /** When present, temporal summary/count keys match semantic epoch frame xValues. */
  binding?: LayerBinding;
}): number[] {
  const outputKey = bandKey(input.outputX);
  if (input.binding !== undefined) {
    const conversion = xConversionOf(input.binding);
    const parsed = input.table.parsed(input.field, conversion.sourceParser, conversion.options);
    if (shouldAggregateOnSemanticTemporalX(input.binding, parsed.decision.status)) {
      return input.baseRows.filter(
        (row) => bandKey(parsed.valid[row] === 1 ? parsed.semantic[row] : null) === outputKey,
      );
    }
  }
  const col = input.table.column(input.field);
  return input.baseRows.filter((row) => bandKey(col[row]) === outputKey);
}

export function filterBinRepresentedRows(input: {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  field: string;
  baseRows: readonly number[];
}): number[] {
  const { frame, table, frameRow, field, baseRows } = input;
  const cut = frame.binCut;
  // Without the stat's own cut we cannot reproduce its fuzzed membership.
  if (frame.xmin === null || frame.xmax === null || cut === undefined || cut === null)
    return [...baseRows];
  const gridBin = cut.binIndex[frameRow]!;
  // Edges are scale-space; filter source rows after the same transform.
  const numeric = positionColumn(
    table,
    field,
    xConversionOf(frame.binding),
    frame.binding.xTransform,
  );
  return baseRows.filter((row) => {
    const value = numeric[row]!;
    if (!Number.isFinite(value)) return false;
    // Replay the stat's own cut so this fallback path agrees with the indexed
    // buckets, including inside the fuzz band around a break (#905).
    return binIndexOf(value, cut.fuzzy, cut.rightClosed) === gridBin;
  });
}

export function filterAggregateYRows(input: {
  frame?: LayerFrame;
  table: ColumnTable;
  field: string;
  baseRows: readonly number[];
}): number[] {
  const binding = input.frame?.binding;
  const conversion = yConversionOf(binding ?? {});
  const numeric = positionColumn(input.table, input.field, conversion, binding?.yTransform);
  return input.baseRows.filter((row) => Number.isFinite(numeric[row]!));
}

interface RepresentedRowsInput {
  frame: LayerFrame;
  table: ColumnTable;
  frameRow: number;
  baseRows: readonly number[];
  /** Series group of the mark (needed for index keys). */
  group?: number;
  panelIndex?: number;
  layerIndex?: number;
  sourceRowsByGroupX?: Map<string, number[]>;
  sourceRowsByGroupBin?: Map<string, number[]>;
  /** Precomputed finite-y rows per `${panel}:${layer}:${group}` (smooth/summary/boxplot). */
  sourceRowsByGroupY?: Map<string, number[]>;
}

interface RepresentedRowsContext {
  readonly aggregateXField: string | null;
  readonly aggregateYField: string | null;
  readonly indexKeyPrefix: string | null;
  readonly needsBin: boolean;
  readonly needsX: boolean;
  readonly needsY: boolean;
  readonly outputX: unknown;
}

function representedRowsContext(input: RepresentedRowsInput): RepresentedRowsContext {
  const { frame, frameRow } = input;
  const stat = frame.binding.layer.stat ?? "identity";
  const aggregateXField = frame.binding.xField;
  const aggregateYField = frame.binding.yField;
  const outputX = frame.xValues?.[frameRow] ?? frame.xNumeric?.[frameRow] ?? null;
  const group = input.group ?? frame.groups[frameRow] ?? 0;
  const indexKeyPrefix =
    input.panelIndex !== undefined && input.layerIndex !== undefined
      ? `${input.panelIndex}:${input.layerIndex}:${group}`
      : null;
  const needsX =
    aggregateXField !== null &&
    outputX !== null &&
    (stat === "count" || stat === "summary" || stat === "boxplot");
  // summary_bin: bin-edge membership like bin (finite-x only). Non-finite y is
  // dropped at stat time for the summary value, not from lineage membership.
  const needsBin = (stat === "bin" || stat === "summary_bin") && aggregateXField !== null;
  const needsY =
    (stat === "smooth" || stat === "summary" || stat === "boxplot") && aggregateYField !== null;
  return {
    aggregateXField,
    aggregateYField,
    indexKeyPrefix,
    needsBin,
    needsX,
    needsY,
    outputX,
  };
}

function indexedRepresentedRows(
  input: RepresentedRowsInput,
  context: RepresentedRowsContext,
): readonly number[] | undefined {
  const { frame, frameRow } = input;
  const { indexKeyPrefix, needsBin, needsX, needsY, outputX } = context;

  // Full-group finite-y path (smooth; summary/boxplot without x/bin): return the
  // shared cached array before cloning baseRows — keeps resolve O(1) per mark.
  if (needsY && !needsX && !needsBin && indexKeyPrefix !== null && input.sourceRowsByGroupY) {
    const cachedY = input.sourceRowsByGroupY.get(indexKeyPrefix);
    if (cachedY !== undefined) return cachedY;
  }

  // Indexed group×x: buckets are the final represented membership (count: all
  // rows; summary/boxplot: finite-y only). Return the frozen array as-is so
  // LineageStore can WeakMap-intern once — no clone, no per-mark y re-filter.
  // Binned counts key by integer bin id (frame.bin.xId), not inverse centers.
  if (needsX && indexKeyPrefix !== null && input.sourceRowsByGroupX !== undefined) {
    const bin = frame.bin;
    const xBinId = bin === undefined || bin === null ? null : bin.xId;
    const xKey =
      frame.binding.xBinning !== undefined && xBinId !== null
        ? bandKey(xBinId[frameRow]!)
        : bandKey(outputX);
    const indexed = input.sourceRowsByGroupX.get(`${indexKeyPrefix}:${xKey}`);
    if (indexed !== undefined) return indexed;
  }

  // Indexed bin membership (already final; bin never applies needsY).
  if (needsBin && indexKeyPrefix !== null && input.sourceRowsByGroupBin !== undefined) {
    const indexed = input.sourceRowsByGroupBin.get(`${indexKeyPrefix}:${frameRow}`);
    if (indexed !== undefined) return indexed;
  }

  return undefined;
}

function filterRepresentedRowsFallback(
  input: RepresentedRowsInput,
  context: RepresentedRowsContext,
): readonly number[] {
  const { frame, table, frameRow } = input;
  const { aggregateXField, aggregateYField, needsBin, needsX, needsY, outputX } = context;

  // Nothing to narrow: hand back the shared frozen bucket, exactly as the
  // indexed arms above do. A clone is not frozen and so misses LineageStore's
  // identity cache, which made every mark re-tokenize its whole group.
  if (!needsX && !needsBin && !needsY) return input.baseRows;

  // Fallback without index maps: clone then filter (parity with pure filters).
  let representedRows = [...input.baseRows];
  if (needsX) {
    representedRows = filterAggregateXRows({
      table,
      field: aggregateXField!,
      outputX,
      baseRows: representedRows,
      binding: frame.binding,
    });
  } else if (needsBin) {
    representedRows = filterBinRepresentedRows({
      frame,
      table,
      frameRow,
      field: aggregateXField!,
      baseRows: representedRows,
    });
  }

  if (needsY) {
    representedRows = filterAggregateYRows({
      frame,
      table,
      field: aggregateYField!,
      baseRows: representedRows,
    });
  }

  return representedRows;
}

export function filterRepresentedSourceRows(input: RepresentedRowsInput): readonly number[] {
  const context = representedRowsContext(input);
  const indexed = indexedRepresentedRows(input, context);
  return indexed ?? filterRepresentedRowsFallback(input, context);
}
