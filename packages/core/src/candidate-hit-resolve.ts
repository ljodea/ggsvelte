/**
 * Named topmost-hit policy: reverse paint order, path stable-edge contract,
 * and within-batch tie-breaks. Testable without the full CandidateStore shell.
 */
import {
  pathRange,
  pathSemanticNeighborRange,
  pathSubpathIndex,
  pointHitDistance,
} from "./candidate-geometry.js";
import { closestPathEdge } from "./candidate-path-geometry.js";
import type { CandidateFacts } from "./candidate-store-types.js";
import type { Scene } from "./scene.js";

export type PointBatchIndex = {
  readonly batchIndex: number;
  readonly ids: number[];
  readonly spatial: {
    queryRect(loX: number, loY: number, hiX: number, hiY: number): number[];
  };
};

export type TopmostHitContext = {
  readonly scene: Scene;
  readonly hitTolerance: number;
  readonly batchIds: Uint32Array;
  readonly primitiveIds: Uint32Array;
  readonly panelIds: Uint32Array;
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  readonly pointBatchIndexes: readonly PointBatchIndex[];
  addExtendedIntersecting(loX: number, loY: number, hiX: number, hiY: number, into: number[]): void;
  exactDistance(
    id: number,
    px: number,
    py: number,
    pathContainment: Map<string, boolean>,
  ): number | null;
  fact(id: number): CandidateFacts | null;
};

/** Resolve the topmost candidate under (px, py), or null when nothing hits. */
export function resolveTopmostHit(
  ctx: TopmostHitContext,
  px: number,
  py: number,
): CandidateFacts | null {
  const {
    scene,
    hitTolerance,
    batchIds,
    primitiveIds,
    panelIds,
    xs,
    ys,
    pointBatchIndexes,
    addExtendedIntersecting,
    exactDistance,
    fact,
  } = ctx;

  let best = -1;
  let bestBatch = -1;
  let bestDistance = Infinity;
  let bestPathStart = -1;
  let bestPathEdge = Infinity;
  const pathContainment = new Map<string, boolean>();

  for (let index = pointBatchIndexes.length - 1; index >= 0; index--) {
    const entry = pointBatchIndexes[index]!;
    const batch = scene.batches[entry.batchIndex]!;
    if (batch.kind !== "points") continue;
    const panel = scene.panels[batch.panelIndex];
    if (
      panel === undefined ||
      (panel.clip !== false &&
        (px < panel.x || px > panel.x + panel.width || py < panel.y || py > panel.y + panel.height))
    )
      continue;
    let maxRadius = batch.size;
    if (batch.sizes !== undefined) {
      for (const radius of batch.sizes) maxRadius = Math.max(maxRadius, radius);
    }
    maxRadius *= 1.25;
    const localIds = entry.spatial
      .queryRect(
        px - maxRadius - hitTolerance,
        py - maxRadius - hitTolerance,
        px + maxRadius + hitTolerance,
        py + maxRadius + hitTolerance,
      )
      .toSorted((a, b) => b - a);
    for (const localId of localIds) {
      const candidateId = entry.ids[localId]!;
      const primitive = primitiveIds[candidateId]!;
      const distance = pointHitDistance(
        batch,
        primitive,
        xs[candidateId]! - px,
        ys[candidateId]! - py,
        hitTolerance,
      );
      if (distance === null) continue;
      best = candidateId;
      bestBatch = entry.batchIndex;
      bestDistance = distance;
      break;
    }
    if (best >= 0) break;
  }

  const extended: number[] = [];
  addExtendedIntersecting(px, py, px, py, extended);
  extended.sort((a, b) => b - a);
  for (const id of extended) {
    const batchIndex = batchIds[id]!;
    if (batchIndex < bestBatch) continue;
    const batch = scene.batches[batchIndex]!;
    if (batch.kind === "glyphs") continue;
    const panel = scene.panels[panelIds[id]!]!;
    if (
      panel.clip !== false &&
      (px < panel.x || px > panel.x + panel.width || py < panel.y || py > panel.y + panel.height)
    )
      continue;
    const distance = exactDistance(id, px, py, pathContainment);
    if (distance === null) continue;
    const sameBatch = batchIndex === bestBatch;
    const primitive = primitiveIds[id]!;
    const range = batch.kind === "paths" ? pathRange(batch, primitive) : null;
    const pathStart = range?.[0] ?? -1;
    let pathEdge = Infinity;
    let candidateId = id;
    let anchorDistance = Math.hypot(xs[id]! - px, ys[id]! - py);
    if (batch.kind === "paths" && batch.fills === undefined && range !== null) {
      const localX = px - panel.x;
      const localY = py - panel.y;
      const subpath = pathSubpathIndex(batch.pathOffsets, primitive);
      const slop =
        (subpath === null ? batch.linewidth : (batch.linewidths?.[subpath] ?? batch.linewidth)) /
          2 +
        hitTolerance;
      pathEdge = closestPathEdge(
        batch,
        pathSemanticNeighborRange(batch, primitive),
        localX,
        localY,
        slop,
      );
      if (!Number.isFinite(pathEdge)) continue;
      if (batch.semanticAnchors === undefined) {
        // Preserve the historical stable edge contract: an equidistant
        // ordinary path edge resolves to its first render vertex.
        const firstDistance = Math.hypot(
          batch.positions[pathEdge * 2]! - localX,
          batch.positions[pathEdge * 2 + 1]! - localY,
        );
        const secondDistance = Math.hypot(
          batch.positions[(pathEdge + 1) * 2]! - localX,
          batch.positions[(pathEdge + 1) * 2 + 1]! - localY,
        );
        const chosenPrimitive = firstDistance <= secondDistance ? pathEdge : pathEdge + 1;
        candidateId = id - primitive + chosenPrimitive;
        anchorDistance = Math.min(firstDistance, secondDistance);
      } else {
        // Synthetic render vertices never become candidates. Competing
        // semantic anchors that own this tessellated edge are compared by
        // anchor distance in the normal within-batch tie break below.
        candidateId = id;
        anchorDistance = Math.hypot(xs[id]! - px, ys[id]! - py);
      }
    }
    const nearerTessellatedAnchor =
      batch.kind === "paths" &&
      batch.semanticAnchors !== undefined &&
      pathEdge === bestPathEdge &&
      (anchorDistance < bestDistance ||
        (anchorDistance === bestDistance &&
          primitive < (best < 0 ? Infinity : primitiveIds[best]!)));
    const improvesWithinBatch =
      batch.kind === "paths"
        ? pathStart > bestPathStart ||
          (pathStart === bestPathStart &&
            (batch.fills === undefined
              ? pathEdge < bestPathEdge || nearerTessellatedAnchor
              : anchorDistance < bestDistance ||
                (anchorDistance === bestDistance &&
                  primitive < (best < 0 ? Infinity : primitiveIds[best]!))))
        : primitive > (best < 0 ? -1 : primitiveIds[best]!);
    if (batchIndex > bestBatch || (sameBatch && improvesWithinBatch)) {
      best = candidateId;
      bestBatch = batchIndex;
      bestDistance = batch.kind === "paths" ? anchorDistance : distance;
      bestPathStart = pathStart;
      bestPathEdge = pathEdge;
    }
  }
  return fact(best);
}
