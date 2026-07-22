/** Shared per-primitive style lookup over mapped/literal/scaled channels. */
import type { StyleAesthetic } from "@ggsvelte/spec";

import type { ResolvedStyleScale, StyleOutput } from "../scales/style.js";
import type { LayerFrame } from "./types.js";

export type ResolvedStyleScales = Readonly<Record<StyleAesthetic, ResolvedStyleScale | null>>;

function valuesOf(frame: LayerFrame, aesthetic: StyleAesthetic): LayerFrame["sizeValues"] {
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
  const values = valuesOf(frame, aesthetic);
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
