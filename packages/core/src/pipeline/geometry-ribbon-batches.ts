/** Assemble closed and outline ribbon path batches from written buffers. */
import type { PathsBatch } from "../scene.js";
import type { Linetype } from "../scales/style.js";

type LineCap = "butt" | "round" | "square";
type LineJoin = "miter" | "round" | "bevel";

type ClosedRibbonBuffers = {
  positions: Float32Array;
  rowIndex: Uint32Array;
  closedFrameRows: Uint32Array;
  pathOffsets: Uint32Array;
  fills: (string | null)[];
  strokes: (string | null)[];
};

type OpenRibbonBuffers = {
  positions: Float32Array;
  rowIndex: Uint32Array;
  frameRowIndex: Uint32Array;
  pathOffsets: Uint32Array;
  strokes: (string | null)[];
};

function expandEdgeStyles<T>(
  values: T[] | Float32Array | Uint8Array | undefined,
  edgeCount: number,
): T[] | Float32Array | Uint8Array | undefined {
  if (values === undefined || edgeCount === 1) return values;
  if (values instanceof Float32Array) {
    const expanded = new Float32Array(values.length * edgeCount);
    for (let i = 0; i < values.length; i++) {
      for (let edge = 0; edge < edgeCount; edge++) {
        expanded[i * edgeCount + edge] = values[i]!;
      }
    }
    return expanded;
  }
  if (values instanceof Uint8Array) {
    const expanded = new Uint8Array(values.length * edgeCount);
    for (let i = 0; i < values.length; i++) {
      for (let edge = 0; edge < edgeCount; edge++) {
        expanded[i * edgeCount + edge] = values[i]!;
      }
    }
    return expanded;
  }
  const expanded: T[] = [];
  for (const value of values) {
    for (let edge = 0; edge < edgeCount; edge++) expanded.push(value);
  }
  return expanded;
}

export function closedRibbonBatch(input: {
  layerIndex: number;
  closed: ClosedRibbonBuffers;
  fullStroke: boolean;
  outlineWidth: number;
  constantAlpha: number;
  alphas: Float32Array | undefined;
  linewidths: Float32Array | undefined;
  linetypeIndexes: Uint8Array | undefined;
  literalLinetype: unknown;
  linecap: LineCap;
  linejoin: LineJoin;
  fillPaintResolved: PathsBatch["fillPaint"] | undefined;
  strokePaintResolved: PathsBatch["strokePaint"] | undefined;
  glowResolved: PathsBatch["glow"] | undefined;
}): PathsBatch {
  const {
    layerIndex,
    closed,
    fullStroke,
    outlineWidth,
    constantAlpha,
    alphas,
    linewidths,
    linetypeIndexes,
    literalLinetype,
    linecap,
    linejoin,
    fillPaintResolved,
    strokePaintResolved,
    glowResolved,
  } = input;
  return {
    kind: "paths",
    layerIndex,
    panelIndex: 0,
    positions: closed.positions,
    rowIndex: closed.rowIndex,
    closedFrameRows: closed.closedFrameRows,
    pathOffsets: closed.pathOffsets,
    strokes: closed.strokes,
    fills: closed.fills,
    closed: true,
    linewidth: fullStroke ? outlineWidth : 0,
    ...(fullStroke && linewidths !== undefined && { linewidths }),
    alpha: alphas === undefined ? constantAlpha : 1,
    ...(alphas !== undefined && { alphas }),
    ...(fullStroke &&
      typeof literalLinetype === "string" && { linetype: literalLinetype as Linetype }),
    ...(fullStroke && linetypeIndexes !== undefined && { linetypeIndexes }),
    ...(fullStroke && { linecap, linejoin }),
    curve: "linear",
    ...(fillPaintResolved !== undefined && { fillPaint: fillPaintResolved }),
    ...(fullStroke && strokePaintResolved !== undefined && { strokePaint: strokePaintResolved }),
    ...(glowResolved !== undefined && { glow: glowResolved }),
  };
}

export function openRibbonBatch(input: {
  layerIndex: number;
  open: OpenRibbonBuffers;
  edgeCount: number;
  outlineWidth: number;
  constantAlpha: number;
  alphas: Float32Array | undefined;
  linewidths: Float32Array | undefined;
  linetypeIndexes: Uint8Array | undefined;
  literalLinetype: unknown;
  linecap: LineCap;
  linejoin: LineJoin;
  strokePaintResolved: PathsBatch["strokePaint"] | undefined;
}): PathsBatch {
  const {
    layerIndex,
    open,
    edgeCount,
    outlineWidth,
    constantAlpha,
    alphas,
    linewidths,
    linetypeIndexes,
    literalLinetype,
    linecap,
    linejoin,
    strokePaintResolved,
  } = input;
  const outlineLinewidths = expandEdgeStyles(linewidths, edgeCount);
  const outlineAlphas = expandEdgeStyles(alphas, edgeCount);
  const outlineLinetypes = expandEdgeStyles(linetypeIndexes, edgeCount);
  return {
    kind: "paths",
    layerIndex,
    panelIndex: 0,
    positions: open.positions,
    rowIndex: open.rowIndex,
    frameRowIndex: open.frameRowIndex,
    pathOffsets: open.pathOffsets,
    strokes: open.strokes,
    linewidth: outlineWidth,
    ...(outlineLinewidths !== undefined && { linewidths: outlineLinewidths as Float32Array }),
    alpha: outlineAlphas === undefined ? constantAlpha : 1,
    ...(outlineAlphas !== undefined && { alphas: outlineAlphas as Float32Array }),
    ...(typeof literalLinetype === "string" && { linetype: literalLinetype as Linetype }),
    ...(strokePaintResolved !== undefined && { strokePaint: strokePaintResolved }),
    ...(outlineLinetypes !== undefined && { linetypeIndexes: outlineLinetypes as Uint8Array }),
    linecap,
    linejoin,
    curve: "linear",
    candidates: false,
  };
}
