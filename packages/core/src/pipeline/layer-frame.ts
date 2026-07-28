/**
 * Single constructor for post-stat LayerFrame (#1077).
 *
 * Owns the shared field set, yStatColumn default + forwardMeasureOnce,
 * NO_ROW lineage, and style/color/extras spreads. Adapters keep only which
 * stat to call and which columns come back.
 *
 * Not used by frame-stats-function, frame-stats-map, frame-stats-manual,
 * frame-stats-unique, or the sf family — those shapes genuinely differ.
 */
import type { CellValue, ColumnTable } from "../table.js";

import { emptyFrameExtras } from "./frame-helpers.js";
import { colorColumns, styleColumns } from "./frame-stats-shared.js";
import { forwardMeasureOnce } from "./stat-measure-transform.js";
import type { LayerBinding, LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";

/** Resolved x/y axes, or a y measure column default for forwardMeasureOnce. */
type FrameYAxis =
  | {
      readonly numeric?: Float64Array | null;
      readonly values?: readonly CellValue[] | null;
    }
  | {
      /** Default yStatColumn name when binding.yStatColumn is null. */
      readonly column: string;
      /** Fallback series if columns[resolved] is missing. */
      readonly fallback?: Float64Array;
    };

type FrameXAxis = {
  readonly numeric?: Float64Array | null;
  readonly values?: readonly CellValue[] | null;
};

/** Optional geom payloads and overrides applied after emptyFrameExtras. */
type StatLayerFrameExtras = Partial<
  Pick<
    LayerFrame,
    | "ymin"
    | "ymax"
    | "xmin"
    | "xmax"
    | "xend"
    | "yend"
    | "xendValues"
    | "yendValues"
    | "offsetX"
    | "offsetY"
    | "xIntercepts"
    | "yIntercepts"
    | "hexWidth"
    | "hexHeight"
    | "bin"
    | "binCut"
    | "dodge"
    | "box"
    | "smooth"
    | "sf"
    | "colorValues"
    | "fillValues"
    | "sizeValues"
    | "linewidthValues"
    | "alphaValues"
    | "shapeValues"
    | "linetypeValues"
    | "labelValues"
  >
>;

type StatLayerFrameInput = {
  readonly binding: LayerBinding;
  readonly table: ColumnTable;
  readonly n: number;
  readonly x: FrameXAxis;
  readonly y: FrameYAxis;
  readonly groups: readonly number[];
  readonly inputGroups: readonly number[];
  /** Stat output columns for style/color channels and y-column default. */
  readonly columns?: Readonly<Record<string, Float64Array | readonly CellValue[]>>;
  /** Resolve carried/source aesthetic fields (from makeColumnOf). */
  readonly columnOf: (field: string | null) => readonly CellValue[] | null;
  /**
   * Lineage: source rows when the stat preserves them, `"none"` when every
   * post-stat row is synthesized (filled with NO_ROW).
   */
  readonly lineage: Uint32Array | "none";
  /**
   * When true, resolve color/fill through after_stat computed columns
   * (`colorColumns`). Default false: field lookup only — matches pre-#1077
   * adapters that ignored after_stat color on stats outside STAT_COLOR_COLUMNS
   * (boxplot, summary, smooth, ecdf, …).
   */
  readonly afterStatColor?: boolean;
  readonly extras?: StatLayerFrameExtras;
};

function resolveY(
  binding: LayerBinding,
  y: FrameYAxis,
  columns: Readonly<Record<string, Float64Array | readonly CellValue[]>> | undefined,
): { yNumeric: Float64Array | null; yValues: readonly CellValue[] | null } {
  if ("column" in y) {
    const name = binding.yStatColumn ?? y.column;
    const series = columns?.[name] ?? y.fallback;
    if (series === undefined || !(series instanceof Float64Array)) {
      return { yNumeric: y.fallback ?? null, yValues: null };
    }
    return {
      yNumeric: forwardMeasureOnce(series, binding.yTransform),
      yValues: null,
    };
  }
  return {
    yNumeric: y.numeric ?? null,
    yValues: y.values ?? null,
  };
}

/**
 * The one place a post-stat LayerFrame is constructed for matching adapters.
 */
export function statLayerFrame(input: StatLayerFrameInput): LayerFrame {
  const {
    binding,
    table,
    n,
    x,
    y,
    groups,
    inputGroups,
    columns = {},
    columnOf,
    lineage,
    afterStatColor = false,
    extras,
  } = input;
  const { yNumeric, yValues } = resolveY(binding, y, columns);
  const rowIndex = lineage === "none" ? Uint32Array.from({ length: n }, () => NO_ROW) : lineage;
  const colorFill = afterStatColor
    ? colorColumns(binding, columnOf, columns)
    : {
        colorValues: columnOf(binding.color.field),
        fillValues: columnOf(binding.fill.field),
      };

  return {
    binding,
    table,
    n,
    xValues: x.values ?? null,
    xNumeric: x.numeric ?? null,
    yValues,
    yNumeric,
    groups,
    inputGroups,
    inputSourceRows: null,
    rowIndex,
    ...colorFill,
    ...styleColumns(binding, columnOf, columns),
    labelValues: columnOf(binding.labelField),
    ...emptyFrameExtras(),
    ...extras,
  };
}
