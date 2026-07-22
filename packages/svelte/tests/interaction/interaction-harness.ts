/**
 * Shared fixtures for component-level interaction integration suites.
 * Per-suite helpers (drag, pointerMoveAt) stay local to their files.
 */
import type { RenderModel } from "@ggsvelte/core";

export const rows = [
  { x: 1, y: 10, cls: "a" },
  { x: 2, y: 20, cls: "b" },
  { x: 3, y: 15, cls: "a" },
  { x: 4, y: 25, cls: "b" },
];

export const size = { width: 480, height: 320 };

export function requireModel(model: RenderModel | null): RenderModel {
  if (model === null) throw new Error("expected render model");
  return model;
}
