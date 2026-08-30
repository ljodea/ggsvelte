/** Named topmost-hit policy: reverse paint order and within-batch tie-breaks. */
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
  readonly spatial: { queryRect(loX: number, loY: number, hiX: number, hiY: number): number[] };
  readonly maxRadius: number;
};

type HitCandidate = {
  candidateId: number;
  batchIndex: number;
  primitive: number;
  distance: number;
  pathStart: number;
  pathEdge: number;
  anchorDistance: number;
  semanticAnchors: boolean;
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
  readonly filledSpanStart: Int32Array;
  readonly filledSpanEnd: Int32Array;
  readonly isFilledPath: Uint8Array;
  addExtendedIntersecting(loX: number, loY: number, hiX: number, hiY: number, into: number[]): void;
  probePoint(px: number, py: number): HitProbePoint;
  fact(id: number): CandidateFacts | null;
};

function outsidePanel(panel: Scene["panels"][number] | undefined, px: number, py: number): boolean {
  return (
    panel === undefined ||
    (panel.clip !== false &&
      (px < panel.x || px > panel.x + panel.width || py < panel.y || py > panel.y + panel.height))
  );
}

function findPointHit(ctx: TopmostHitContext, px: number, py: number): HitCandidate | null {
  const { scene, hitTolerance, primitiveIds, xs, ys, pointBatchIndexes } = ctx;
  for (let index = pointBatchIndexes.length - 1; index >= 0; index--) {
    const entry = pointBatchIndexes[index]!;
    const batch = scene.batches[entry.batchIndex]!;
    if (batch.kind !== "points" || outsidePanel(scene.panels[batch.panelIndex], px, py)) continue;
    const localIds = entry.spatial
      .queryRect(
        px - entry.maxRadius - hitTolerance,
        py - entry.maxRadius - hitTolerance,
        px + entry.maxRadius + hitTolerance,
        py + entry.maxRadius + hitTolerance,
      )
      .toSorted((a, b) => b - a);
    for (const localId of localIds) {
      const candidateId = entry.ids[localId]!;
      const distance = pointHitDistance(
        batch,
        primitiveIds[candidateId]!,
        xs[candidateId]! - px,
        ys[candidateId]! - py,
        hitTolerance,
      );
      if (distance !== null)
        return {
          candidateId,
          batchIndex: entry.batchIndex,
          distance,
          pathStart: -1,
          primitive: primitiveIds[candidateId]!,
          pathEdge: Infinity,
          anchorDistance: distance,
          semanticAnchors: false,
        };
    }
  }
  return null;
}

function filledPathHit(
  ctx: TopmostHitContext,
  id: number,
  batch: Extract<Scene["batches"][number], { kind: "paths" }>,
  px: number,
  py: number,
  probe: HitProbePoint,
): HitCandidate | null {
  const spanStart = ctx.filledSpanStart[id]!;
  const spanEnd = ctx.filledSpanEnd[id]!;
  if (spanStart < 0 || spanEnd <= spanStart || probe.distance(id) === null) return null;
  let candidateId = spanStart;
  let anchorDistance = Math.hypot(ctx.xs[spanStart]! - px, ctx.ys[spanStart]! - py);
  let primitive = ctx.primitiveIds[spanStart]!;
  for (let cid = spanStart + 1; cid < spanEnd; cid++) {
    const d = Math.hypot(ctx.xs[cid]! - px, ctx.ys[cid]! - py);
    const p = ctx.primitiveIds[cid]!;
    if (d < anchorDistance || (d === anchorDistance && p < primitive)) {
      candidateId = cid;
      anchorDistance = d;
      primitive = p;
    }
  }
  return {
    candidateId,
    batchIndex: ctx.batchIds[id]!,
    primitive,
    distance: anchorDistance,
    pathStart: pathRange(batch, ctx.primitiveIds[id]!)?.[0] ?? -1,
    pathEdge: Infinity,
    anchorDistance,
    semanticAnchors: true,
  };
}

function regularPathHit(
  ctx: TopmostHitContext,
  id: number,
  batch: Scene["batches"][number],
  panel: NonNullable<Scene["panels"][number]>,
  px: number,
  py: number,
  probe: HitProbePoint,
): HitCandidate | null {
  const distance = probe.distance(id);
  if (distance === null) return null;
  const primitive = ctx.primitiveIds[id]!;
  const range = batch.kind === "paths" ? pathRange(batch, primitive) : null;
  const pathStart = range?.[0] ?? -1;
  let pathEdge = Infinity;
  let candidateId = id;
  let anchorDistance = Math.hypot(ctx.xs[id]! - px, ctx.ys[id]! - py);
  if (batch.kind === "paths" && batch.fills === undefined && range !== null) {
    const localX = px - panel.x;
    const localY = py - panel.y;
    const subpath = pathSubpathIndex(batch.pathOffsets, primitive);
    const slop =
      (subpath === null ? batch.linewidth : (batch.linewidths?.[subpath] ?? batch.linewidth)) / 2 +
      ctx.hitTolerance;
    pathEdge = closestPathEdge(
      batch,
      pathSemanticNeighborRange(batch, primitive),
      localX,
      localY,
      slop,
    );
    if (!Number.isFinite(pathEdge)) return null;
    if (batch.semanticAnchors === undefined) {
      const firstDistance = Math.hypot(
        batch.positions[pathEdge * 2]! - localX,
        batch.positions[pathEdge * 2 + 1]! - localY,
      );
      const secondDistance = Math.hypot(
        batch.positions[(pathEdge + 1) * 2]! - localX,
        batch.positions[(pathEdge + 1) * 2 + 1]! - localY,
      );
      candidateId = id - primitive + (firstDistance <= secondDistance ? pathEdge : pathEdge + 1);
      anchorDistance = Math.min(firstDistance, secondDistance);
    }
  }
  return {
    candidateId,
    batchIndex: ctx.batchIds[id]!,
    primitive,
    distance,
    pathStart,
    pathEdge,
    anchorDistance,
    semanticAnchors: batch.kind === "paths" && batch.semanticAnchors !== undefined,
  };
}

function improvesWithinBatch(candidate: HitCandidate, best: HitCandidate | null): boolean {
  if (best === null) return true;
  if (candidate.pathStart !== -1 || best.pathStart !== -1) {
    if (candidate.pathStart !== best.pathStart) return candidate.pathStart > best.pathStart;
    if (candidate.semanticAnchors || best.semanticAnchors) {
      if (candidate.pathEdge !== best.pathEdge) return candidate.pathEdge < best.pathEdge;
      return (
        candidate.anchorDistance < best.anchorDistance ||
        (candidate.anchorDistance === best.anchorDistance && candidate.primitive < best.primitive)
      );
    }
    return candidate.pathEdge < best.pathEdge;
  }
  return candidate.primitive > best.primitive;
}

/** Resolve the topmost candidate under (px, py), or null when nothing hits. */
export function resolveTopmostHit(
  ctx: TopmostHitContext,
  px: number,
  py: number,
): CandidateFacts | null {
  const probe = ctx.probePoint(px, py);
  let best = findPointHit(ctx, px, py);
  const extended: number[] = [];
  ctx.addExtendedIntersecting(px, py, px, py, extended);
  extended.sort((a, b) => b - a);
  for (const id of extended) {
    const batchIndex = ctx.batchIds[id]!;
    if (best !== null && batchIndex < best.batchIndex) continue;
    const batch = ctx.scene.batches[batchIndex]!;
    if (batch.kind === "glyphs") continue;
    const panel = ctx.scene.panels[ctx.panelIds[id]!];
    if (outsidePanel(panel, px, py)) continue;
    const candidate =
      ctx.isFilledPath[id] === 1 && batch.kind === "paths" && batch.fills !== undefined
        ? filledPathHit(ctx, id, batch, px, py, probe)
        : panel === undefined
          ? null
          : regularPathHit(ctx, id, batch, panel, px, py, probe);
    if (candidate === null) continue;
    if (
      best === null ||
      candidate.batchIndex > best.batchIndex ||
      (candidate.batchIndex === best.batchIndex && improvesWithinBatch(candidate, best))
    )
      best = candidate;
  }
  return ctx.fact(best?.candidateId ?? -1);
}
