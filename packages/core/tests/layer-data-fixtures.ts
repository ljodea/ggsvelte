/**
 * Shared fixtures and helpers for pipeline-layer-data tests.
 * Data and pure functions only — never imports bun:test.
 */
import type { RenderModel } from "../src/pipeline/types.ts";

export const size = { width: 640, height: 400 };

export const obs = [
  { x: 1, y: 10, g: "a" },
  { x: 2, y: 20, g: "a" },
  { x: 3, y: 15, g: "b" },
  { x: 4, y: 25, g: "b" },
];

export const bands = [
  { xmin: 0.5, xmax: 2.5, ymin: 0, ymax: 30, label: "early" },
  { xmin: 2.5, xmax: 4.5, ymin: 0, ymax: 30, label: "late" },
];

export const annotations = [{ x: 2, y: 28, label: "peak" }];

export function markCount(model: RenderModel, kind: string): number {
  return model.scene.batches
    .filter((b) => b.kind === kind)
    .reduce((n, b) => n + b.rowIndex.length, 0);
}
