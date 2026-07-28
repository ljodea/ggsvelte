/**
 * Shared helpers for non-identity LayerFrame construction.
 */
import type { CellValue } from "../table.js";

import type { PositionConversionContext } from "./temporal-position.js";
import type { ColorBinding, LayerBinding, LayerFrame } from "./types.js";

export type CarriedColumnOf = (
  result: { carried: Record<string, CellValue[]> },
  x: readonly CellValue[] | null,
) => (field: string | null) => readonly CellValue[] | null;

export function makeColumnOf(binding: LayerBinding): CarriedColumnOf {
  return (result, x) => (field) =>
    field === null ? null : field === binding.xField ? x : (result.carried[field] ?? null);
}

/**
 * Resolve color/fill from a mapped field or an after_stat computed column (#953).
 * Float64 after-stat series become CellValue arrays for scale training.
 */
export function colorColumns(
  binding: LayerBinding,
  columnOf: (field: string | null) => readonly CellValue[] | null,
  computed: Readonly<Record<string, Float64Array | readonly CellValue[]>> = {},
): Pick<LayerFrame, "colorValues" | "fillValues"> {
  const valueOf = (channel: ColorBinding): readonly CellValue[] | null => {
    const stat = channel.statColumn ?? null;
    if (stat !== null) {
      const col = computed[stat];
      return col === undefined ? null : Array.from(col);
    }
    return columnOf(channel.field);
  };
  return {
    colorValues: valueOf(binding.color),
    fillValues: valueOf(binding.fill),
  };
}

/** Resolve source/carried and after-stat style columns through one contract. */
export function styleColumns(
  binding: LayerBinding,
  columnOf: (field: string | null) => readonly CellValue[] | null,
  computed: Readonly<Record<string, Float64Array | readonly CellValue[]>> = {},
): Pick<
  LayerFrame,
  "sizeValues" | "linewidthValues" | "alphaValues" | "shapeValues" | "linetypeValues"
> {
  const valueOf = (style: LayerBinding["size"]) =>
    style.statColumn === null ? columnOf(style.field) : (computed[style.statColumn] ?? null);
  return {
    sizeValues: valueOf(binding.size),
    linewidthValues: valueOf(binding.linewidth),
    alphaValues: valueOf(binding.alpha),
    shapeValues: valueOf(binding.shape),
    linetypeValues: valueOf(binding.linetype),
  };
}

/**
 * Whether pre-stat aggregation should key x by semantic temporal epochs.
 *
 * Band consumers (explicit discrete scales, bar/col discretization without an
 * explicit time scale) must keep raw categories so tick labels stay source-shaped.
 */
export function shouldAggregateOnSemanticTemporalX(
  binding: Pick<LayerBinding, "layer" | "xConversion">,
  parsedStatus: string,
): boolean {
  const conversion: PositionConversionContext = binding.xConversion;
  if (conversion.forcedDiscrete || conversion.forcedNonTemporal) return false;
  // time-of-day (#831): scale space is ms-of-day via positionColumn /
  // positionValuesToNumeric, not raw parseTemporal epoch semantics (and not
  // portable seconds). Aggregate on source cells, then convert for xNumeric.
  //
  // monthDay deliberately does NOT join this arm. Its parser (`md`) collapses
  // the year during parsing, so the semantic value is already scale space —
  // aggregating on it is what groups two years' worth of the same calendar day
  // together. Excluding it here would key them apart and lose the collapse.
  if (conversion.requestedKind === "time") return false;
  const geom = binding.layer.geom;
  const barDiscretizes =
    (geom === "bar" || geom === "col") && binding.layer.stat !== "bin" && !conversion.requestedTime;
  if (barDiscretizes) return false;
  return (
    conversion.requestedTime || conversion.sourceParser !== "auto" || parsedStatus === "temporal"
  );
}
