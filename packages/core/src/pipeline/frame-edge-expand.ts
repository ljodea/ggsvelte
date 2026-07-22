/**
 * Pre-geometry edge expansion for continuous tile/raster so scale training
 * sees xmin/xmax/ymin/ymax. Band tile leaves edges null (centers train).
 */
import { resolution as resolutionOf } from "../stats/numeric.js";

import { positionFieldType } from "./temporal-position.js";
import type { LayerFrame, PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

const RASTER_SPACING_EPS = Math.sqrt(Number.EPSILON);

function sizeAt(
  frame: LayerFrame,
  field: string | null,
  param: number | undefined,
  defaultSize: number,
  row: number,
): number {
  if (field !== null) {
    const raw = frame.table.column(field)[frame.rowIndex[row]!]!;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }
  if (param !== undefined) return param;
  return defaultSize;
}

function defaultResolution(values: Float64Array | null): number {
  if (values === null || values.length === 0) return 1;
  const gap = resolutionOf(values);
  return gap > 0 ? gap : 1;
}

function uniqueSorted(values: Float64Array): number[] {
  const set = new Set<number>();
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (Number.isFinite(v)) set.add(v);
  }
  return [...set].toSorted((a, b) => a - b);
}

function spacingOf(unique: readonly number[]): { size: number; irregular: boolean } {
  if (unique.length <= 1) return { size: 1, irregular: false };
  const diffs: number[] = [];
  for (let i = 1; i < unique.length; i++) diffs.push(unique[i]! - unique[i - 1]!);
  const min = Math.min(...diffs);
  const irregular = diffs.some((d) => Math.abs(d - min) > RASTER_SPACING_EPS);
  return { size: min > 0 ? min : 1, irregular };
}

/** Expand continuous tile/raster frames with edge arrays before scale training. */
export function expandEdgeFrame(frame: LayerFrame, warnings: PipelineWarning[]): void {
  const geom = frame.binding.layer.geom;
  if (geom !== "tile" && geom !== "raster") return;
  if (frame.xNumeric === null || frame.yNumeric === null) return;

  const xType =
    frame.binding.xField === null
      ? "quantitative"
      : positionFieldType(frame.table, frame.binding.xField, frame.binding.xConversion);
  const yType =
    frame.binding.yField === null
      ? "quantitative"
      : positionFieldType(frame.table, frame.binding.yField, frame.binding.yConversion);

  // Band axes train from centers only. Expand edges only on continuous axes
  // (mixed band+continuous tiles keep continuous-axis domain expansion).
  if (geom === "tile") {
    if (xType === "nominal" && yType === "nominal") return;
    const params = frame.binding.layer.params ?? {};
    const defW = defaultResolution(frame.xNumeric);
    const defH = defaultResolution(frame.yNumeric);
    if (xType !== "nominal") {
      const left = new Float64Array(frame.n);
      const right = new Float64Array(frame.n);
      for (let row = 0; row < frame.n; row++) {
        const cx = frame.xNumeric[row]!;
        const w = sizeAt(frame, frame.binding.widthField, params.width, defW, row);
        if (!Number.isFinite(cx) || !(w > 0) || !Number.isFinite(w)) {
          left[row] = NaN;
          right[row] = NaN;
          continue;
        }
        left[row] = cx - w / 2;
        right[row] = cx + w / 2;
      }
      frame.xmin = left;
      frame.xmax = right;
    }
    if (yType !== "nominal") {
      const bottom = new Float64Array(frame.n);
      const top = new Float64Array(frame.n);
      for (let row = 0; row < frame.n; row++) {
        const cy = frame.yNumeric[row]!;
        const h = sizeAt(frame, frame.binding.heightField, params.height, defH, row);
        if (!Number.isFinite(cy) || !(h > 0) || !Number.isFinite(h)) {
          bottom[row] = NaN;
          top[row] = NaN;
          continue;
        }
        bottom[row] = cy - h / 2;
        top[row] = cy + h / 2;
      }
      frame.ymin = bottom;
      frame.ymax = top;
    }
    return;
  }

  // raster
  const params = frame.binding.layer.params ?? {};
  // Schema only admits false; reject any non-false truthy at runtime too.
  if ((params as { interpolate?: unknown }).interpolate === true) {
    throw new PipelineError(
      "unsupported-param",
      `/layers/${frame.binding.index}/params/interpolate`,
      "geom raster only supports interpolate: false (nearest / no interpolation).",
    );
  }
  const hjust = params.hjust ?? 0.5;
  const vjust = params.vjust ?? 0.5;
  const seen = new Map<string, number>();
  for (let row = 0; row < frame.n; row++) {
    const x = frame.xNumeric[row]!;
    const y = frame.yNumeric[row]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${x}\0${y}`;
    if (seen.has(key)) {
      throw new PipelineError(
        "raster-duplicate-cells",
        `/layers/${frame.binding.index}`,
        `The raster geom found duplicate coordinates at (x=${String(x)}, y=${String(y)}). Aggregate to one value per cell or use geom "tile".`,
      );
    }
    seen.set(key, row);
  }
  const xSpace = spacingOf(uniqueSorted(frame.xNumeric));
  const ySpace = spacingOf(uniqueSorted(frame.yNumeric));
  if (xSpace.irregular || ySpace.irregular) {
    warnings.push({
      code: "raster-irregular-spacing",
      message: `Raster cells at layer ${frame.binding.index} are not on a regular grid; cells will use the minimum spacing. Consider geom "tile" instead.`,
    });
  }
  const left = new Float64Array(frame.n);
  const right = new Float64Array(frame.n);
  const bottom = new Float64Array(frame.n);
  const top = new Float64Array(frame.n);
  for (let row = 0; row < frame.n; row++) {
    const x = frame.xNumeric[row]!;
    const y = frame.yNumeric[row]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      left[row] = NaN;
      right[row] = NaN;
      bottom[row] = NaN;
      top[row] = NaN;
      continue;
    }
    left[row] = x - xSpace.size * (1 - hjust);
    right[row] = x + xSpace.size * hjust;
    bottom[row] = y - ySpace.size * (1 - vjust);
    top[row] = y + ySpace.size * vjust;
  }
  frame.xmin = left;
  frame.xmax = right;
  frame.ymin = bottom;
  frame.ymax = top;
}
