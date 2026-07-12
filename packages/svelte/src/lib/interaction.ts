/**
 * Shared interaction types for the Svelte adapter (tooltip, brush, zoom).
 * Kept in a plain module so both components and consumers can import them.
 */
import type { CellValue } from "@ggsvelte/core";
import type { SceneHit } from "@ggsvelte/core/dom";

/** What a tooltip snippet receives for the hovered mark. */
export interface TooltipContext {
  hit: SceneHit;
  /** The source data row (null for synthesized marks). */
  row: Record<string, CellValue> | null;
  /** The hit layer's mapped channels with resolved values. */
  fields: { channel: string; field: string; value: CellValue }[];
}

/** A finished brush selection (plot-px rect + resolved rows). */
export interface BrushSelection {
  /** Selection rectangle in plot px (normalized: x0 <= x1, y0 <= y1). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Unique source-row indices inside the rect (via the hit index). */
  rows: number[];
  /** The per-mark hits behind `rows`. */
  hits: SceneHit[];
}

/** Explicit continuous domains applied by brush-to-zoom (a respec). */
export interface ZoomDomains {
  x?: [number, number];
  y?: [number, number];
}
