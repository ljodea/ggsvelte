/**
 * Per-row errorbar segment emission (stem + caps) into preallocated buffers.
 *
 * Each kept row emits 3 segments (12 floats, 3 row ids). Capacity is frame.n;
 * dense reuses typed arrays, sparse compact slices (like rule segments/glyphs).
 */
import type { LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { positionOf } from "./geometry-shared.js";

export interface EmittedErrorbars {
  segments: Float32Array;
  rowIndex: Uint32Array;
  strokes: string[] | null;
  keptSegments: number;
  removed: number;
}

export function emitErrorbarRows(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  wantsColors: boolean;
  xSpanOf: (row: number, center: number) => readonly [number, number];
}): EmittedErrorbars {
  const { frame, fx, color, wantsColors, xSpanOf } = input;
  const { binding, n } = frame;
  // 3 segments × 4 floats per kept row; 3 row ids per kept row.
  const segments = new Float32Array(n * 12);
  const rowIndex = new Uint32Array(n * 3);
  const strokes = wantsColors && color !== null ? Array.from<string>({ length: n * 3 }) : null;
  let kept = 0; // kept *rows*
  let removed = 0;

  for (let row = 0; row < n; row++) {
    const tx = positionOf(fx.xScale, frame.xNumeric, frame.xValues, row);
    const t0 = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(frame.ymin![row]!);
    const t1 = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(frame.ymax![row]!);
    if (
      Number.isNaN(tx) ||
      t0 === undefined ||
      t1 === undefined ||
      Number.isNaN(t0) ||
      Number.isNaN(t1)
    ) {
      removed++;
      continue;
    }
    const [cap0, cap1] = xSpanOf(row, tx);
    if (!Number.isFinite(cap0) || !Number.isFinite(cap1)) {
      removed++;
      continue;
    }
    const cx = tx * fx.innerWidth;
    const capX0 = cap0 * fx.innerWidth;
    const capX1 = cap1 * fx.innerWidth;
    const y0 = fx.innerHeight - t0 * fx.innerHeight;
    const y1 = fx.innerHeight - t1 * fx.innerHeight;
    const so = kept * 12;
    segments[so] = cx;
    segments[so + 1] = y0;
    segments[so + 2] = cx;
    segments[so + 3] = y1;
    segments[so + 4] = capX0;
    segments[so + 5] = y0;
    segments[so + 6] = capX1;
    segments[so + 7] = y0;
    segments[so + 8] = capX0;
    segments[so + 9] = y1;
    segments[so + 10] = capX1;
    segments[so + 11] = y1;
    const src = frame.rowIndex[row]!;
    const ro = kept * 3;
    rowIndex[ro] = src;
    rowIndex[ro + 1] = src;
    rowIndex[ro + 2] = src;
    if (strokes !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      const c = colorOf(color!, value);
      strokes[ro] = c;
      strokes[ro + 1] = c;
      strokes[ro + 2] = c;
    }
    kept++;
  }

  const keptSegments = kept * 3;
  if (kept === 0) {
    return {
      segments: new Float32Array(0),
      rowIndex: new Uint32Array(0),
      strokes: wantsColors ? [] : null,
      keptSegments: 0,
      removed,
    };
  }
  if (kept === n) {
    return { segments, rowIndex, strokes, keptSegments, removed };
  }
  return {
    segments: segments.subarray(0, kept * 12).slice(),
    rowIndex: rowIndex.subarray(0, keptSegments).slice(),
    strokes: strokes === null ? null : strokes.slice(0, keptSegments),
    keptSegments,
    removed,
  };
}
