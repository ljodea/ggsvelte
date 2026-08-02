import type { CanonicalAxisToken } from "./candidate-axis-token.js";
import type { LineageRef } from "./identity.js";
import type { GeometryBatch } from "./scene.js";
import type { CellValue } from "./table.js";

export type CandidateInspectMode = "auto" | "exact" | "x" | "y" | "xy";
export type ResolvedCandidateInspectMode = Exclude<CandidateInspectMode, "auto">;
export type TraversalDirection =
  | "next"
  | "previous"
  | "first"
  | "last"
  | "left"
  | "right"
  | "up"
  | "down";

export interface CandidateDatum {
  readonly xValue?: CellValue;
  readonly yValue?: CellValue;
  readonly sizeValue?: CellValue;
  readonly linewidthValue?: CellValue;
  readonly alphaValue?: CellValue;
  readonly shapeValue?: CellValue;
  readonly linetypeValue?: CellValue;
  readonly seriesId?: number;
  readonly seriesRank?: number;
  readonly sourceOrder?: number;
  readonly lineage?: LineageRef;
  /** Semantic policy used when nearest() is requested with mode "auto". */
  readonly autoMode?: ResolvedCandidateInspectMode;
}
export interface CandidateBuildFacts {
  readonly candidateIndex: number;
  readonly batchIndex: number;
  readonly primitiveIndex: number;
  readonly layerIndex: number;
  readonly panelIndex: number;
  readonly rowIndex: number | null;
  readonly kind: GeometryBatch["kind"];
  /** Candidate anchor in plot pixels. */
  readonly x: number;
  readonly y: number;
}

/**
 * Per-batch facts handed to the columnar datum seam. `primitiveIds` are the
 * eligible (candidate-bearing) primitive indexes in candidate order;
 * `semanticIds` are the datum-facing indexes (paths batches map through
 * `semanticIndex`, matching `CandidateBuildFacts.primitiveIndex`; other kinds
 * equal `primitiveIds`); `rowIds` carry the batch's `rowIndex` values with
 * the `NO_ROW` sentinel where a primitive has no source row.
 */
export interface CandidateBatchFacts {
  readonly batchIndex: number;
  readonly layerIndex: number;
  readonly panelIndex: number;
  readonly primitiveIds: Uint32Array;
  readonly semanticIds: Uint32Array;
  readonly rowIds: Uint32Array;
}

/**
 * One style value source for a whole batch, mirroring per-candidate
 * resolution: a source `column` indexed by candidate position (with an
 * optional `offset` into the column), a `constant` applied to every
 * candidate, or `null` (all candidates read null).
 */
export type CandidateStyleColumn =
  | { readonly kind: "column"; readonly values: ArrayLike<CellValue>; readonly offset?: number }
  | { readonly kind: "constant"; readonly value: CellValue }
  | null;

/**
 * Columnar counterpart of {@link CandidateDatum}: every member covers one
 * batch's candidates in candidate order. A `null` member means "every
 * candidate takes the default" (null value / series 0 / rank = series /
 * sourceOrder = rowId ?? primitiveId / empty lineage / geometry default
 * autoMode).
 */
export interface CandidateDatumColumns {
  readonly xValue: ArrayLike<CellValue> | null;
  readonly yValue: ArrayLike<CellValue> | null;
  readonly sizeValue: CandidateStyleColumn;
  readonly linewidthValue: CandidateStyleColumn;
  readonly alphaValue: CandidateStyleColumn;
  readonly shapeValue: CandidateStyleColumn;
  readonly linetypeValue: CandidateStyleColumn;
  readonly seriesId: ArrayLike<number> | null;
  readonly seriesRank: ArrayLike<number> | null;
  readonly sourceOrder: ArrayLike<number> | null;
  readonly lineage: ArrayLike<number> | null;
  readonly autoMode: ArrayLike<number> | null;
}
export interface CandidateStoreOptions {
  readonly epoch?: number;
  /** coord_flip maps semantic x to screen y and semantic y to screen x. */
  readonly flip?: boolean;
  /** Pointer hit slop around points and strokes in plot pixels (default 3). */
  readonly hitTolerance?: number;
  /**
   * Layer indexes the author marked `inspect: false`. Their marks never become
   * candidates, so they cannot be hit-tested, hovered, or reached by keyboard.
   *
   * Filtering here rather than in each query is deliberate: an area mark
   * reports distance 0 everywhere it is painted, so a full-panel band outranks
   * every point and stroke beneath it in `nearest`. Dropping the marks at the
   * single enumeration point covers hitTest, nearest, grouping and traversal
   * together, and leaves rect hit math alone for the layers that want it
   * (bars, tiles, heatmaps).
   */
  readonly uninspectableLayers?: ReadonlySet<number>;
  readonly datum?: (facts: CandidateBuildFacts) => CandidateDatum | undefined;
  /**
   * Columnar datum seam: consulted ONCE per batch (before any per-candidate
   * work) and returns that batch's datum values as candidate-indexed columns,
   * so dense source-backed layers never materialize per-candidate objects.
   * A `null` (or `undefined`) return declines the batch, which then resolves
   * through the per-candidate {@link CandidateStoreOptions.datum} callback.
   * Observationally identical to resolving every candidate via `datum`.
   */
  readonly datumColumns?: (facts: CandidateBatchFacts) => CandidateDatumColumns | null;
}
export interface CandidateFacts extends CandidateBuildFacts {
  readonly id: number;
  readonly epoch: number;
  readonly panelId: string;
  readonly x: number;
  readonly y: number;
  readonly xValue: CellValue;
  readonly yValue: CellValue;
  readonly sizeValue: CellValue;
  readonly linewidthValue: CellValue;
  readonly alphaValue: CellValue;
  readonly shapeValue: CellValue;
  readonly linetypeValue: CellValue;
  readonly xToken: CanonicalAxisToken | null;
  readonly yToken: CanonicalAxisToken | null;
  readonly seriesId: number;
  readonly seriesRank: number;
  readonly sourceOrder: number;
  readonly lineage: LineageRef;
  readonly autoMode: ResolvedCandidateInspectMode;
}
export interface CandidateMatch extends CandidateFacts {
  readonly distance: number;
  readonly mode: ResolvedCandidateInspectMode;
}
export interface CandidateRange {
  readonly axis: "x" | "y";
  readonly panelIndex: number;
  readonly start: number;
  readonly end: number;
  readonly permutation: Uint32Array;
}
export interface CandidateGroup {
  readonly axis: "x" | "y";
  readonly axisValue: CellValue;
  readonly token: CanonicalAxisToken;
  readonly focusId: number;
  readonly memberIds: Uint32Array;
  readonly range: CandidateRange;
}
export interface CandidateStore {
  readonly epoch: number;
  readonly size: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  candidate(id: number): CandidateFacts | null;
  /**
   * Topmost painted candidate at a plot-pixel position, or null.
   * Enforces panel clip (skips panels with clip !== false when the point is
   * outside the panel rectangle). Soft hover targeting should use
   * `SemanticViewportPanel.nearest` instead (#787).
   */
  hitTest(x: number, y: number): CandidateFacts | null;
  /**
   * Soft nearest-candidate targeting. Does **not** enforce panel clip; pass
   * `panelId` (or use `SemanticViewportPanel.nearest`) so faceted probes cannot
   * seed another panel. `hitTest` is the clip-gated hard-hit counterpart.
   */
  nearest(
    x: number,
    y: number,
    options: { mode: CandidateInspectMode; maxDistance: number; panelId?: string },
  ): CandidateMatch | null;
  group(seedId: number, axis: "x" | "y"): CandidateGroup | null;
  /** Navigate traversal order; sequential directions apply step in O(1). */
  traverse(startId: number | null, direction?: TraversalDirection, step?: number): number | null;
  cycle(seedId: number, step?: number): number | null;
  queryRect(x0: number, y0: number, x1: number, y1: number, panelId?: string): Uint32Array;
  /** Release epoch-local resolvers, scene references, and compact arrays. */
  dispose(): void;
}
