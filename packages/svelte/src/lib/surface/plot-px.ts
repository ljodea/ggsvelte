import type { CandidateFacts, GeometryBatch } from "@ggsvelte/core";

/** Lightweight interaction projection of a model-owned candidate. */
export type SceneHit = {
  readonly layerIndex: number;
  readonly panelIndex: number;
  readonly rowIndex: number | null;
  readonly x: number;
  readonly y: number;
  readonly kind: GeometryBatch["kind"];
};

export type ClientRectSize = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type SceneSize = {
  readonly width: number;
  readonly height: number;
};

/** Map a client pointer position into plot/scene coordinates. Zero-size
 * targets return the origin; out-of-bounds clients are intentionally not
 * clamped (callers may drag past the capture edge). */
export function plotPointFromClient(
  clientX: number,
  clientY: number,
  rect: ClientRectSize,
  scene: SceneSize,
): { x: number; y: number } {
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * scene.width,
    y: ((clientY - rect.top) / rect.height) * scene.height,
  };
}

/** Project a candidate into the SceneHit shape used by overlays. */
export function hitFromCandidate(candidate: CandidateFacts): SceneHit {
  return {
    layerIndex: candidate.layerIndex,
    panelIndex: candidate.panelIndex,
    rowIndex: candidate.rowIndex,
    x: candidate.x,
    y: candidate.y,
    kind: candidate.kind,
  };
}
