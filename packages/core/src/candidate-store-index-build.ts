import { AUTO_MODE_CODE } from "./candidate-store-indexes.js";
import {
  candidatePrimitiveCount,
  defaultAutoMode,
  isCandidatePrimitive,
  localAnchor,
  primitiveCount,
} from "./candidate-geometry.js";
import type { CandidateStoreOptions, CandidateStyleColumn } from "./candidate-store-types.js";
import type { Scene } from "./scene.js";
import type { CellValue } from "./table.js";

const NO_ROW = 0xffffffff;

export type CandidateBufferState = {
  n: number;
  anyNonFiniteAnchor: boolean;
  batchIds: Uint32Array;
  primitiveIds: Uint32Array;
  panelIds: Uint32Array;
  rows: Uint32Array;
  series: Uint32Array;
  ranks: Uint32Array;
  sources: Uint32Array;
  lineages: Uint32Array;
  autoModes: Uint8Array;
  xs: Float32Array;
  ys: Float32Array;
  xTokenIds: Int32Array;
  yTokenIds: Int32Array;
  xDates: Uint8Array;
  yDates: Uint8Array;
  invalidX: Map<number, CellValue>;
  invalidY: Map<number, CellValue>;
  sizeValues: CellValue[];
  linewidthValues: CellValue[];
  alphaValues: CellValue[];
  shapeValues: CellValue[];
  linetypeValues: CellValue[];
  remember: (value: CellValue) => number;
};

type EligiblePrimitives = {
  primitiveIds: Uint32Array;
  semanticIds: Uint32Array;
  rowIds: Uint32Array;
};

function backfillStyle(arr: CellValue[], upto: number): void {
  for (let i = arr.length; i < upto; i++) arr.push(null);
}

function writeCandidatePosition(
  batch: Scene["batches"][number],
  panel: NonNullable<Scene["panels"][number]>,
  batchIndex: number,
  primitiveIndex: number,
  rowId: number,
  lx: number,
  ly: number,
  state: CandidateBufferState,
): void {
  const candidateIndex = state.n;
  state.batchIds[candidateIndex] = batchIndex;
  state.primitiveIds[candidateIndex] = primitiveIndex;
  state.panelIds[candidateIndex] = batch.panelIndex;
  state.rows[candidateIndex] = rowId;
  state.xs[candidateIndex] = panel.x + lx;
  state.ys[candidateIndex] = panel.y + ly;
  if (!Number.isFinite(state.xs[candidateIndex]!) || !Number.isFinite(state.ys[candidateIndex]!))
    state.anyNonFiniteAnchor = true;
}

function writeCandidateAxisValues(
  candidateIndex: number,
  xValue: CellValue,
  yValue: CellValue,
  state: CandidateBufferState,
): void {
  const xToken = state.remember(xValue);
  const yToken = state.remember(yValue);
  state.xTokenIds[candidateIndex] = xToken;
  state.yTokenIds[candidateIndex] = yToken;
  state.xDates[candidateIndex] = xValue instanceof Date ? 1 : 0;
  state.yDates[candidateIndex] = yValue instanceof Date ? 1 : 0;
  if (xToken === -1 && xValue !== null) state.invalidX.set(candidateIndex, xValue);
  if (yToken === -1 && yValue !== null) state.invalidY.set(candidateIndex, yValue);
}

function eligiblePrimitives(batch: Scene["batches"][number]): EligiblePrimitives {
  const primitiveIds = new Uint32Array(candidatePrimitiveCount(batch));
  const semanticIds = new Uint32Array(primitiveIds.length);
  const rowIds = new Uint32Array(primitiveIds.length);
  let eligible = 0;
  for (let primitiveIndex = 0; primitiveIndex < primitiveCount(batch); primitiveIndex++) {
    if (!isCandidatePrimitive(batch, primitiveIndex)) continue;
    primitiveIds[eligible] = primitiveIndex;
    semanticIds[eligible] =
      batch.kind === "paths"
        ? (batch.semanticIndex?.[primitiveIndex] ?? primitiveIndex)
        : primitiveIndex;
    rowIds[eligible] = batch.rowIndex[primitiveIndex] ?? NO_ROW;
    eligible++;
  }
  return { primitiveIds, semanticIds, rowIds };
}

function writeStyleColumn(
  target: CellValue[],
  column: CandidateStyleColumn,
  batchStart: number,
  count: number,
): void {
  if (column === null) return;
  backfillStyle(target, batchStart);
  if (column.kind === "constant") {
    for (let i = 0; i < count; i++) target.push(column.value);
    return;
  }
  const offset = column.offset ?? 0;
  for (let i = 0; i < count; i++) target.push(column.values[offset + i] ?? null);
}

function writeColumnarBatch(
  batch: Scene["batches"][number],
  panel: NonNullable<Scene["panels"][number]>,
  batchIndex: number,
  batchStart: number,
  eligible: EligiblePrimitives,
  columns: NonNullable<ReturnType<NonNullable<CandidateStoreOptions["datumColumns"]>>>,
  state: CandidateBufferState,
): void {
  const count = eligible.primitiveIds.length;
  writeStyleColumn(state.sizeValues, columns.sizeValue, batchStart, count);
  writeStyleColumn(state.linewidthValues, columns.linewidthValue, batchStart, count);
  writeStyleColumn(state.alphaValues, columns.alphaValue, batchStart, count);
  writeStyleColumn(state.shapeValues, columns.shapeValue, batchStart, count);
  writeStyleColumn(state.linetypeValues, columns.linetypeValue, batchStart, count);
  for (let i = 0; i < count; i++) {
    const primitiveIndex = eligible.primitiveIds[i]!;
    const rowId = eligible.rowIds[i]!;
    const [lx, ly] = localAnchor(batch, primitiveIndex);
    const candidateIndex = state.n;
    writeCandidatePosition(batch, panel, batchIndex, primitiveIndex, rowId, lx, ly, state);
    const xValue = columns.xValue === null ? null : (columns.xValue[i] ?? null);
    const yValue = columns.yValue === null ? null : (columns.yValue[i] ?? null);
    writeCandidateAxisValues(candidateIndex, xValue, yValue, state);
    const series = columns.seriesId === null ? 0 : (columns.seriesId[i] ?? 0);
    state.series[candidateIndex] = series;
    state.ranks[candidateIndex] =
      columns.seriesRank === null ? series : (columns.seriesRank[i] ?? series);
    const rowIndex = rowId === NO_ROW ? null : rowId;
    state.sources[candidateIndex] =
      columns.sourceOrder === null
        ? (rowIndex ?? primitiveIndex)
        : (columns.sourceOrder[i] ?? rowIndex ?? primitiveIndex);
    state.lineages[candidateIndex] = columns.lineage === null ? 0 : (columns.lineage[i] ?? 0);
    const defaultMode = AUTO_MODE_CODE[defaultAutoMode(batch, primitiveIndex)];
    state.autoModes[candidateIndex] =
      columns.autoMode === null ? defaultMode : (columns.autoMode[i] ?? defaultMode);
    state.n++;
  }
}

function flushStyle(target: CellValue[], values: CellValue[], batchStart: number): void {
  if (values.every((value) => value === null)) return;
  backfillStyle(target, batchStart);
  for (const value of values) target.push(value);
}

function writeCallbackBatch(
  batch: Scene["batches"][number],
  panel: NonNullable<Scene["panels"][number]>,
  batchIndex: number,
  eligible: EligiblePrimitives,
  batchStart: number,
  options: CandidateStoreOptions,
  state: CandidateBufferState,
): void {
  const sizeValues: CellValue[] = [];
  const linewidthValues: CellValue[] = [];
  const alphaValues: CellValue[] = [];
  const shapeValues: CellValue[] = [];
  const linetypeValues: CellValue[] = [];
  for (let i = 0; i < eligible.primitiveIds.length; i++) {
    const primitiveIndex = eligible.primitiveIds[i]!;
    const rowId = eligible.rowIds[i]!;
    const rowIndex = rowId === NO_ROW ? null : rowId;
    const [lx, ly] = localAnchor(batch, primitiveIndex);
    const candidateIndex = state.n;
    const datum =
      options.datum?.({
        candidateIndex,
        batchIndex,
        primitiveIndex: eligible.semanticIds[i]!,
        layerIndex: batch.layerIndex,
        panelIndex: batch.panelIndex,
        rowIndex,
        kind: batch.kind,
        x: panel.x + lx,
        y: panel.y + ly,
      }) ?? {};
    sizeValues.push(datum.sizeValue ?? null);
    linewidthValues.push(datum.linewidthValue ?? null);
    alphaValues.push(datum.alphaValue ?? null);
    shapeValues.push(datum.shapeValue ?? null);
    linetypeValues.push(datum.linetypeValue ?? null);
    writeCandidatePosition(batch, panel, batchIndex, primitiveIndex, rowId, lx, ly, state);
    const xValue = datum.xValue ?? null;
    const yValue = datum.yValue ?? null;
    writeCandidateAxisValues(candidateIndex, xValue, yValue, state);
    const series = datum.seriesId ?? 0;
    state.series[candidateIndex] = series;
    state.ranks[candidateIndex] = datum.seriesRank ?? series;
    state.sources[candidateIndex] = datum.sourceOrder ?? rowIndex ?? primitiveIndex;
    state.lineages[candidateIndex] = datum.lineage ?? 0;
    state.autoModes[candidateIndex] =
      AUTO_MODE_CODE[datum.autoMode ?? defaultAutoMode(batch, primitiveIndex)];
    state.n++;
  }
  flushStyle(state.sizeValues, sizeValues, batchStart);
  flushStyle(state.linewidthValues, linewidthValues, batchStart);
  flushStyle(state.alphaValues, alphaValues, batchStart);
  flushStyle(state.shapeValues, shapeValues, batchStart);
  flushStyle(state.linetypeValues, linetypeValues, batchStart);
}

export function populateCandidateBuffers(
  scene: Scene,
  options: CandidateStoreOptions,
  uninspectable: ReadonlySet<number> | undefined,
  state: CandidateBufferState,
): number {
  for (let batchIndex = 0; batchIndex < scene.batches.length; batchIndex++) {
    const batch = scene.batches[batchIndex]!;
    const panel = scene.panels[batch.panelIndex];
    if (panel === undefined || uninspectable?.has(batch.layerIndex) === true) continue;
    const eligible = eligiblePrimitives(batch);
    const batchStart = state.n;
    const columns =
      options.datumColumns?.({
        batchIndex,
        layerIndex: batch.layerIndex,
        panelIndex: batch.panelIndex,
        primitiveIds: eligible.primitiveIds,
        semanticIds: eligible.semanticIds,
        rowIds: eligible.rowIds,
      }) ?? null;
    if (columns !== null) {
      writeColumnarBatch(batch, panel, batchIndex, batchStart, eligible, columns, state);
      continue;
    }
    writeCallbackBatch(batch, panel, batchIndex, eligible, batchStart, options, state);
  }
  return state.n;
}
