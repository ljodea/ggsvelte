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
import type { HitProbePoint } from "./candidate-hit-geometry.js";
import { closestPathEdge } from "./candidate-path-geometry.js";
import type { CandidateFacts } from "./candidate-store-types.js";
import type { Scene } from "./scene.js";

type PointBatchIndex = {
  readonly batchIndex: number;
  readonly ids: number[];
  readonly spatial: {
    queryRect(loX: number, loY: number, hiX: number, hiY: number): number[];
  };
  /** Precomputed max(batch.size, …sizes) * 1.25; see spatial-index build. */
  readonly maxRadius: number;
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
  probePoint(px: number, py: number): HitProbePoint;
  fact(id: number): CandidateFacts | null;
};

/** Resolve the topmost candidate under (px, py), or null when nothing hits. */
export function resolveTopmostHit(
  ctx: TopmostHitContext,
  px: number,
  py: number,
): CandidateFacts | null {
  const { scene, hitTolerance, batchIds, primitiveIds, panelIds, xs, ys, pointBatchIndexes } = ctx;
  // Bind via arrows so type-aware unbound-method is satisfied.
  const addExtendedIntersecting = (
    loX: number,
    loY: number,
    hiX: number,
    hiY: number,
    into: number[],
  ): void => {
    ctx.addExtendedIntersecting(loX, loY, hiX, hiY, into);
  };
  const fact = (id: number) => ctx.fact(id);
  const probe = ctx.probePoint(px, py);

  let best = -1;
  let bestBatch = -1;
  let bestDistance = Infinity;
  let bestPathStart = -1;
  let bestPathEdge = Infinity;

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
    const maxRadius = entry.maxRadius;
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
    const distance = probe.distance(id);
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
