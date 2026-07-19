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
export interface CandidateStoreOptions {
  readonly epoch?: number;
  /** coord_flip maps semantic x to screen y and semantic y to screen x. */
  readonly flip?: boolean;
  /** Pointer hit slop around points and strokes in plot pixels (default 3). */
  readonly hitTolerance?: number;
  readonly datum?: (facts: CandidateBuildFacts) => CandidateDatum | undefined;
}
export interface CandidateFacts extends CandidateBuildFacts {
  readonly id: number;
  readonly epoch: number;
  readonly panelId: string;
  readonly x: number;
  readonly y: number;
  readonly xValue: CellValue;
  readonly yValue: CellValue;
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
  /** Topmost painted candidate at a plot-pixel position, or null. */
  hitTest(x: number, y: number): CandidateFacts | null;
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
