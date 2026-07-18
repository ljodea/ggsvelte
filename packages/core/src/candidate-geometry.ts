import type { ResolvedCandidateInspectMode } from "./candidate-store-types.js";
import type { GeometryBatch } from "./scene.js";

export function primitiveCount(batch: GeometryBatch): number {
  if (batch.kind === "rects") return batch.rects.length / 4;
  if (batch.kind === "segments") return batch.segments.length / 4;
  return batch.positions.length / 2;
}

export function localAnchor(batch: GeometryBatch, i: number): readonly [number, number] {
  if (batch.kind === "rects")
    return [batch.rects[i * 4]! + batch.rects[i * 4 + 2]! / 2, batch.rects[i * 4 + 1]!];
  if (batch.kind === "segments")
    return [
      (batch.segments[i * 4]! + batch.segments[i * 4 + 2]!) / 2,
      (batch.segments[i * 4 + 1]! + batch.segments[i * 4 + 3]!) / 2,
    ];
  return [batch.positions[i * 2]!, batch.positions[i * 2 + 1]!];
}

export function defaultAutoMode(batch: GeometryBatch, i: number): ResolvedCandidateInspectMode {
  if (batch.kind === "rects") return "exact";
  if (batch.kind === "paths") return "x";
  if (batch.kind === "segments") {
    const dx = Math.abs(batch.segments[i * 4 + 2]! - batch.segments[i * 4]!);
    const dy = Math.abs(batch.segments[i * 4 + 3]! - batch.segments[i * 4 + 1]!);
    return dx <= dy ? "x" : "y";
  }
  return "xy";
}

export function segmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1,
    dy = y2 - y1,
    length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length2));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}

export function segmentIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  loX: number,
  loY: number,
  hiX: number,
  hiY: number,
): boolean {
  let enter = 0;
  let exit = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  for (const [p, q] of [
    [-dx, x1 - loX],
    [dx, hiX - x1],
    [-dy, y1 - loY],
    [dy, hiY - y1],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) enter = Math.max(enter, ratio);
    else exit = Math.min(exit, ratio);
    if (enter > exit) return false;
  }
  return true;
}

export function samePath(batch: GeometryBatch, a: number, b: number): boolean {
  if (batch.kind !== "paths") return false;
  for (let p = 0; p < batch.pathOffsets.length - 1; p++)
    if (a >= batch.pathOffsets[p]! && a < batch.pathOffsets[p + 1]!)
      return b >= batch.pathOffsets[p]! && b < batch.pathOffsets[p + 1]!;
  return false;
}

export function pathRange(batch: Extract<GeometryBatch, { kind: "paths" }>, vertex: number) {
  for (let p = 0; p < batch.pathOffsets.length - 1; p++) {
    const start = batch.pathOffsets[p]!;
    const end = batch.pathOffsets[p + 1]!;
    if (vertex >= start && vertex < end) return [start, end] as const;
  }
  return null;
}

export function insidePath(
  batch: Extract<GeometryBatch, { kind: "paths" }>,
  start: number,
  end: number,
  x: number,
  y: number,
): boolean {
  let inside = false;
  for (let i = start, j = end - 1; i < end; j = i++) {
    const xi = batch.positions[i * 2]!;
    const yi = batch.positions[i * 2 + 1]!;
    const xj = batch.positions[j * 2]!;
    const yj = batch.positions[j * 2 + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
