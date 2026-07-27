/** Shared per-primitive style lookup over mapped/literal/scaled channels. */
import type { StyleAesthetic } from "@ggsvelte/spec";

import type { ResolvedStyleScale, StyleOutput } from "../scales/style.js";
import type { LayerBinding, LayerFrame, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";

export type ResolvedStyleScales = Readonly<Record<StyleAesthetic, ResolvedStyleScale | null>>;

type PaintChannel = "color" | "fill";

function paintValues(frame: LayerFrame, channel: PaintChannel): LayerFrame["colorValues"] {
  return channel === "color" ? frame.colorValues : frame.fillValues;
}

/**
 * Per-row paint when the caller has already proven the channel is mapped
 * (scale non-null and values|scaledConstant present). Feeds Points/Rects/
 * Segments `string[]` fields without null casts.
 */
export function mappedPaintVector(
  frame: LayerFrame,
  channel: PaintChannel,
  scale: ResolvedColorScale,
  rows: ArrayLike<number>,
): string[] {
  const binding = frame.binding[channel];
  const values = paintValues(frame, channel);
  const out = Array.from<string>({ length: rows.length });
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const value = values === null ? binding.scaledConstant! : values[row]!;
    out[i] = colorOf(scale, value);
  }
  return out;
}

/**
 * Per-subpath / per-row paint vector. Honour mapped field values ·
 * scaledConstant · literal constant. `rows` is required: style vectors index
 * kept subpaths/marks, never raw frame rows.
 */
export function paintVector(
  frame: LayerFrame,
  channel: PaintChannel,
  scale: ResolvedColorScale | null,
  rows: ArrayLike<number>,
): (string | null)[] {
  const binding = frame.binding[channel];
  const values = paintValues(frame, channel);
  if (scale !== null && (values !== null || binding.scaledConstant !== null)) {
    return mappedPaintVector(frame, channel, scale, rows);
  }
  const constant = binding.constant;
  return Array.from({ length: rows.length }, () => constant);
}

/**
 * Literal alpha/linewidth: binding.constant → params[key] → fallback.
 * Fallback is explicit so site-specific defaults stay behavior-identical.
 */
export function constantStyle(
  binding: LayerBinding,
  params: { alpha?: number; linewidth?: number },
  key: "alpha" | "linewidth",
  fallback: number,
): number {
  // Optional: some emit/pack tests build partial bindings without every style key.
  const c = binding[key]?.constant;
  if (typeof c === "number") return c;
  const p = params[key];
  if (typeof p === "number") return p;
  return fallback;
}

/** Resolve a frame's per-row value column for a style aesthetic. Shared by the
 *  scale trainer (scale-style.ts) and geometry so both read the same columns. */
export function styleFrameValues(
  frame: LayerFrame,
  aesthetic: StyleAesthetic,
): LayerFrame["sizeValues"] {
  switch (aesthetic) {
    case "size":
      return frame.sizeValues;
    case "linewidth":
      return frame.linewidthValues;
    case "alpha":
      return frame.alphaValues;
    case "shape":
      return frame.shapeValues;
    case "linetype":
      return frame.linetypeValues;
    default:
      return null;
  }
}

export function mappedStyleOutput(
  frame: LayerFrame,
  aesthetic: StyleAesthetic,
  row: number,
  scales: ResolvedStyleScales,
): StyleOutput | undefined {
  const binding = frame.binding[aesthetic];
  if (binding.constant !== null) return binding.constant as StyleOutput;
  const resolved = scales[aesthetic];
  if (resolved === null) return undefined;
  const values = styleFrameValues(frame, aesthetic);
  const value = values === null ? binding.scaledConstant : values[row];
  return value === null || value === undefined
    ? binding.scaledConstant === null && values === null
      ? undefined
      : resolved.scale.valueOf(null)
    : resolved.scale.valueOf(value);
}

export function numericStyleVector(
  frame: LayerFrame,
  aesthetic: Extract<StyleAesthetic, "size" | "linewidth" | "alpha">,
  rows: ArrayLike<number>,
  scales: ResolvedStyleScales,
): Float32Array | undefined {
  const binding = frame.binding[aesthetic];
  if (
    binding === undefined ||
    (binding.field === null && binding.statColumn === null && binding.scaledConstant === null)
  ) {
    return undefined;
  }
  return Float32Array.from(
    rows,
    (row) => mappedStyleOutput(frame, aesthetic, row, scales) as number,
  );
}

export function indexedStyleVector(
  frame: LayerFrame,
  aesthetic: Extract<StyleAesthetic, "shape" | "linetype">,
  rows: ArrayLike<number>,
  scales: ResolvedStyleScales,
  indexOf: (value: string) => number,
): Uint8Array | undefined {
  const binding = frame.binding[aesthetic];
  if (
    binding === undefined ||
    (binding.field === null && binding.statColumn === null && binding.scaledConstant === null)
  ) {
    return undefined;
  }
  return Uint8Array.from(rows, (row) =>
    indexOf(String(mappedStyleOutput(frame, aesthetic, row, scales))),
  );
}
